import { useEffect, useState, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getUserContext, isPayerUser, isACOUser, getDashboardRoute } from '@/lib/auth';
import type { UserContext } from '@/lib/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: 'payer' | 'aco';
}

export default function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);

        // Get user context with role
        const context = await getUserContext();
        setUserContext(context);
        setLoading(false);
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but no user context - show error
  if (!userContext) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6">
          <h2 className="text-2xl font-bold mb-4">Profile Not Found</h2>
          <p className="text-muted-foreground mb-6">
            Unable to load your profile. Please contact support.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Check role requirements
  if (requireRole === 'payer' && !isPayerUser(userContext)) {
    // ACO user trying to access Payer route - redirect to ACO dashboard
    return <Navigate to="/aco/dashboard" replace />;
  }

  if (requireRole === 'aco' && !isACOUser(userContext)) {
    // Payer user trying to access ACO route - redirect to Payer dashboard
    return <Navigate to="/payer/dashboard" replace />;
  }

  // All checks passed - render the protected content
  return <>{children}</>;
}
