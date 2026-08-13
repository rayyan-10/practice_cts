import { supabase } from './supabase';
import { UserRole } from '@/types/database';

export interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
}

/**
 * Get the current user's context including their role
 */
export async function getUserContext(): Promise<UserContext | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  // Get user's profile with role
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !profile) {
    console.error('Failed to fetch user profile:', error);
    return null;
  }

  return {
    userId: user.id,
    email: profile.email,
    role: profile.role as UserRole,
    fullName: profile.full_name,
  };
}

/**
 * Check if the user is a Payer user
 */
export function isPayerUser(context: UserContext | null): boolean {
  return context?.role === 'PAYER';
}

/**
 * Check if the user is an ACO user
 */
export function isACOUser(context: UserContext | null): boolean {
  return context?.role === 'ACO';
}

/**
 * Get the dashboard route for a user based on their role
 */
export function getDashboardRoute(role: UserRole): string {
  return role === 'PAYER' ? '/payer/dashboard' : '/aco/dashboard';
}
