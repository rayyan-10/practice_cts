import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserContext } from '@/lib/auth';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import RiskBadge from '@/components/common/RiskBadge';
import {
  Building2,
  FileText,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Star,
  LogOut,
} from 'lucide-react';
import { formatLargeCurrency, formatPercentage } from '@/lib/calculations/financial';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalACOs: number;
  activeContracts: number;
  totalBeneficiaries: number;
  totalExpenditure: number;
  benchmarkExpenditure: number;
  projectedSavings: number;
  projectedLosses: number;
  averageQualityScore: number;
  contractsAtRisk: number;
}

export default function PayerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userContext, setUserContext] = useState<any>(null);

  useEffect(() => {
    async function loadDashboard() {
      const context = await getUserContext();
      setUserContext(context);

      // In a real implementation, these would be database queries
      // For now, using realistic synthetic data
      const mockStats: DashboardStats = {
        totalACOs: 24,
        activeContracts: 31,
        totalBeneficiaries: 185420,
        totalExpenditure: 2420000000, // $2.42B
        benchmarkExpenditure: 2550000000, // $2.55B
        projectedSavings: 126400000, // $126.4M
        projectedLosses: 18200000, // $18.2M
        averageQualityScore: 88.7,
        contractsAtRisk: 4,
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

  const netSavings = stats.projectedSavings - stats.projectedLosses;
  const variancePercentage = ((stats.benchmarkExpenditure - stats.totalExpenditure) / stats.benchmarkExpenditure) * 100;

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
                <h1 className="text-xl font-bold">VBC Analytics Platform</h1>
                <p className="text-sm text-muted-foreground">
                  {userContext?.organizationType} Dashboard • Performance Year 2026
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

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total ACOs"
              value={stats.totalACOs}
              icon={Building2}
              subtitle={`${stats.activeContracts} active contracts`}
            />
            <KPICard
              title="Total Beneficiaries"
              value={stats.totalBeneficiaries.toLocaleString()}
              icon={Users}
              trend="up"
              change={3.2}
              changeLabel="vs last year"
            />
            <KPICard
              title="Total Expenditure"
              value={formatLargeCurrency(stats.totalExpenditure)}
              icon={DollarSign}
              subtitle={`Benchmark: ${formatLargeCurrency(stats.benchmarkExpenditure)}`}
              trend="down"
              change={-5.1}
              changeLabel="below benchmark"
            />
            <KPICard
              title="Net Projected Savings"
              value={formatLargeCurrency(netSavings)}
              icon={TrendingUp}
              trend="up"
              subtitle={`${formatPercentage(variancePercentage)} variance`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Projected Savings"
              value={formatLargeCurrency(stats.projectedSavings)}
              trend="up"
              subtitle="From high-performing ACOs"
            />
            <KPICard
              title="Projected Losses"
              value={formatLargeCurrency(stats.projectedLosses)}
              trend="down"
              subtitle="From underperforming ACOs"
            />
            <KPICard
              title="Average Quality Score"
              value={formatPercentage(stats.averageQualityScore)}
              icon={Star}
              trend="up"
              change={2.1}
              changeLabel="vs last quarter"
            />
            <KPICard
              title="Contracts At Risk"
              value={stats.contractsAtRisk}
              icon={AlertTriangle}
              subtitle="Require intervention"
            />
          </div>

          {/* ACO Portfolio Preview */}
          <Card>
            <CardHeader>
              <CardTitle>ACO Portfolio Overview</CardTitle>
              <CardDescription>
                Top performing and at-risk ACO contracts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Sample ACO rows */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">ACO Pioneer Health Network</p>
                    <p className="text-sm text-muted-foreground">ACO-2024-001 • 12,450 beneficiaries</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">$124.5M</p>
                      <p className="text-xs text-green-600">-8.2% below benchmark</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">91.2%</p>
                      <p className="text-xs text-muted-foreground">Quality Score</p>
                    </div>
                    <RiskBadge level="LOW" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">ACO Community Care Alliance</p>
                    <p className="text-sm text-muted-foreground">ACO-2024-007 • 18,230 beneficiaries</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">$186.2M</p>
                      <p className="text-xs text-green-600">-4.1% below benchmark</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">87.5%</p>
                      <p className="text-xs text-muted-foreground">Quality Score</p>
                    </div>
                    <RiskBadge level="LOW" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/10">
                  <div className="flex-1">
                    <p className="font-medium">ACO Regional Medical Group</p>
                    <p className="text-sm text-muted-foreground">ACO-2024-015 • 9,840 beneficiaries</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">$102.8M</p>
                      <p className="text-xs text-red-600">+4.5% above benchmark</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">82.1%</p>
                      <p className="text-xs text-muted-foreground">Quality Score</p>
                    </div>
                    <RiskBadge level="HIGH" />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Button onClick={() => navigate('/payer/acos')} className="w-full">
                  View All ACOs
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Contracts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Manage and review ACO contracts
                </p>
              </CardContent>
            </Card>

            <Card className="hover:bg-accent cursor-pointer transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Financial Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View detailed financial analytics
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
                  Review active alerts and issues
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
