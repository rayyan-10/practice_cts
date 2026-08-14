import { useEffect, useState } from 'react';
import { getUserContext } from '@/lib/auth';
import type { UserContext } from '@/lib/auth';
import AppShell from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  FileText,
  BarChart3,
  LineChart,
  PieChart,
} from 'lucide-react';

type TimePeriod = 'monthly' | 'weekly' | 'quarterly' | 'yearly';

interface ReportData {
  period: string;
  expenditure: number;
  benchmark: number;
  savings: number;
  qualityScore: number;
  variance: number;
}

const MOCK_MONTHLY_DATA: ReportData[] = [
  { period: 'Jan 2024', expenditure: 12500000, benchmark: 13200000, savings: 700000, qualityScore: 88.5, variance: 5.3 },
  { period: 'Feb 2024', expenditure: 11800000, benchmark: 12900000, savings: 1100000, qualityScore: 89.2, variance: 8.5 },
  { period: 'Mar 2024', expenditure: 13200000, benchmark: 13500000, savings: 300000, qualityScore: 87.8, variance: 2.2 },
  { period: 'Apr 2024', expenditure: 12100000, benchmark: 13100000, savings: 1000000, qualityScore: 90.1, variance: 7.6 },
  { period: 'May 2024', expenditure: 12800000, benchmark: 13400000, savings: 600000, qualityScore: 89.5, variance: 4.5 },
  { period: 'Jun 2024', expenditure: 13500000, benchmark: 13800000, savings: 300000, qualityScore: 88.9, variance: 2.2 },
];

export default function PayerReports() {
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('monthly');
  const [reportData, setReportData] = useState<ReportData[]>(MOCK_MONTHLY_DATA);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getUserContext().then(ctx => setUserContext(ctx));
  }, []);

  const handlePeriodChange = (period: TimePeriod) => {
    setTimePeriod(period);
    setLoading(true);
    // Simulate data loading
    setTimeout(() => {
      setReportData(MOCK_MONTHLY_DATA);
      setLoading(false);
    }, 500);
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    alert(`Exporting report as ${format.toUpperCase()}...`);
  };

  const totalExpenditure = reportData.reduce((sum, d) => sum + d.expenditure, 0);
  const totalBenchmark = reportData.reduce((sum, d) => sum + d.benchmark, 0);
  const totalSavings = reportData.reduce((sum, d) => sum + d.savings, 0);
  const avgQuality = reportData.reduce((sum, d) => sum + d.qualityScore, 0) / reportData.length;
  const overallVariance = ((totalBenchmark - totalExpenditure) / totalBenchmark) * 100;

  return (
    <AppShell userContext={userContext} pageTitle="Reports & Analytics">
      <div className="p-6 space-y-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Reports & Analytics</h1>
              <p className="text-muted-foreground mt-1">
                View performance trends, expenditure analysis, and quality metrics
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => handleExport('pdf')}>
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>

          {/* Time Period Selector */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Time Period
              </CardTitle>
              <CardDescription>Select the reporting period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: 'weekly', label: 'Weekly', icon: BarChart3 },
                  { value: 'monthly', label: 'Monthly', icon: LineChart },
                  { value: 'quarterly', label: 'Quarterly', icon: PieChart },
                  { value: 'yearly', label: 'Yearly', icon: TrendingUp },
                ].map((period) => (
                  <Button
                    key={period.value}
                    variant={timePeriod === period.value ? 'default' : 'outline'}
                    onClick={() => handlePeriodChange(period.value as TimePeriod)}
                    className="h-auto py-4 flex-col"
                  >
                    <period.icon className="h-5 w-5 mb-2" />
                    <span>{period.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Expenditure</p>
                    <p className="text-2xl font-bold mt-1">
                      ${(totalExpenditure / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Benchmark</p>
                    <p className="text-2xl font-bold mt-1">
                      ${(totalBenchmark / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Savings</p>
                    <p className="text-2xl font-bold mt-1 text-green-600">
                      ${(totalSavings / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Quality Score</p>
                    <p className="text-2xl font-bold mt-1">
                      {avgQuality.toFixed(1)}%
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Expenditure vs Benchmark Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown showing {timePeriod} performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading data...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">Period</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Expenditure</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Benchmark</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Savings</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Variance</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Quality Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {reportData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3 text-sm font-medium">{row.period}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            ${(row.expenditure / 1000000).toFixed(2)}M
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            ${(row.benchmark / 1000000).toFixed(2)}M
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                            ${(row.savings / 1000000).toFixed(2)}M
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={row.variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {row.variance >= 0 ? '+' : ''}{row.variance.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">{row.qualityScore.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-800 font-bold">
                      <tr>
                        <td className="px-4 py-3 text-sm">Total / Average</td>
                        <td className="px-4 py-3 text-sm text-right">
                          ${(totalExpenditure / 1000000).toFixed(2)}M
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          ${(totalBenchmark / 1000000).toFixed(2)}M
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-green-600">
                          ${(totalSavings / 1000000).toFixed(2)}M
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={overallVariance >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {overallVariance >= 0 ? '+' : ''}{overallVariance.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">{avgQuality.toFixed(1)}%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Placeholder for Charts */}
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Expenditure Trend</CardTitle>
                <CardDescription>Monthly expenditure vs benchmark</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-center">
                    <LineChart className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-muted-foreground">Chart visualization coming soon</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Integrate with Recharts or Chart.js
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quality Score Progression</CardTitle>
                <CardDescription>Quality score trends over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-muted-foreground">Chart visualization coming soon</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Integrate with Recharts or Chart.js
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
