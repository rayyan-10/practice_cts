import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserContext } from '@/lib/auth';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import RiskBadge from '@/components/common/RiskBadge';
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Star,
  LogOut,
  Stethoscope,
  Activity,
} from 'lucide-react';
import { formatLargeCurrency, formatPercentage, formatCurrency } from '@/lib/calculations/financial';
import { useNavigate } from 'react-router-dom';

interface ACODashboardStats {
  acoName: string;
  contractNumber: string;
  performanceScore: number;
  benchmark: number;
  actualExpenditure: number;
  projectedSavings: number;
  qualityScore: number;
  contractRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  beneficiaryCount: number;
  providerCount: number;
  highRiskBeneficiaries: number;
}

export default function ACODashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ACODashboardStats | null>(null);
  const [userContext, setUserContext] = useState<any>(null);

  useEffect(() => {
    async function loadDashboard() {
      const context = await getUserContext();
      setUserContext(context);

      // Mock data for ACO dashboard
      const mockStats: ACODashboardStats = {
        acoName: 'Pioneer Health Network',
        contractNumber: 'ACO-2024-001',
        performanceScore: 88.4,
        benchmark: 124500000, // $124.5M
        actualExpenditure: 114300000, // $114.3M
        projectedSavings: 5100000, // $5.1M
        qualityScore: 91.2,
        contractRisk: 'LOW',
        beneficiaryCount: 12450,
        providerCount: 148,
        highRiskBeneficiaries: 1120,
      };

      setStats(mockStats);
      setLoading(false);
    }

    loadDashboard();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const variance = stats.benchmark - stats.actualExpenditure;
  const variancePercentage = (variance / stats.benchmark) * 100;
  const costPerBeneficiary = stats.actualExpenditure / stats.beneficiaryCount;
  const benchmarkPerBeneficiary = stats.benchmark / stats.beneficiaryCount;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{stats.acoName}</h1>
                <p className="text-sm text-muted-foreground">
                  {stats.contractNumber} • Performance Year 2026
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{userContext?.email}</p>
                <p className="text-xs text-muted-foreground">{userContext?.role}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Demo Badge */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
              <div>
                <p className="font-medium text-yellow-900 dark:text-yellow-100">Demo Environment</p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  This platform uses synthetic data for demonstration purposes
                </p>
              </div>
            </div>
          </div>

          {/* Performance Overview */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="text-2xl">Performance Overview</CardTitle>
              <CardDescription>Current contract performance status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Performance Score</p>
                  <p className="text-3xl font-bold">{formatPercentage(stats.performanceScore)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Quality Score</p>
                  <p className="text-3xl font-bold">{formatPercentage(stats.qualityScore)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Projected Savings</p>
                  <p className="text-3xl font-bold text-green-600">{formatLargeCurrency(stats.projectedSavings)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Contract Risk</p>
                  <div className="mt-2">
                    <RiskBadge level={stats.contractRisk} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Benchmark"
              value={formatLargeCurrency(stats.benchmark)}
              icon={DollarSign}
              subtitle="Annual target expenditure"
            />
            <KPICard
              title="Actual Expenditure"
              value={formatLargeCurrency(stats.actualExpenditure)}
              icon={DollarSign}
              trend="down"
              change={-8.2}
              changeLabel="below benchmark"
            />
            <KPICard
              title="Variance"
              value={formatLargeCurrency(variance)}
              icon={TrendingUp}
              subtitle={`${formatPercentage(variancePercentage)} below target`}
              trend="up"
            />
            <KPICard
              title="Cost Per Beneficiary"
              value={formatCurrency(costPerBeneficiary)}
              icon={Users}
              subtitle={`Target: ${formatCurrency(benchmarkPerBeneficiary)}`}
              trend="down"
            />
          </div>

          {/* Population & Providers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard
              title="Total Beneficiaries"
              value={stats.beneficiaryCount.toLocaleString()}
              icon={Users}
              trend="up"
              change={2.3}
              changeLabel="vs last year"
            />
            <KPICard
              title="Total Providers"
              value={stats.providerCount}
              icon={Stethoscope}
              subtitle="Active network providers"
            />
            <KPICard
              title="High-Risk Beneficiaries"
              value={stats.highRiskBeneficiaries.toLocaleString()}
              icon={Activity}
              subtitle={`${formatPercentage((stats.highRiskBeneficiaries / stats.beneficiaryCount) * 100)} of population`}
            />
          </div>

          {/* Provider Performance Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Provider Performance</CardTitle>
              <CardDescription>
                Top and underperforming providers in your network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Top Performer */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-900/10">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-green-600" />
                      <p className="font-medium">Dr. Sarah Chen - Primary Care</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Provider ID: PRV-001 • 450 patients</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">$8,200</p>
                      <p className="text-xs text-green-600">Cost per patient</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">94.2%</p>
                      <p className="text-xs text-muted-foreground">Quality Score</p>
                    </div>
                  </div>
                </div>

                {/* Average Performer */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">Regional Hospital System</p>
                    <p className="text-sm text-muted-foreground mt-1">Provider ID: PRV-042 • 1,200 patients</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">$9,800</p>
                      <p className="text-xs text-muted-foreground">Cost per patient</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">87.5%</p>
                      <p className="text-xs text-muted-foreground">Quality Score</p>
                    </div>
                  </div>
                </div>

                {/* Underperformer */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-red-50 dark:bg-red-900/10">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <p className="font-medium">Metro Specialty Clinic</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Provider ID: PRV-089 • 320 patients</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">$14,500</p>
                      <p className="text-xs text-red-600">+54.8% above average</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">76.3%</p>
                      <p className="text-xs text-muted-foreground">Quality Score</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Button variant="outline" className="w-full">
                  View All Providers
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Care Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle>Care Opportunities</CardTitle>
              <CardDescription>
                Recommended interventions to improve outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="h-8 w-8 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                    <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">High-Risk Patient Outreach</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      320 patients identified for care management intervention
                    </p>
                    <p className="text-xs text-green-600 mt-1">Potential savings: $840K</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="h-8 w-8 rounded bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                    <Star className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Preventive Care Gap Closure</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      580 beneficiaries overdue for preventive screenings
                    </p>
                    <p className="text-xs text-green-600 mt-1">Quality score impact: +2.1%</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="h-8 w-8 rounded bg-orange-100 dark:bg-orange-900 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Readmission Reduction Program</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Focus on 45 frequent readmission patients
                    </p>
                    <p className="text-xs text-green-600 mt-1">Potential savings: $620K</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  What-If Simulator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Model performance scenarios
                </p>
              </CardContent>
            </Card>

            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Risk Stratification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View high-risk populations
                </p>
              </CardContent>
            </Card>

            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Review active alerts
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
