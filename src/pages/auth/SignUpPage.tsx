import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getDashboardRoute } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Building2, Users } from 'lucide-react';

type UserRole = 'PAYER' | 'ACO';

export default function SignUpPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRole) {
      setError('Please select a role');
      return;
    }

    setLoading(true);
    setError(null);

    // Validation
    if (!formData.fullName.trim()) {
      setError('Please enter your full name');
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setError('Please enter your email');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Create auth user with role in metadata
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: selectedRole,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('An account with this email already exists. Please log in instead.');
        } else {
          setError('Unable to create your account. Please try again.');
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Failed to create user account. Please try again.');
        setLoading(false);
        return;
      }

      // Profile is created automatically via database trigger
      // Wait a moment for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Navigate to the appropriate dashboard
      const dashboardRoute = getDashboardRoute(selectedRole);
      navigate(dashboardRoute);
      
    } catch (err) {
      console.error('Signup error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (step === 'role') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-3xl text-center">Create Your Account</CardTitle>
            <CardDescription className="text-center text-base">
              Select your role to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => handleRoleSelect('PAYER')}
                className="group relative p-6 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all duration-200 text-left"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Payer / CMS</h3>
                    <p className="text-sm text-muted-foreground">
                      Monitor ACO contracts, track performance, and manage portfolio analytics
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleRoleSelect('ACO')}
                className="group relative p-6 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all duration-200 text-left"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">ACO</h3>
                    <p className="text-sm text-muted-foreground">
                      View your organization's performance, quality metrics, and care opportunities
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-2">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
              selectedRole === 'PAYER' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'
            }`}>
              {selectedRole === 'PAYER' ? (
                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              ) : (
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            {selectedRole === 'PAYER' ? 'Payer / CMS' : 'ACO'} Account
          </CardTitle>
          <CardDescription className="text-center">
            Enter your details to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-1/3"
                onClick={() => {
                  setStep('role');
                  setError(null);
                }}
                disabled={loading}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>

            <div className="text-center text-sm pt-2 border-t">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
