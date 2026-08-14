/**
 * PayerDashboard — CMS/Payer Admin view
 * - Uses AppShell (dark sidebar + header)
 * - Fetches live data from Supabase (acos, contracts, contract_performance)
 * - Falls back to demo values if data is unavailable
 * - Provides quick navigation to Predict workflow
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getUserContext } from '@/lib/auth';
import type { UserContext } from '@/lib/auth';
import AppShell from '@/components/layout/AppShell';
import KPICard from '@/components/common/KPICard';
import RiskBadge from '@/components/common/RiskBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building2, Users, DollarSign, TrendingUp,
  AlertTriangle, Star, Brain, FileText,
} from 'lucide-react';
import {
  formatLargeCurrency,
  formatPercentage,
} from '@/lib/calculations/financial';

// ─── Shape of aggregated dashboard stats ────────────────────────────────────
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

// ─── Shape of per-ACO portfolio row ──────────────────────────────────────────
interface PortfolioRow {
  acoId: string;
  acoName: string;
  identifier: string;
  beneficiaries: number;
  benchmark: number;
  actual: number;
  variancePct: number;
  qualityScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// ─── Fallback demo stats (shown when DB returns no data yet) ─────────────────
const DEMO_STATS: DashboardStats = {
  totalACOs:            2,
  activeContracts:      2,
  totalBeneficiaries:   30680,
  totalExpenditure:     146450000,
  benchmarkExpenditure: 155700000,
  projectedSavings:     8900000,
  projectedLosses:      0,
  averageQualityScore:  89.4,
  contractsAtRisk:      0,
};

export default function PayerDashboard() {
  const navigate = useNavigate();
  const [userContext, setUserContext]   = useState<UserContext | null>(null);
  const [stats, setStats]               = useState<DashboardStats | null>(null);
  const [portfolio, setPortfolio]       = useState<PortfolioRow[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    async function load() {
      const ctx = await getUserContext();
      setUserContext(ctx);

      // ── Live Supabase queries ──────────────────────────────────────────────

      // 1. Load ACOs
      const { data: acosRaw, error: acoErr } = await supabase
        .from('acos')
        .select('id, name, aco_identifier, status')
        .eq('status', 'ACTIVE');

      const acos = acosRaw as unknown as Array<{
        id: string; name: string; aco_identifier: string; status: string;
      }> | null;

      // 2. Load contracts
      const { data: contractsRaw, error: cErr } = await supabase
        .from('contracts')
        .select('id, aco_id, benchmark_amount, status')
        .eq('status', 'ACTIVE');

      const contracts = contractsRaw as unknown as Array<{
        id: string; aco_id: string; benchmark_amount: number; status: string;
      }> | null;

      // 3. Load latest contract performance rows
      const { data: perfRaw, error: pErr } = await supabase
        .from('contract_performance')
        .select(
          'contract_id, period, beneficiary_count, benchmark, actual_expenditure, ' +
          'potential_savings, potential_losses, quality_score, risk_score, performance_status, variance_percentage'
        )
        .order('period', { ascending: false });

      const perf = perfRaw as unknown as Array<{
        contract_id: string; period: string; beneficiary_count: number;
        benchmark: number; actual_expenditure: number;
        potential_savings: number | null; potential_losses: number | null;
        quality_score: number | null; risk_score: number | null;
        performance_status: string | null; variance_percentage: number | null;
      }> | null;

      const hasData =
        !acoErr && !cErr && !pErr &&
        acos && acos.length > 0 &&
        contracts && contracts.length > 0;

      if (!hasData) {
        // No DB data yet — use demo values so the UI is always useful
        setStats(DEMO_STATS);
        setPortfolio([]);
        setLoading(false);
        return;
      }

      // ── Aggregate stats ────────────────────────────────────────────────────
      // De-duplicate performance rows: keep most recent period per contract
      type PerfRow = NonNullable<typeof perf>[number];
      const latestPerfByContract = new Map<string, PerfRow>();
      for (const row of perf ?? []) {
        if (!latestPerfByContract.has(row.contract_id)) {
          latestPerfByContract.set(row.contract_id, row);
        }
      }
      const latestPerf = Array.from(latestPerfByContract.values());

      const totalBeneficiaries = latestPerf.reduce(
        (s, r) => s + (r.beneficiary_count ?? 0), 0
      );
      const totalExpenditure = latestPerf.reduce(
        (s, r) => s + (r.actual_expenditure ?? 0), 0
      );
      const benchmarkExpenditure = latestPerf.reduce(
        (s, r) => s + (r.benchmark ?? 0), 0
      );
      const projectedSavings = latestPerf.reduce(
        (s, r) => s + Math.max(0, r.potential_savings ?? 0), 0
      );
      const projectedLosses = latestPerf.reduce(
        (s, r) => s + Math.max(0, r.potential_losses ?? 0), 0
      );
      const qualityScores = latestPerf
        .map(r => r.quality_score)
        .filter((v): v is number => v != null);
      const averageQualityScore =
        qualityScores.length > 0
          ? qualityScores.reduce((s, v) => s + v, 0) / qualityScores.length
          : 0;
      const contractsAtRisk = latestPerf.filter(
        r => r.performance_status === 'POOR' || r.performance_status === 'CRITICAL'
      ).length;

      setStats({
        totalACOs:          acos.length,
        activeContracts:    contracts.length,
        totalBeneficiaries,
        totalExpenditure,
        benchmarkExpenditure,
        projectedSavings,
        projectedLosses,
        averageQualityScore,
        contractsAtRisk,
      });

      // ── Portfolio rows (one per ACO) ───────────────────────────────────────
      // Map: contract_id → aco_id
      const contractToAco = new Map<string, string>();
      for (const c of contracts) contractToAco.set(c.id, c.aco_id);

      const acoMap = new Map(acos.map(a => [a.id, a]));

      const rows: PortfolioRow[] = [];
      for (const [contractId, perfRow] of latestPerfByContract) {
        const acoId = contractToAco.get(contractId);
        if (!acoId) continue;
        const aco = acoMap.get(acoId);
        if (!aco) continue;

        const variancePct = perfRow.variance_percentage ?? 0;
        const riskLevel: PortfolioRow['riskLevel'] =
          variancePct > 2 ? 'CRITICAL'
          : variancePct > 0 ? 'HIGH'
          : variancePct > -3 ? 'MEDIUM'
          : 'LOW';

        rows.push({
          acoId,
          acoName:    aco.name,
          identifier: aco.aco_identifier,
          beneficiaries: perfRow.beneficiary_count ?? 0,
          benchmark:  perfRow.benchmark ?? 0,
          actual:     perfRow.actual_expenditure ?? 0,
          variancePct,
          qualityScore: perfRow.quality_score ?? 0,
          riskLevel,
        });
      }

      setPortfolio(rows);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const s = stats ?? DEMO_STATS;
  const netSavings = s.projectedSavings - s.projectedLosses;
  const variancePct =
    s.benchmarkExpenditure > 0
      ? ((s.benchmarkExpenditure - s.totalExpenditure) / s.benchmarkExpenditure) * 100
      : 0;

  return (
    <AppShell
      userContext={userContext}
      pageTitle="VBC Contract Performance Analytics"
      performanceYear={new Date().getFullYear()}
    >
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Demo banner (shown when no live data) */}
        {portfolio.length === 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-900 dark:text-yellow-100 text-sm">Demo Environment</p>
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                Showing synthetic data. Apply migration 005 and assign ACO users to see live data.
              </p>
            </div>
          </div>
        )}

        {/* ── KPI Row 1 ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total ACOs"
            value={s.totalACOs}
            icon={Building2}
            subtitle={`${s.activeContracts} active contracts`}
          />
          <KPICard
            title="Total Beneficiaries"
            value={s.totalBeneficiaries.toLocaleString()}
            icon={Users}
            trend="up"
            change={3.2}
            changeLabel="vs last year"
          />
          <KPICard
            title="Total Expenditure"
            value={formatLargeCurrency(s.totalExpenditure)}
            icon={DollarSign}
            subtitle={`Benchmark: ${formatLargeCurrency(s.benchmarkExpenditure)}`}
            trend={variancePct >= 0 ? 'down' : 'up'}
            change={parseFloat(Math.abs(variancePct).toFixed(1))}
            changeLabel={variancePct >= 0 ? 'below benchmark' : 'above benchmark'}
          />
          <KPICard
            title="Net Projected Savings"
            value={formatLargeCurrency(netSavings)}
            icon={TrendingUp}
            trend={netSavings >= 0 ? 'up' : 'down'}
            subtitle={`${formatPercentage(Math.abs(variancePct))} variance`}
          />
        </div>

        {/* ── KPI Row 2 ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Projected Savings"
            value={formatLargeCurrency(s.projectedSavings)}
            trend="up"
            subtitle="From high-performing ACOs"
          />
          <KPICard
            title="Projected Losses"
            value={formatLargeCurrency(s.projectedLosses)}
            trend={s.projectedLosses > 0 ? 'down' : 'neutral'}
            subtitle="From underperforming ACOs"
          />
          <KPICard
            title="Average Quality Score"
            value={formatPercentage(s.averageQualityScore)}
            icon={Star}
            trend="up"
            change={2.1}
            changeLabel="vs last quarter"
          />
          <KPICard
            title="Contracts At Risk"
            value={s.contractsAtRisk}
            icon={AlertTriangle}
            subtitle="Require intervention"
          />
        </div>

        {/* ── ACO Portfolio ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>ACO Portfolio Overview</CardTitle>
              <CardDescription>Top performing and at-risk ACO contracts</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/predict')}
              className="gap-1.5 bg-blue-700 hover:bg-blue-800 text-white"
            >
              <Brain className="h-4 w-4" />
              Predict Performance
            </Button>
          </CardHeader>
          <CardContent>
            {portfolio.length > 0 ? (
              <div className="space-y-3">
                {portfolio.map(row => (
                  <div
                    key={row.acoId}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:shadow-sm transition-shadow ${
                      row.riskLevel === 'HIGH' || row.riskLevel === 'CRITICAL'
                        ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
                        : ''
                    }`}
                    onClick={() => navigate('/payer/acos')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{row.acoName}</p>
                      <p className="text-sm text-muted-foreground">
                        {row.identifier} • {row.beneficiaries.toLocaleString()} beneficiaries
                      </p>
                    </div>
                    <div className="flex items-center gap-6 ml-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium">{formatLargeCurrency(row.actual)}</p>
                        <p className={`text-xs ${row.variancePct <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {row.variancePct > 0 ? '+' : ''}{row.variancePct.toFixed(1)}% variance
                        </p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium">{formatPercentage(row.qualityScore)}</p>
                        <p className="text-xs text-muted-foreground">Quality</p>
                      </div>
                      <RiskBadge level={row.riskLevel} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Demo rows when DB has no data */
              <div className="space-y-3">
                {[
                  { name: 'Pioneer Health Network',  id: 'ACO-2024-001', bene: 12450,  actual: 114300000, bench: 124500000, q: 91.2, risk: 'LOW'      },
                  { name: 'Community Care Alliance',  id: 'ACO-2024-007', bene: 18230,  actual: 178600000, bench: 186200000, q: 87.5, risk: 'LOW'      },
                  { name: 'Regional Medical Group',   id: 'ACO-2024-015', bene: 9840,   actual: 102800000, bench: 98400000,  q: 82.1, risk: 'HIGH'     },
                ].map(row => {
                  const vPct = ((row.bench - row.actual) / row.bench) * 100;
                  return (
                    <div
                      key={row.id}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        row.risk === 'HIGH' ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{row.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {row.id} • {row.bene.toLocaleString()} beneficiaries
                        </p>
                      </div>
                      <div className="flex items-center gap-6 ml-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-medium">{formatLargeCurrency(row.actual)}</p>
                          <p className={`text-xs ${vPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {vPct >= 0 ? '-' : '+'}{Math.abs(vPct).toFixed(1)}% vs benchmark
                          </p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-medium">{formatPercentage(row.q)}</p>
                          <p className="text-xs text-muted-foreground">Quality</p>
                        </div>
                        <RiskBadge level={row.risk as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4">
              <Button onClick={() => navigate('/payer/acos')} className="w-full" variant="outline">
                View All ACOs
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card
            className="hover:bg-accent cursor-pointer transition-colors"
            onClick={() => navigate('/predict')}
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                Predict Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Run ACO performance prediction and risk assessment
              </p>
            </CardContent>
          </Card>

          <Card
            className="hover:bg-accent cursor-pointer transition-colors"
            onClick={() => navigate('/payer/acos')}
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-green-600" />
                ACO List
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Browse and monitor all ACO contracts
              </p>
            </CardContent>
          </Card>

          <Card
            className="hover:bg-accent cursor-pointer transition-colors"
            onClick={() => navigate('/payer/analysis')}
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                AI-powered predictive insights and reports
              </p>
            </CardContent>
          </Card>
        </div>

      </div>
    </AppShell>
  );
}
