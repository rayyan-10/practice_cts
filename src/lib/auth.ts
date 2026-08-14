import { supabase } from './supabase';
import { UserRole } from '@/types/database';

export interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  /**
   * The ACO UUID assigned to this user via profile_aco_assignments.
   * Only present for ACO-role users. PAYER users will have this as null.
   * Use this to scope all ACO-specific data fetches on the frontend.
   */
  acoId: string | null;
}

/**
 * Get the current user's context including their role and ACO assignment.
 *
 * For PAYER users:  acoId is null  — they access all ACOs via RLS.
 * For ACO users:    acoId is their assigned ACO UUID — RLS enforces this
 *                   server-side; the frontend uses it to scope queries and UI.
 */
export async function getUserContext(): Promise<UserContext | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch profile row (migration 100 schema: user_id = auth UUID)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Failed to fetch user profile:', profileError);
    return null;
  }

  const role = profile.role as UserRole;

  // For ACO users, fetch their assigned ACO from profile_aco_assignments.
  // PAYER users have no assignment row — this query returns null for them,
  // which is the correct and expected result.
  let acoId: string | null = null;

  if (role === 'ACO') {
    const { data: assignment, error: assignmentError } = await supabase
      .from('profile_aco_assignments')
      .select('aco_id')
      .eq('user_id', user.id)
      .maybeSingle(); // returns null (not an error) when no row exists

    if (assignmentError) {
      // Log but do not hard-fail — the user can still authenticate.
      // Pages that require acoId should check for null and show a message.
      console.error('Failed to fetch ACO assignment:', assignmentError);
    } else {
      acoId = assignment?.aco_id ?? null;
    }
  }

  return {
    userId: user.id,
    email: profile.email,
    role,
    fullName: profile.full_name,
    acoId,
  };
}

/**
 * Check if the user is a Payer user.
 */
export function isPayerUser(context: UserContext | null): boolean {
  return context?.role === 'PAYER';
}

/**
 * Check if the user is an ACO user.
 */
export function isACOUser(context: UserContext | null): boolean {
  return context?.role === 'ACO';
}

/**
 * Returns true when an ACO user has a confirmed ACO assignment.
 * Use this to gate pages that require acoId before rendering.
 */
export function hasACOAssignment(context: UserContext | null): boolean {
  return context?.role === 'ACO' && context.acoId !== null;
}

/**
 * Get the dashboard route for a user based on their role.
 */
export function getDashboardRoute(role: UserRole): string {
  return role === 'PAYER' ? '/payer/dashboard' : '/aco/dashboard';
}
