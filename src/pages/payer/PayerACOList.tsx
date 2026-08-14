/**
 * PayerACOList — CMS/Payer Admin ACO portfolio list
 * - Uses AppShell
 * - Fetches live ACOs + contract_performance from Supabase
 * - Falls back to demo data when DB is empty
 * - Each row has a "Predict" button that navigates to /predict with state
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getUserContext } from '@/lib/auth';
import type { UserContext } from '@/lib/auth';
import AppShell from '@/components/layout/AppShell';
import RiskBadge from '@/components/common/RiskBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Building2, Search, Loader2 } from 'lucide-react';
import { formatLargeCurrency, formatPercentage } from '@/lib/calculations/financial';
import type { RiskLevel } from '@/types/database';

// ─── Row shape ────────────────────────────────────────────────────────────────

interface ACORow {
  acoId:            string;
  acoName:          string;
  identifier:       string;
  programType:      string;
  beneficiaries:    number;
  benchmark:        number;
  actualExpenditure: number;
  variancePct:      number;
  qualityScore:     number;
  riskLevel:        RiskLevel;
  status:           string;
}

// ─── Static demo fallback ─────────────────────────────────────────────────────

const DEMO_ROWS: ACORow[] = [
  { acoId: '1', acoName: 'Pioneer Health Network',       identifier: 'ACO-2024-001', programType: 'MSSP Enhanced', beneficiaries: 12450,  benchmark: 124500000, actualExpenditure: 114300000, variancePct: -8.2, qualityScore: 91.2, riskLevel: 'LOW',      status: 'ACTIVE' },
  { acoId: '2', acoName: 'Community Care Alliance',       identifier: 'ACO-2024-007', programType: 'MSSP Basic',    beneficiaries: 18230,  benchmark: 186200000, actualExpenditure: 178600000, variancePct: -4.1, qualityScore: 87.5, riskLevel: 'LOW',      status: 'ACTIVE' },
  { acoId: '3', acoName: 'Regional Medical Group',        identifier: 'ACO-2024-015', programType: 'MSSP Basic',    beneficiaries: 9840,   benchmark: 98400000,  actualExpenditure: 102800000, variancePct:  4.5, qualityScore: 82.1, riskLevel: 'HIGH',     status: 'ACTIVE' },
  { acoId: '4', acoName: 'Integrated Health Partners',   identifier: 'ACO-2024-012', programType: 'MSSP Enhanced', beneficiaries: 15680,  benchmark: 156800000, actualExpenditure: 149900000, variancePct: -4.4, qualityScore: 89.3, riskLevel: 'LOW',      status: 'ACTIVE' },
  { acoId: '5', acoName: 'Metropolitan Healthcare Ntwk', identifier: 'ACO-2024-003', programType: 'REACH',         beneficiaries: 22100,  benchmark: 221000000, actualExpenditure: 231500000, variancePct:  4.7, qualityScore: 79.8, riskLevel: 'CRITICAL', status: 'ACTIVE' },
  { acoId: '6', acoName: 'Coastal Physicians Collab.',   identifier: 'ACO-2024-009', programType: 'MSSP Basic',    beneficiaries: 8920,   benchmark: 89200000,  actualExpenditure: 84100000,  variancePct: -5.7, qualityScore: 93.1, riskLevel: 'LOW',      status: 'ACTIVE' },
];

export default function PayerACOList() {
  const navigate = useNavigate();
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [rows, setRows]               = useState<ACORow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [searchTerm, setSearchTerm]   = useState('');
  const [riskFilter, setRiskFilter]   = useState<string>('ALL');

  useEffect(() => {
    async function load() {
      const ctx = await getUserContext();
      setUserContext(ctx);

      // ── Fetch ACOs ──────────────────────────────────────────────────────
      const { data: acos, error: acoErr } = await supabase
        .from('acos')
        .select('id, name, aco_identifier, program_type, status')
        .order('name');

      if (acoErr || !acos || acos.length === 0) {
        setRows(DEMO_ROWS);
        setLoading(false);
        return;
      }

      // ── Fetch latest contract_performance per ACO (via contracts join) ──
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, aco_id');

      const { data: perfRaw } = await supabase
        .from('contract_performance')
        .select(
          'contract_id, beneficiary_count, benchmark, actual_expenditure, ' +
          'variance_percentage, quality_score, performance_status'
        )
        .order('period', { ascending: false });

      type PerfRow = {
        contract_id: string; beneficiary_count: number; benchmark: number;
        actual_expenditure: number; variance_percentage: number | null;
        quality_score: number | null; performance_status: string | null;
      };
      const perf = (perfRaw ?? []) as unknown as PerfRow[];

      // Build maps
      const contractToAco = new Map<string, string>();
      for (const c of (contracts ?? []) as unknown as Array<{ id: string; aco_id: string }>) {
        contractToAco.set(c.id, c.aco_id);
      }

      // Deduplicate: keep first (most recent) perf row per contract
      const latestByContract = new Map<string, PerfRow>();
      for (const row of perf) {
        if (!latestByContract.has(row.contract_id)) {
          latestByContract.set(row.contract_id, row);
        }
      }

      // Aggregate perf per ACO
      const acoPerfMap = new Map<string, {
        beneficiaries: number; benchmark: number; actual: number;
        variancePct: number; quality: number; status: string;
      }>();
      for (const [contractId, p] of latestByContract) {
        const acoId = contractToAco.get(contractId);
        if (!acoId) continue;
        const existing = acoPerfMap.get(acoId);
        acoPerfMap.set(acoId, {
          beneficiaries: (existing?.beneficiaries ?? 0) + (p.beneficiary_count ?? 0),
          benchmark:     (existing?.benchmark ?? 0)     + (p.benchmark ?? 0),
          actual:        (existing?.actual ?? 0)         + (p.actual_expenditure ?? 0),
          variancePct:   p.variance_percentage ?? 0,
          quality:       p.quality_score ?? 0,
          status:        p.performance_status ?? '',
        });
      }

      const result: ACORow[] = acos.map(aco => {
        const perf = acoPerfMap.get(aco.id);
        const variancePct = perf?.variancePct ?? 0;
        const riskLevel: RiskLevel =
          variancePct >  4 ? 'CRITICAL'
          : variancePct >  0 ? 'HIGH'
          : variancePct > -3 ? 'MEDIUM'
          : 'LOW';

        return {
          acoId:             aco.id,
          acoName:           aco.name,
          identifier:        aco.aco_identifier,
          programType:       aco.program_type ?? '',
          beneficiaries:     perf?.beneficiaries ?? 0,
          benchmark:         perf?.benchmark ?? 0,
          actualExpenditure: perf?.actual ?? 0,
          variancePct,
          qualityScore:      perf?.quality ?? 0,
          riskLevel,
          status:            aco.status,
        };
      });

      setRows(result);
      setLoading(false);
    }

    load();
  }, []);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = rows.filter(r => {
    const matchSearch =
      r.acoName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.identifier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRisk = riskFilter === 'ALL' || r.riskLevel === riskFilter;
    return matchSearch && matchRisk;
  });

  return (
    <AppShell
      userContext={userContext}
      pageTitle="ACO Portfolio"
      performanceYear={new Date().getFullYear()}
    >
      <div className="p-6 space-y-5 max-w-7xl mx-auto">

        {/* ── Filter bar ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filter ACOs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or identifier…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={riskFilter}
                onChange={e => setRiskFilter(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="ALL">All Risk Levels</option>
                <option value="LOW">Low Risk</option>
                <option value="MEDIUM">Medium Risk</option>
                <option value="HIGH">High Risk</option>
                <option value="CRITICAL">Critical Risk</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* ── ACO list ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(row => (
              <Card key={row.acoId} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: identity */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">{row.acoName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {row.identifier} • {row.programType}
                        </p>

                        {/* Metrics grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Beneficiaries</p>
                            <p className="font-semibold text-sm">
                              {row.beneficiaries > 0
                                ? row.beneficiaries.toLocaleString()
                                : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Actual / Benchmark</p>
                            <p className="font-semibold text-sm">
                              {row.benchmark > 0
                                ? `${formatLargeCurrency(row.actualExpenditure)} / ${formatLargeCurrency(row.benchmark)}`
                                : '—'}
                            </p>
                            {row.benchmark > 0 && (
                              <p className={`text-xs ${row.variancePct <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {row.variancePct > 0 ? '+' : ''}{row.variancePct.toFixed(1)}% variance
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Quality Score</p>
                            <p className="font-semibold text-sm">
                              {row.qualityScore > 0
                                ? formatPercentage(row.qualityScore)
                                : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Status</p>
                            <p className="font-semibold text-sm">{row.status}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: badge + actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <RiskBadge level={row.riskLevel} />
                      <Button
                        size="sm"
                        className="gap-1.5 bg-blue-700 hover:bg-blue-800 text-white whitespace-nowrap"
                        onClick={() =>
                          navigate('/predict', {
                            state: { acoId: row.acoId, acoName: row.acoName },
                          })
                        }
                      >
                        <Brain className="h-3.5 w-3.5" />
                        Predict
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filtered.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No ACOs match your current filters.
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
