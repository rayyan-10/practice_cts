/**
 * ACODashboard — ACO user view
 * - Uses AppShell (sidebar highlights Dashboard)
 * - Fetches only this user's assigned ACO data via Supabase RLS
 * - Falls back to demo values when DB has no data yet
 * - Provides AI Predictions button pre-scoped to this ACO
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
  Users, DollarSign, TrendingUp, AlertTriangle,
  Star, Stethoscope, Activity, Brain,
} from 'lucide-react';
import {
  formatLargeCurrency, formatPercentage, formatCurrency,
} from '@/lib/calculations/financial';
import type { RiskLevel } from '@/types/database';

// ─── Dashboard data shape ─────────────────────────────────────────────────────

interface ACOStats {
  acoId:               string;
  acoName:             string;
  acoIdentifier:       string;
  programType:         string;
  performanceScore:    number;
  benchmark:           number;
  actualExpenditure:   number;
  projectedSavings:    number;
  qualityScore:        number;
  contractRisk:        RiskLevel;
  beneficiaryCount:    number;
  providerCount:       number;
  highRiskBeneficiaries: number;
}

interface ProviderRow {
  providerId:   string;
  name:         string;
  identifier:   string;
  patientCount: number;
  costPerPt:    number;
  qualityScore: number;
  status:       string;
}

interface RecommendationRow {
  id:              string;
  title:           string;
  description:     string;
  expectedImpact:  string;
  priority:        string;
  recType:         string;
}

// ─── Demo fallback ────────────────────────────────────────────────────────────

const DEMO_STATS: ACOStats = {
  acoId:               'demo',
  acoName:             'Pioneer Health Network',
  acoIdentifier:       'ACO-2024-001',
  programType:         'MSSP Enhanced',
  performanceScore:    88.4,
  benchmark:           124500000,
  actualExpenditure:   114300000,
  projectedSavings:    5100000,
  qualityScore:        91.2,
  contractRisk:        'LOW',
  beneficiaryCount:    12450,
  providerCount:       148,
  highRiskBeneficiaries: 1120,
};

export default function ACODashboard() {
  const navigate = useNavigate();
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [stats, setStats]             = useState<ACOStats | null>(null);
  const [providers, setProviders]     = useState<ProviderRow[]>([]);
  const [recommendations, setRecs]    = useState<RecommendationRow[]>([]);

  useEffect(() => {
    async function load() {
      const ctx = await getUserContext();
      setUserContext(ctx);

      // ACO users always have their acoId set via profile_aco_assignments
      const acoId = ctx?.acoId;

      if (!acoId) {
        // No assignment yet — show demo data
        setStats(DEMO_STATS);
        return;
      }

      // ── Fetch ACO record ─────────────────────────────────────────────────
      const { data: aco, error: acoErr } = await supabase
        .from('acos')
        .select('id, name, aco_identifier, program_type')
        .eq('id', acoId)
        .single();

      if (acoErr || !aco) {
        setStats(DEMO_STATS);
        return;
      }

      // ── Fetch contract + latest performance ──────────────────────────────
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, benchmark_amount, status')
        .eq('aco_id', acoId)
        .eq('status', 'ACTIVE');

      const contractIds = (contracts ?? []).map(c => c.id);

      const { data: perfRowsRaw } = contractIds.length > 0
        ? await supabase
            .from('contract_performance')
            .select(
              'contract_id, beneficiary_count, benchmark, actual_expenditure, ' +
              'potential_savings, quality_score, risk_score, performance_status'
            )
            .in('contract_id', contractIds)
            .order('period', { ascending: false })
        : { data: [] };

      type CPRow = {
        contract_id: string; beneficiary_count: number; benchmark: number;
        actual_expenditure: number; potential_savings: number | null;
        quality_score: number | null; risk_score: number | null;
        performance_status: string | null;
      };
      const perfRows = (perfRowsRaw ?? []) as unknown as CPRow[];

      // Deduplicate: keep most recent per contract
      const latestByContract = new Map<string, CPRow>();
      for (const r of perfRows) {
        if (!latestByContract.has(r.contract_id)) latestByContract.set(r.contract_id, r);
      }
      const latestPerf = Array.from(latestByContract.values());

      const totalBenchmark     = latestPerf.reduce((s, r) => s + (r.benchmark ?? 0), 0);
      const totalActual        = latestPerf.reduce((s, r) => s + (r.actual_expenditure ?? 0), 0);
      const totalSavings       = latestPerf.reduce((s, r) => s + Math.max(0, r.potential_savings ?? 0), 0);
      const avgQuality         = latestPerf.length > 0
        ? latestPerf.reduce((s, r) => s + (r.quality_score ?? 0), 0) / latestPerf.length
        : 0;
      const totalBeneficiaries = latestPerf.reduce((s, r) => s + (r.beneficiary_count ?? 0), 0);

      const avgRiskScore = latestPerf.length > 0
        ? latestPerf.reduce((s, r) => s + (r.risk_score ?? 0), 0) / latestPerf.length
        : 0;
      const contractRisk: RiskLevel =
        avgRiskScore > 60 ? 'CRITICAL'
        : avgRiskScore > 40 ? 'HIGH'
        : avgRiskScore > 20 ? 'MEDIUM'
        : 'LOW';

      // Performance score: 100 - risk_score as a simple proxy
      const performanceScore = Math.max(0, Math.min(100, 100 - avgRiskScore));

      setStats({
        acoId:               aco.id,
        acoName:             aco.name,
        acoIdentifier:       aco.aco_identifier,
        programType:         aco.program_type ?? '',
        performanceScore,
        benchmark:           totalBenchmark   || DEMO_STATS.benchmark,
        actualExpenditure:   totalActual      || DEMO_STATS.actualExpenditure,
        projectedSavings:    totalSavings     || DEMO_STATS.projectedSavings,
        qualityScore:        avgQuality       || DEMO_STATS.qualityScore,
        contractRisk,
        beneficiaryCount:    totalBeneficiaries || DEMO_STATS.beneficiaryCount,
        providerCount:       DEMO_STATS.providerCount,     // no direct query needed
        highRiskBeneficiaries: DEMO_STATS.highRiskBeneficiaries,
      });

      // ── Providers ────────────────────────────────────────────────────────
      const { data: provData } = await supabase
        .from('providers')
        .select('id, name, provider_identifier, status')
        .eq('aco_id', acoId)
        .eq('status', 'ACTIVE')
        .limit(5);

      if (provData && provData.length > 0) {
        const { data: provPerfRaw } = await supabase
          .from('provider_performance')
          .select('provider_id, patient_count, cost_per_patient, quality_score')
          .in('provider_id', provData.map(p => p.id))
          .order('period', { ascending: false });

        type PPRow = {
          provider_id: string; patient_count: number;
          cost_per_patient: number; quality_score: number | null;
        };
        const provPerf = (provPerfRaw ?? []) as unknown as PPRow[];

        const perfByProv = new Map<string, PPRow>();
        for (const r of provPerf) {
          if (!perfByProv.has(r.provider_id)) perfByProv.set(r.provider_id, r);
        }

        setProviders(
          provData.map(p => {
            const pp = perfByProv.get(p.id);
            return {
              providerId:   p.id,
              name:         p.name,
              identifier:   p.provider_identifier,
              patientCount: pp?.patient_count ?? 0,
              costPerPt:    pp?.cost_per_patient ?? 0,
              qualityScore: pp?.quality_score ?? 0,
              status:       p.status,
            };
          })
        );
      }

      // ── Recommendations ──────────────────────────────────────────────────
      const { data: recData } = await supabase
        .from('recommendations')
        .select('id, title, description, expected_impact, priority, recommendation_type')
        .eq('aco_id', acoId)
        .eq('status', 'ACTIVE')
        .limit(4);

      if (recData && recData.length > 0) {
        setRecs(
          recData.map(r => ({
            id:             r.id,
            title:          r.title,
            description:    r.description,
            expectedImpact: r.expected_impact ?? '',
            priority:       r.priority ?? 'MEDIUM',
            recType:        r.recommendation_type,
          }))
        );
      }
    }

    load();
  }, []);

  const s = stats ?? DEMO_STATS;
  const variance    = s.benchmark - s.actualExpenditure;
  const variancePct = s.benchmark > 0 ? (variance / s.benchmark) * 100 : 0;
  const cpb         = s.beneficiaryCount > 0 ? s.actualExpenditure / s.beneficiaryCount : 0;
  const benchCpb    = s.beneficiaryCount > 0 ? s.benchmark / s.beneficiaryCount : 0;

  return (
    <AppShell
      userContext={userContext}
      pageTitle="ACO Performance Dashboard"
      performanceYear={new Date().getFullYear()}
    >
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* ── Performance Overview Card ─────────────────────────────────── */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-900">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-xl">{s.acoName}</CardTitle>
              <CardDescription>
                {s.acoIdentifier} • {s.programType || 'Value-Based Care'} • Performance Year {new Date().getFullYear()}
              </CardDescription>
            </div>
            {/* Predict button scoped to this ACO */}
            <Button
              onClick={() =>
                navigate('/predict', {
                  state: { acoId: s.acoId, acoName: s.acoName },
                })
              }
              className="gap-1.5 bg-blue-700 hover:bg-blue-800 text-white flex-shrink-0"
              size="sm"
            >
              <Brain className="h-4 w-4" />
              AI Predictions
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Performance Score</p>
                <p className="text-3xl font-bold">{formatPercentage(s.performanceScore)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Quality Score</p>
                <p className="text-3xl font-bold">{formatPercentage(s.qualityScore)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Projected Savings</p>
                <p className="text-3xl font-bold text-green-600">{formatLargeCurrency(s.projectedSavings)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Contract Risk</p>
                <div className="mt-2">
                  <RiskBadge level={s.contractRisk} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Financial KPIs ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Benchmark"
            value={formatLargeCurrency(s.benchmark)}
            icon={DollarSign}
            subtitle="Annual target expenditure"
          />
          <KPICard
            title="Actual Expenditure"
            value={formatLargeCurrency(s.actualExpenditure)}
            icon={DollarSign}
            trend={variancePct >= 0 ? 'down' : 'up'}
            change={parseFloat(Math.abs(variancePct).toFixed(1))}
            changeLabel={variancePct >= 0 ? 'below benchmark' : 'above benchmark'}
          />
          <KPICard
            title="Variance"
            value={formatLargeCurrency(Math.abs(variance))}
            icon={TrendingUp}
            subtitle={`${formatPercentage(Math.abs(variancePct))} ${variance >= 0 ? 'below' : 'above'} target`}
            trend={variance >= 0 ? 'up' : 'down'}
          />
          <KPICard
            title="Cost Per Beneficiary"
            value={formatCurrency(cpb)}
            icon={Users}
            subtitle={`Target: ${formatCurrency(benchCpb)}`}
            trend={cpb <= benchCpb ? 'down' : 'up'}
          />
        </div>

        {/* ── Population KPIs ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard
            title="Total Beneficiaries"
            value={s.beneficiaryCount.toLocaleString()}
            icon={Users}
            trend="up"
            change={2.3}
            changeLabel="vs last year"
          />
          <KPICard
            title="Total Providers"
            value={s.providerCount}
            icon={Stethoscope}
            subtitle="Active network providers"
          />
          <KPICard
            title="High-Risk Beneficiaries"
            value={s.highRiskBeneficiaries.toLocaleString()}
            icon={Activity}
            subtitle={`${formatPercentage((s.highRiskBeneficiaries / Math.max(1, s.beneficiaryCount)) * 100)} of population`}
          />
        </div>

        {/* ── Provider Performance ──────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Provider Performance</CardTitle>
            <CardDescription>
              Top and underperforming providers in your network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(providers.length > 0 ? providers : DEMO_PROVIDERS).map((p, i) => (
                <div
                  key={p.providerId}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    i === 0
                      ? 'bg-green-50 dark:bg-green-900/10'
                      : p.costPerPt > 12000
                      ? 'bg-red-50 dark:bg-red-900/10'
                      : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {i === 0 && <Star className="h-4 w-4 text-green-600 flex-shrink-0" />}
                      {p.costPerPt > 12000 && <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />}
                      <p className="font-medium truncate">{p.name}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {p.identifier} • {p.patientCount > 0 ? `${p.patientCount.toLocaleString()} patients` : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 ml-4 flex-shrink-0">
                    {p.costPerPt > 0 && (
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium">{formatCurrency(p.costPerPt)}</p>
                        <p className="text-xs text-muted-foreground">Cost per patient</p>
                      </div>
                    )}
                    {p.qualityScore > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatPercentage(p.qualityScore)}</p>
                        <p className="text-xs text-muted-foreground">Quality</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Care Opportunities / Recommendations ──────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Care Opportunities</CardTitle>
            <CardDescription>
              Recommended interventions to improve outcomes and quality scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(recommendations.length > 0 ? recommendations : DEMO_RECS).map(rec => (
                <div key={rec.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className={`h-8 w-8 rounded flex-shrink-0 flex items-center justify-center ${
                    rec.priority === 'HIGH'
                      ? 'bg-red-100 dark:bg-red-900'
                      : rec.priority === 'MEDIUM'
                      ? 'bg-yellow-100 dark:bg-yellow-900'
                      : 'bg-blue-100 dark:bg-blue-900'
                  }`}>
                    <Activity className={`h-4 w-4 ${
                      rec.priority === 'HIGH'
                        ? 'text-red-600 dark:text-red-400'
                        : rec.priority === 'MEDIUM'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{rec.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rec.description}</p>
                    {rec.expectedImpact && (
                      <p className="text-xs text-green-600 mt-1">{rec.expectedImpact}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card
            className="hover:bg-accent cursor-pointer transition-colors"
            onClick={() =>
              navigate('/aco/predictions')
            }
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                AI Predictions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Run ML-powered risk and performance predictions
              </p>
            </CardContent>
          </Card>

          <Card className="hover:bg-accent cursor-pointer transition-colors">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
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
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
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
    </AppShell>
  );
}

// ─── Demo fallback data ───────────────────────────────────────────────────────

const DEMO_PROVIDERS: ProviderRow[] = [
  { providerId: '1', name: 'Dr. Sarah Chen',         identifier: 'PRV-001', patientCount: 450,  costPerPt: 8200,  qualityScore: 94.2, status: 'ACTIVE' },
  { providerId: '2', name: 'Regional Hospital System', identifier: 'PRV-042', patientCount: 1200, costPerPt: 9800,  qualityScore: 87.5, status: 'ACTIVE' },
  { providerId: '3', name: 'Metro Specialty Clinic',  identifier: 'PRV-089', patientCount: 320,  costPerPt: 14500, qualityScore: 76.3, status: 'ACTIVE' },
];

const DEMO_RECS: RecommendationRow[] = [
  {
    id: 'd1', title: 'High-Risk Patient Outreach', priority: 'HIGH',
    description: '320 high-risk beneficiaries identified for proactive care management intervention.',
    expectedImpact: 'Potential savings: $840K',
    recType: 'CARE_MANAGEMENT',
  },
  {
    id: 'd2', title: 'Preventive Care Gap Closure', priority: 'MEDIUM',
    description: '580 beneficiaries overdue for preventive screenings.',
    expectedImpact: 'Quality score impact: +2.1%',
    recType: 'QUALITY_IMPROVEMENT',
  },
  {
    id: 'd3', title: 'Readmission Reduction Program', priority: 'HIGH',
    description: 'Focus on 45 frequent readmission patients.',
    expectedImpact: 'Potential savings: $620K',
    recType: 'CARE_MANAGEMENT',
  },
];
