import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { getUserContext, getDashboardRoute } from './lib/auth';
import { User } from '@supabase/supabase-js';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';

// Payer pages
import PayerDashboard from './pages/payer/PayerDashboard';
import PayerACOList from './pages/payer/PayerACOList';
import PayerAnalysis from './pages/payer/PayerAnalysis';

// ACO pages
import ACODashboard from './pages/aco/ACODashboard';

// Protected route wrapper
import ProtectedRoute from './components/layout/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/signup" element={!user ? <SignUpPage /> : <Navigate to="/" />} />

          {/* Root redirect to dashboard */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />

          {/* Payer routes */}
          <Route
            path="/payer/*"
            element={
              <ProtectedRoute requireRole="payer">
                <Routes>
                  <Route path="dashboard" element={<PayerDashboard />} />
                  <Route path="acos" element={<PayerACOList />} />
                  <Route path="analysis" element={<PayerAnalysis />} />
                  <Route path="*" element={<Navigate to="/payer/dashboard" />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* ACO routes */}
          <Route
            path="/aco/*"
            element={
              <ProtectedRoute requireRole="aco">
                <Routes>
                  <Route path="dashboard" element={<ACODashboard />} />
                  <Route path="*" element={<Navigate to="/aco/dashboard" />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// Router component to direct users to appropriate dashboard based on role
function DashboardRouter() {
  const [loading, setLoading] = useState(true);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserRole() {
      try {
        const userContext = await getUserContext();
        
        if (!userContext) {
          setLoading(false);
          return;
        }

        // Get dashboard route based on role
        const dashboardRoute = getDashboardRoute(userContext.role);
        setRedirectPath(dashboardRoute);
        setLoading(false);
      } catch (error) {
        console.error('Error loading user role:', error);
        setLoading(false);
      }
    }

    loadUserRole();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!redirectPath) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6">
          <h2 className="text-2xl font-bold mb-4">Unable to Load Dashboard</h2>
          <p className="text-muted-foreground">Please contact support.</p>
        </div>
      </div>
    );
  }

  return <Navigate to={redirectPath} replace />;
}

export default App;
