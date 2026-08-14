/**
 * PredictPage — VBC ACO Performance Prediction
 *
 * Visual reference: provided screenshot.
 * Layout: AppShell wraps the page.
 *   Desktop — two columns:
 *     Left  (5/12)  — blue-headed "1 ACO PERFORMANCE INPUT" form
 *     Right (7/12)  — green-headed "2 PREDICTION RESULTS" panel
 *   Mobile/tablet — single column, input stacks above results.
 *
 * Authorization:
 *   PAYER — ACO selector dropdown from Supabase (all ACOs via RLS).
 *   ACO   — ACO ID shown read-only; no selector exposed.
 *
 * Prediction:
 *   Calls runPrediction() from src/lib/calculations/prediction.ts.
 *   ALL result values come from PredictionResult — nothing is hardcoded.
 */

import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getUserContext } from '@/lib/auth';
import type { UserContext } from '@/lib/auth';
import AppShell from '@/components/layout/AppShell';
import HistoricalPredictedChart from '@/components/charts/HistoricalPredictedChart';
import RiskDistributionChart from '@/components/charts/RiskDistributionChart';
import RiskDriversChart from '@/components/charts/RiskDriversChart';
import {
  runPrediction,
  defaultPredictionInput,
  getRiskCategoryBadgeClass,
  getCategoryIcon,
  type PredictionInput,
  type PredictionResult,
} from '@/lib/calculations/prediction';
import { formatPercentage } from '@/lib/calculations/financial';
import { cn } from '@/lib/utils';
import {
  Brain,
  Loader2,
  AlertTriangle,
  Lock,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
} from 'lucide-react';

// ─── Sub-types ────────────────────────────────────────────────────────────────

interface AcoOption {
  id: string;
  name: string;
  aco_identifier: string;
}

// ─── Shared style constants ───────────────────────────────────────────────────

const inputCls =
  'w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 ' +
  'px-3 py-2 text-sm text-gray-900 dark:text-gray-100 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ' +
  'placeholder:text-gray-400 dark:placeholder:text-gray-500 ' +
  'disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed';

const selectCls =
  'w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 ' +
  'px-3 py-2 text-sm text-gray-900 dark:text-gray-100 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500';

// ─── Small reusable presentational pieces ─────────────────────────────────────

/** Blue-or-green numbered section header strip (matches screenshot style) */
function SectionStrip({
  step,
  title,
  subtitle,
  color,
}: {
  step: number;
  title: string;
  subtitle: string;
  color: 'blue' | 'green';
}) {
  const bg = color === 'blue' ? 'bg-blue-700' : 'bg-emerald-600';
  return (
    <div className={`${bg} px-5 py-3`}>
      <div className="flex items-center gap-3">
        <span className="flex-shrink-0 h-7 w-7 rounded-full bg-white/20 flex items-center justify-center text-sm font-extrabold text-white">
          {step}
        </span>
        <h2 className="text-sm font-bold tracking-widest uppercase text-white">{title}</h2>
      </div>
      <p className="text-xs text-white/75 mt-1 ml-10">{subtitle}</p>
    </div>
  );
}

/** Gray sub-section label bar inside form */
function FormSection({ title }: { title: string }) {
  return (
    <div className="bg-gray-100 dark:bg-gray-700/60 rounded px-3 py-1.5 mt-4 mb-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
        {title}
      </p>
    </div>
  );
}

/** Label + input field wrapper */
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </label>
      {children}
      {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

/** Two-column field grid */
function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

/** Result KPI card — three per row in the results panel */
function ResultKpi({
  label,
  sublabel,
  value,
  valueColor,
  badgeText,
  badgeClass,
}: {
  label: string;
  sublabel: string;
  value: string;
  valueColor: string;
  badgeText: string;
  badgeClass: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col gap-1 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 leading-tight">
        {label}
      </p>
      <p className="text-[10px] text-gray-400 dark:text-gray-500">{sublabel}</p>
      <p className={cn('text-2xl font-extrabold mt-1', valueColor)}>{value}</p>
      <span className={cn('self-start text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1', badgeClass)}>
        {badgeText}
      </span>
    </div>
  );
}

/** Summary row in the Prediction Summary card */
function SummaryRow({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{label}</span>
      <span className={cn('text-xs text-right font-medium', valueClass)}>{value}</span>
    </div>
  );
}

// ─── Risk category text colour helper ─────────────────────────────────────────
function riskTextClass(cat: string) {
  if (cat === 'Successful') return 'text-green-600 dark:text-green-400';
  if (cat === 'Stable')     return 'text-blue-600 dark:text-blue-400';
  return 'text-red-600 dark:text-red-400';
}

// ─── Priority icon ─────────────────────────────────────────────────────────────
function PriorityIcon({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  if (priority === 'high')   return <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />;
  if (priority === 'medium') return <AlertCircle   className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />;
  return <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />;
}

// ─── Main page component ───────────────────────────────────────────────────────

export default function PredictPage() {
  const location = useLocation();

  // auth
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [authLoading, setAuthLoading]  = useState(true);

  // ACO options (PAYER only)
  const [acoOptions, setAcoOptions] = useState<AcoOption[]>([]);
  const [acoLoading, setAcoLoading]  = useState(false);

  // form
  const [form, setForm]     = useState<PredictionInput>(defaultPredictionInput());
  const [errors, setErrors] = useState<Partial<Record<keyof PredictionInput, string>>>({});

  // prediction
  const [predicting, setPredicting]   = useState(false);
  const [result, setResult]           = useState<PredictionResult | null>(null);
  const [predictError, setPredictError] = useState<string | null>(null);

  // ── Load user context on mount ──────────────────────────────────────────────
  useEffect(() => {
    getUserContext().then(ctx => {
      setUserContext(ctx);
      setAuthLoading(false);
      if (ctx?.role === 'PAYER') {
        loadAcoList();
      } else if (ctx?.role === 'ACO' && ctx.acoId) {
        loadAcoDetails(ctx.acoId);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pre-fill when navigated from ACO list ───────────────────────────────────
  useEffect(() => {
    const state = location.state as { acoId?: string; acoName?: string } | null;
    if (state?.acoId) {
      setForm(prev => ({
        ...prev,
        acoId:   state.acoId ?? prev.acoId,
        acoName: state.acoName ?? prev.acoName,
      }));
    }
  }, [location.state]);

  // ── Data loaders ────────────────────────────────────────────────────────────
  const loadAcoList = useCallback(async () => {
    setAcoLoading(true);
    const { data, error } = await supabase
      .from('acos')
      .select('id, name, aco_identifier')
      .eq('status', 'ACTIVE')
      .order('name');
    if (!error && data) {
      setAcoOptions(data as AcoOption[]);
      if (data.length > 0) {
        setForm(prev => prev.acoId ? prev : {
          ...prev,
          acoId:   data[0].id,
          acoName: data[0].name,
        });
      }
    }
    setAcoLoading(false);
  }, []);

  const loadAcoDetails = useCallback(async (acoId: string) => {
    const { data, error } = await supabase
      .from('acos')
      .select('id, name, aco_identifier, program_type')
      .eq('id', acoId)
      .single();
    if (!error && data) {
      setForm(prev => ({
        ...prev,
        acoId:    data.id,
        acoName:  data.name,
        vbcTrack: data.program_type ?? prev.vbcTrack,
      }));
    }
  }, []);

  // ── Form helpers ─────────────────────────────────────────────────────────────
  function setField<K extends keyof PredictionInput>(key: K, val: PredictionInput[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  }

  function numField(key: keyof PredictionInput, raw: string) {
    const n = parseFloat(raw);
    setField(key, (isNaN(n) ? 0 : n) as PredictionInput[typeof key]);
  }

  function validate(): boolean {
    const e: Partial<Record<keyof PredictionInput, string>> = {};
    if (!form.acoId)                                         e.acoId            = 'Select an ACO';
    if (!form.primaryState)                                  e.primaryState     = 'Required';
    if (!form.revenueCategory)                               e.revenueCategory  = 'Required';
    if (form.numBeneficiaries <= 0)                          e.numBeneficiaries = 'Must be > 0';
    if (form.prevQualityScore < 0 || form.prevQualityScore > 100)
                                                              e.prevQualityScore = '0–100';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Predict handler ──────────────────────────────────────────────────────────
  async function handlePredict() {
    if (!validate()) return;
    setPredicting(true);
    setResult(null);
    setPredictError(null);

    // Thin async wrapper so loading spinner renders.
    // Swap the body for fetch('/api/predict', ...) when the ML backend is ready.
    await new Promise<void>(res => setTimeout(res, 800));

    try {
      const r = runPrediction(form);
      setResult(r);
    } catch (err) {
      setPredictError(err instanceof Error ? err.message : 'Prediction failed. Please try again.');
    } finally {
      setPredicting(false);
    }
  }

  // ── Derived UI flags ─────────────────────────────────────────────────────────
  const isPayer     = userContext?.role === 'PAYER';
  const hasResult   = result !== null && !predicting;

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <AppShell
      userContext={userContext}
      pageTitle="VBC Contract Performance Analytics"
      performanceYear={form.performanceYear}
    >
      {/* Page background */}
      <div className="min-h-full bg-slate-50 dark:bg-gray-950 p-4 lg:p-6">
        <div className="max-w-[1440px] mx-auto">

          {/* ── Two-column grid ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">

            {/* ╔══════════════════════════════════════════════════════════╗
                ║  LEFT  — ACO PERFORMANCE INPUT                         ║
                ╚══════════════════════════════════════════════════════════╝ */}
            <div className="xl:col-span-5">
              <div className="rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">

                <SectionStrip
                  step={1}
                  title="ACO Performance Input"
                  subtitle="Enter ACO details to predict future performance"
                  color="blue"
                />

                <div className="bg-white dark:bg-gray-900 p-5 space-y-3 max-h-[calc(100vh-8rem)] overflow-y-auto">

                  {/* ── ACO selector / identity ──────────────────────── */}
                  {isPayer ? (
                    <Field label="ACO" error={errors.acoId}>
                      <select
                        className={selectCls}
                        value={form.acoId}
                        disabled={acoLoading}
                        onChange={e => {
                          const opt = acoOptions.find(a => a.id === e.target.value);
                          setField('acoId',   e.target.value);
                          setField('acoName', opt?.name ?? '');
                        }}
                      >
                        <option value="">
                          {acoLoading ? 'Loading ACOs…' : 'Select ACO'}
                        </option>
                        {acoOptions.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.name} — {a.aco_identifier}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : (
                    /* ACO user — show ACO as read-only locked field */
                    <Field label="ACO (assigned)">
                      <div className="flex items-center gap-2 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-3 py-2">
                        <Lock className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-200 truncate">
                          {form.acoName || '—'}
                        </span>
                      </div>
                    </Field>
                  )}

                  {/* ACO ID — read-only display for both roles */}
                  {form.acoId && (
                    <Field label="ACO ID">
                      <input
                        className={inputCls}
                        value={form.acoId}
                        readOnly
                        disabled
                        tabIndex={-1}
                      />
                    </Field>
                  )}

                  {/* ── ACO details row ──────────────────────────────── */}
                  <FieldRow>
                    <Field label="Performance Year">
                      <input
                        type="number"
                        className={inputCls}
                        value={form.performanceYear}
                        min={2015}
                        max={2035}
                        onChange={e => numField('performanceYear', e.target.value)}
                      />
                    </Field>
                    <Field label="Primary State" error={errors.primaryState}>
                      <input
                        className={inputCls}
                        placeholder="e.g. MA"
                        maxLength={2}
                        value={form.primaryState}
                        onChange={e => setField('primaryState', e.target.value.toUpperCase())}
                      />
                    </Field>
                  </FieldRow>

                  <FieldRow>
                    <Field label="VBC Track">
                      <select
                        className={selectCls}
                        value={form.vbcTrack}
                        onChange={e => setField('vbcTrack', e.target.value)}
                      >
                        <option value="MSSP_BASIC">MSSP Basic</option>
                        <option value="MSSP_ENHANCED">MSSP Enhanced</option>
                        <option value="REACH">REACH</option>
                        <option value="NEXT_GEN">Next Gen</option>
                        <option value="CUSTOM">Custom</option>
                      </select>
                    </Field>
                    <Field label="Revenue / Expenditure Category" error={errors.revenueCategory}>
                      <input
                        className={inputCls}
                        placeholder="e.g. High"
                        value={form.revenueCategory}
                        onChange={e => setField('revenueCategory', e.target.value)}
                      />
                    </Field>
                  </FieldRow>

                  {/* ── ACO Size ─────────────────────────────────────── */}
                  <FormSection title="ACO Size" />

                  <FieldRow>
                    <Field label="Number of Beneficiaries" error={errors.numBeneficiaries}>
                      <input
                        type="number"
                        min={0}
                        className={inputCls}
                        placeholder="0"
                        value={form.numBeneficiaries || ''}
                        onChange={e => numField('numBeneficiaries', e.target.value)}
                      />
                    </Field>
                    <Field label="Number of Hospitals">
                      <input
                        type="number"
                        min={0}
                        className={inputCls}
                        placeholder="0"
                        value={form.numHospitals || ''}
                        onChange={e => numField('numHospitals', e.target.value)}
                      />
                    </Field>
                  </FieldRow>

                  <FieldRow>
                    <Field label="Number of PCPs">
                      <input
                        type="number"
                        min={0}
                        className={inputCls}
                        placeholder="0"
                        value={form.numPCPs || ''}
                        onChange={e => numField('numPCPs', e.target.value)}
                      />
                    </Field>
                    <Field label="Number of Specialists">
                      <input
                        type="number"
                        min={0}
                        className={inputCls}
                        placeholder="0"
                        value={form.numSpecialists || ''}
                        onChange={e => numField('numSpecialists', e.target.value)}
                      />
                    </Field>
                  </FieldRow>

                  <Field label="Beneficiary Growth (%)">
                    <input
                      type="number"
                      step="0.1"
                      className={inputCls}
                      placeholder="0.0"
                      value={form.beneficiaryGrowth || ''}
                      onChange={e => numField('beneficiaryGrowth', e.target.value)}
                    />
                  </Field>

                  {/* ── Historical Performance ────────────────────────── */}
                  <FormSection title="Historical Performance" />

                  <FieldRow>
                    <Field label="Previous Savings Rate (%)">
                      <input
                        type="number"
                        step="0.1"
                        className={inputCls}
                        placeholder="-3.5"
                        value={form.prevSavingsRate || ''}
                        onChange={e => numField('prevSavingsRate', e.target.value)}
                      />
                    </Field>
                    <Field label="Previous Quality Score (0–100)" error={errors.prevQualityScore}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        className={inputCls}
                        placeholder="80"
                        value={form.prevQualityScore || ''}
                        onChange={e => numField('prevQualityScore', e.target.value)}
                      />
                    </Field>
                  </FieldRow>

                  <FieldRow>
                    <Field label="Previous Performance Gap (%)">
                      <input
                        type="number"
                        step="0.1"
                        className={inputCls}
                        placeholder="-5.0"
                        value={form.prevPerformanceGap || ''}
                        onChange={e => numField('prevPerformanceGap', e.target.value)}
                      />
                    </Field>
                    <Field label="Quality Change (vs last year)">
                      <input
                        type="number"
                        step="0.1"
                        className={inputCls}
                        placeholder="1.2"
                        value={form.qualityChange || ''}
                        onChange={e => numField('qualityChange', e.target.value)}
                      />
                    </Field>
                  </FieldRow>

                  {/* ── Cost & Growth ────────────────────────────────── */}
                  <FormSection title="Cost & Growth Information" />

                  <FieldRow>
                    <Field label="Expenditure Growth (%)">
                      <input
                        type="number"
                        step="0.1"
                        className={inputCls}
                        placeholder="3.5"
                        value={form.expenditureGrowth || ''}
                        onChange={e => numField('expenditureGrowth', e.target.value)}
                      />
                    </Field>
                    <Field label="Benchmark Growth (%)">
                      <input
                        type="number"
                        step="0.1"
                        className={inputCls}
                        placeholder="2.5"
                        value={form.benchmarkGrowth || ''}
                        onChange={e => numField('benchmarkGrowth', e.target.value)}
                      />
                    </Field>
                  </FieldRow>

                  {/* ── PREDICT button ────────────────────────────────── */}
                  <button
                    onClick={handlePredict}
                    disabled={predicting}
                    className="w-full mt-3 flex items-center justify-center gap-2
                               rounded-lg bg-blue-700 hover:bg-blue-800
                               disabled:opacity-55 disabled:cursor-not-allowed
                               text-white font-bold py-3.5 text-sm uppercase tracking-widest
                               transition-colors shadow-md"
                  >
                    {predicting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Running Prediction…
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4" />
                        Predict Performance
                      </>
                    )}
                  </button>

                </div>
              </div>
            </div>

            {/* ╔══════════════════════════════════════════════════════════╗
                ║  RIGHT  — PREDICTION RESULTS                           ║
                ╚══════════════════════════════════════════════════════════╝ */}
            <div className="xl:col-span-7">
              <div className="rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">

                <SectionStrip
                  step={2}
                  title="Prediction Results"
                  subtitle="ACO future performance prediction and risk assessment"
                  color="green"
                />

                <div className="bg-white dark:bg-gray-900">

                  {/* ── Empty / pre-prediction state ────────────────── */}
                  {!result && !predicting && !predictError && (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                      <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                        <Brain className="h-8 w-8 text-slate-400 dark:text-gray-500" />
                      </div>
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                        Fill in the ACO performance inputs on the left
                      </p>
                      <p className="text-sm text-blue-600 font-bold mt-1">
                        then click PREDICT PERFORMANCE
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 max-w-xs">
                        Results — including predicted gap, risk classification,
                        key drivers, and recommended actions — will appear here.
                      </p>
                    </div>
                  )}

                  {/* ── Loading state ────────────────────────────────── */}
                  {predicting && (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
                      <p className="text-sm font-medium text-gray-500">Running prediction model…</p>
                      <p className="text-xs text-gray-400 mt-1">This will only take a moment</p>
                    </div>
                  )}

                  {/* ── Error state ──────────────────────────────────── */}
                  {predictError && !predicting && (
                    <div className="m-5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-5 text-center">
                      <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-red-700 dark:text-red-400">Prediction failed</p>
                      <p className="text-xs text-red-600 dark:text-red-500 mt-1">{predictError}</p>
                      <button
                        onClick={handlePredict}
                        className="mt-3 px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* ╔══════════════════════════════════════════════╗
                      ║  RESULTS — rendered from PredictionResult   ║
                      ╚══════════════════════════════════════════════╝ */}
                  {hasResult && result && (
                    <div className="p-5 space-y-5 animate-fade-in">

                      {/* ── 3 KPI cards ─────────────────────────────── */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                        {/* KPI 1: Predicted Gap */}
                        <ResultKpi
                          label="Predicted Future Performance Gap"
                          sublabel="vs Benchmark"
                          value={`${result.predictedGap >= 0 ? '+' : ''}${result.predictedGap.toFixed(2)}%`}
                          valueColor={result.predictedGap >= 0 ? 'text-green-600' : 'text-red-600'}
                          badgeText={result.predictedGap >= 0 ? 'On Track' : 'Below Benchmark'}
                          badgeClass={
                            result.predictedGap >= 0
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                          }
                        />

                        {/* KPI 2: Risk Category */}
                        <ResultKpi
                          label="Risk Category"
                          sublabel={
                            result.riskCategory === 'At Risk'    ? 'High Priority Intervention' :
                            result.riskCategory === 'Stable'     ? 'Monitor Closely'             :
                                                                   'Performing Well'
                          }
                          value={result.riskCategory}
                          valueColor={riskTextClass(result.riskCategory)}
                          badgeText={result.riskCategory}
                          badgeClass={getRiskCategoryBadgeClass(result.riskCategory)}
                        />

                        {/* KPI 3: Confidence */}
                        <ResultKpi
                          label="Prediction Confidence"
                          sublabel={
                            result.confidence >= 85 ? 'High Confidence'     :
                            result.confidence >= 70 ? 'Moderate Confidence' :
                                                      'Low Confidence'
                          }
                          value={formatPercentage(result.confidence, 0)}
                          valueColor="text-blue-600"
                          badgeText={result.confidence >= 85 ? 'High' : result.confidence >= 70 ? 'Moderate' : 'Low'}
                          badgeClass="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        />
                      </div>

                      {/* ── Risk Distribution + Key Risk Drivers ────── */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">
                            Risk Distribution (All ACOs)
                          </p>
                          <RiskDistributionChart data={result.riskDistribution} />
                        </div>

                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">
                            Key Risk Drivers (Top 5)
                          </p>
                          <RiskDriversChart drivers={result.riskDrivers} />
                        </div>
                      </div>

                      {/* ── Recommended Actions ──────────────────────── */}
                      <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-900/10 overflow-hidden shadow-sm">
                        {/* Header strip */}
                        <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 px-4 py-2.5 border-b border-red-200 dark:border-red-900/60">
                          <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                          <p className="text-xs font-bold uppercase tracking-widest text-red-700 dark:text-red-400">
                            Recommended Actions
                          </p>
                          <span className="ml-auto text-xs font-semibold text-red-500 dark:text-red-400">
                            {result.recommendations.length} action{result.recommendations.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="divide-y divide-red-100 dark:divide-red-900/40">
                          {result.recommendations.map(rec => (
                            <div
                              key={rec.id}
                              className={cn(
                                'flex items-start gap-3 px-4 py-3',
                                rec.priority === 'high'
                                  ? 'bg-red-50 dark:bg-red-900/5'
                                  : 'bg-white dark:bg-gray-800/50'
                              )}
                            >
                              {/* category emoji */}
                              <span className="text-base flex-shrink-0 mt-0.5 leading-none">
                                {getCategoryIcon(rec.category)}
                              </span>

                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <PriorityIcon priority={rec.priority} />
                                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {rec.title}
                                  </p>
                                  <span className={cn(
                                    'text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase',
                                    rec.priority === 'high'
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                      : rec.priority === 'medium'
                                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                  )}>
                                    {rec.priority}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                                  {rec.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ── Historical Chart + Prediction Summary ────── */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

                        {/* Chart — 3/5 width on md+ */}
                        <div className="md:col-span-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">
                            Historical vs Predicted Performance
                          </p>
                          <HistoricalPredictedChart data={result.historicalSeries} />
                        </div>

                        {/* Prediction Summary — 2/5 width on md+ */}
                        <div className="md:col-span-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/60 p-4 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">
                            Prediction Summary
                          </p>
                          <div className="space-y-0">
                            <SummaryRow
                              label="Predicted Gap"
                              value={`${result.predictedGap >= 0 ? '+' : ''}${result.predictedGap.toFixed(2)}%`}
                              valueClass={riskTextClass(
                                result.predictedGap >= 0 ? 'Successful' : result.riskCategory
                              )}
                            />
                            <SummaryRow
                              label="Risk Level"
                              value={result.riskCategory}
                              valueClass={riskTextClass(result.riskCategory)}
                            />
                            <SummaryRow
                              label="Confidence"
                              value={formatPercentage(result.confidence, 0)}
                              valueClass="text-blue-600 dark:text-blue-400"
                            />
                            <SummaryRow
                              label="Model Used"
                              value={result.modelUsed}
                              valueClass="text-gray-700 dark:text-gray-300"
                            />
                            <SummaryRow
                              label="Prediction Date"
                              value={result.predictionDate}
                              valueClass="text-gray-700 dark:text-gray-300"
                            />
                            <SummaryRow
                              label="ACO"
                              value={form.acoName || form.acoId || '—'}
                              valueClass="text-gray-700 dark:text-gray-300"
                            />
                            <SummaryRow
                              label="Performance Year"
                              value={String(form.performanceYear)}
                              valueClass="text-gray-700 dark:text-gray-300"
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppShell>
  );
}
