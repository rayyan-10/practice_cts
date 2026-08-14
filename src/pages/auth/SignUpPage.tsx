import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getDashboardRoute } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Building2, Users, Brain, CheckCircle2, ArrowLeft } from 'lucide-react';

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

      await new Promise(resolve => setTimeout(resolve, 500));

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
      <div className="min-h-screen flex">
        {/* Left Side - Role Selection */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white dark:bg-gray-900">
          <div className="w-full max-w-2xl space-y-8">
            {/* Logo */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg mb-4">
                <Brain className="h-9 w-9 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                ContractIQ
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                AI-Powered Healthcare Analytics
              </p>
            </div>

            {/* Welcome Message */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create Your Account
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Choose your role to get started with ContractIQ
              </p>
            </div>

            {/* Role Selection Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              <button
                onClick={() => handleRoleSelect('PAYER')}
                className="group relative p-8 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-300 text-left bg-white dark:bg-gray-800"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <Building2 className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">CMS / Payer</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Monitor ACO contracts, track performance metrics, and manage portfolio analytics
                    </p>
                  </div>
                  <div className="pt-2 text-xs text-blue-600 font-medium">
                    Full platform access →
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleRoleSelect('ACO')}
                className="group relative p-8 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-green-500 hover:shadow-lg transition-all duration-300 text-left bg-white dark:bg-gray-800"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <Users className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">ACO User</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      View organization performance, quality metrics, and care improvement opportunities
                    </p>
                  </div>
                  <div className="pt-2 text-xs text-green-600 font-medium">
                    ACO dashboard access →
                  </div>
                </div>
              </button>
            </div>

            {/* Sign in link */}
            <div className="text-center text-sm pt-4">
              <span className="text-gray-600 dark:text-gray-400">Already have an account? </span>
              <Link to="/login" className="text-blue-600 hover:underline font-semibold">
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Right Side - Features */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-12 items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '40px 40px'
            }} />
          </div>

          <div className="relative z-10 text-white space-y-8 max-w-lg">
            <div>
              <h2 className="text-3xl font-bold mb-4">
                Join Healthcare Leaders
              </h2>
              <p className="text-blue-100 text-lg">
                Thousands of healthcare organizations trust ContractIQ to optimize performance and improve outcomes.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: CheckCircle2, text: 'Real-time performance analytics' },
                { icon: CheckCircle2, text: 'AI-powered risk predictions' },
                { icon: CheckCircle2, text: 'Benchmarking with peer ACOs' },
                { icon: CheckCircle2, text: 'HIPAA-compliant & secure' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <item.icon className="h-6 w-6 text-green-400" />
                  <span className="text-lg">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white dark:bg-gray-900">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg mb-4">
              <Brain className="h-9 w-9 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              ContractIQ
            </h1>
          </div>

          {/* Form Header */}
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 ${
              selectedRole === 'PAYER'
                ? 'bg-blue-100 dark:bg-blue-900/30'
                : 'bg-green-100 dark:bg-green-900/30'
            }`}>
              {selectedRole === 'PAYER' ? (
                <Building2 className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              ) : (
                <Users className="h-7 w-7 text-green-600 dark:text-green-400" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {selectedRole === 'PAYER' ? 'CMS / Payer' : 'ACO'} Account
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Enter your details to create your account
            </p>
          </div>

          {/* Form */}
          <Card className="border-0 shadow-xl">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    disabled={loading}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={loading}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={loading}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    disabled={loading}
                    className="h-11"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-32"
                    onClick={() => {
                      setStep('role');
                      setError(null);
                    }}
                    disabled={loading}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-11 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating Account...
                      </span>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </div>

                <div className="text-center text-sm pt-4 border-t">
                  <span className="text-gray-600 dark:text-gray-400">Already have an account? </span>
                  <Link to="/login" className="text-blue-600 hover:underline font-semibold">
                    Sign In
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>

      {/* Right Side - Same as login page */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-12 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative z-10 text-white space-y-8 max-w-lg">
          <div>
            <h2 className="text-3xl font-bold mb-4">
              Start Your Free Trial
            </h2>
            <p className="text-blue-100 text-lg">
              Get instant access to powerful analytics and AI-driven insights to transform your healthcare performance.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: CheckCircle2, text: 'No credit card required' },
              { icon: CheckCircle2, text: 'Full feature access' },
              { icon: CheckCircle2, text: 'Cancel anytime' },
              { icon: CheckCircle2, text: '24/7 customer support' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <item.icon className="h-6 w-6 text-green-400" />
                <span className="text-lg">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
