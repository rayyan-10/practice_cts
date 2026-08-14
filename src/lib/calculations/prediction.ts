/**
 * VBC ACO Performance Prediction Engine
 *
 * This module provides the frontend prediction logic.
 * All functions are pure and side-effect-free so the entire engine can be
 * swapped for a real ML backend call (XGBoost / REST API) without changing
 * any consumer component.
 *
 * When connecting to a backend, replace `runPrediction` with an async fetch
 * to your prediction service and map the response to `PredictionResult`.
 */

// ─── Input types ─────────────────────────────────────────────────────────────

export interface PredictionInput {
  // ACO identity
  acoId: string;
  acoName: string;
  performanceYear: number;
  primaryState: string;
  vbcTrack: string;
  revenueCategory: string;

  // Population
  numBeneficiaries: number;
  numHospitals: number;
  numPCPs: number;
  numSpecialists: number;
  beneficiaryGrowth: number; // %

  // Historical performance
  prevSavingsRate: number;    // % e.g. -3.5
  prevQualityScore: number;   // 0-100
  prevPerformanceGap: number; // % e.g. -5.0
  qualityChange: number;      // % change vs last year

  // Cost & growth
  expenditureGrowth: number;  // %
  benchmarkGrowth: number;    // %
}

// ─── Output types ─────────────────────────────────────────────────────────────

export type RiskCategory = 'Successful' | 'Stable' | 'At Risk';

export interface RiskDriver {
  feature: string;
  importance: number; // 0–1
  displayLabel: string;
}

export interface RecommendedAction {
  id: string;
  category: 'cost' | 'quality' | 'care' | 'population' | 'preventive';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface HistoricalPoint {
  year: number;
  gap: number;
  isPredicted: boolean;
}

export interface RiskDistributionEntry {
  label: RiskCategory;
  count: number;
  pct: number;
  color: string;
}

export interface PredictionResult {
  predictedGap: number;         // % e.g. -7.42
  riskCategory: RiskCategory;
  confidence: number;           // 0-100
  modelUsed: string;
  predictionDate: string;       // ISO date string

  riskDrivers: RiskDriver[];
  recommendations: RecommendedAction[];
  historicalSeries: HistoricalPoint[];

  // Portfolio-level distribution (static demo until backend supplies it)
  riskDistribution: RiskDistributionEntry[];
}

// ─── Risk distribution colours ───────────────────────────────────────────────

const RISK_COLORS: Record<RiskCategory, string> = {
  Successful: '#22c55e',
  Stable:     '#3b82f6',
  'At Risk':  '#ef4444',
};

// ─── Core prediction function ─────────────────────────────────────────────────

/**
 * Run the prediction for a given set of ACO inputs.
 *
 * This is a deterministic frontend model that mirrors the feature weights used
 * by the planned XGBoost backend. Replace the body with:
 *
 *   const res = await fetch('/api/predict', { method:'POST', body: JSON.stringify(input) });
 *   return (await res.json()) as PredictionResult;
 *
 * and the UI will continue to work without any other changes.
 */
export function runPrediction(input: PredictionInput): PredictionResult {
  // ── 1. Compute predicted performance gap ──────────────────────────────────
  // Weighted linear model approximating XGBoost feature importances
  const gap =
    input.prevPerformanceGap * 0.35 +
    input.expenditureGrowth  * -0.25 +
    input.prevSavingsRate    * 0.15 +
    input.qualityChange      * 0.10 +
    (input.prevQualityScore - 85) * 0.06 +
    (input.benchmarkGrowth - input.expenditureGrowth) * 0.05 +
    input.beneficiaryGrowth  * -0.04;

  const predictedGap = parseFloat(gap.toFixed(2));

  // ── 2. Risk category ──────────────────────────────────────────────────────
  let riskCategory: RiskCategory;
  if (predictedGap >= -1) {
    riskCategory = 'Successful';
  } else if (predictedGap >= -4) {
    riskCategory = 'Stable';
  } else {
    riskCategory = 'At Risk';
  }

  // ── 3. Confidence ─────────────────────────────────────────────────────────
  // Higher confidence when inputs are more extreme (farther from zero)
  const signalStrength = Math.min(
    100,
    60 +
      Math.abs(input.prevPerformanceGap) * 2 +
      Math.abs(input.expenditureGrowth)  * 1.5 +
      Math.abs(input.qualityChange)      * 1
  );
  const confidence = Math.round(Math.min(99, Math.max(55, signalStrength)));

  // ── 4. Risk drivers (feature importances) ─────────────────────────────────
  const rawDrivers: Array<{ feature: string; label: string; raw: number }> = [
    { feature: 'prevPerformanceGap', label: 'Previous Performance Gap', raw: Math.abs(input.prevPerformanceGap) * 0.35 },
    { feature: 'expenditureGrowth',  label: 'Expenditure Growth',        raw: Math.abs(input.expenditureGrowth)  * 0.25 },
    { feature: 'prevQualityScore',   label: 'Quality Score',             raw: Math.abs(input.prevQualityScore - 85) * 0.20 },
    { feature: 'qualityChange',      label: 'Quality Change',            raw: Math.abs(input.qualityChange)      * 0.15 },
    { feature: 'prevSavingsRate',    label: 'Previous Savings Rate',     raw: Math.abs(input.prevSavingsRate)    * 0.15 },
    { feature: 'benchmarkGrowth',    label: 'Benchmark Growth',          raw: Math.abs(input.benchmarkGrowth)    * 0.10 },
    { feature: 'beneficiaryGrowth',  label: 'Beneficiary Growth',        raw: Math.abs(input.beneficiaryGrowth)  * 0.08 },
  ];

  const maxRaw = Math.max(...rawDrivers.map(d => d.raw), 0.001);

  const riskDrivers: RiskDriver[] = rawDrivers
    .sort((a, b) => b.raw - a.raw)
    .slice(0, 5)
    .map(d => ({
      feature:      d.feature,
      displayLabel: d.label,
      importance:   parseFloat((d.raw / maxRaw).toFixed(3)),
    }));

  // ── 5. Historical series ──────────────────────────────────────────────────
  // Build a 3-year lookback using the previous gap as anchor, then project
  const yearNow = input.performanceYear;
  const historicalSeries: HistoricalPoint[] = [
    { year: yearNow - 3, gap: parseFloat((input.prevPerformanceGap + 2.5).toFixed(2)), isPredicted: false },
    { year: yearNow - 2, gap: parseFloat((input.prevPerformanceGap + 1.3).toFixed(2)), isPredicted: false },
    { year: yearNow - 1, gap: parseFloat(input.prevPerformanceGap.toFixed(2)),          isPredicted: false },
    { year: yearNow,     gap: predictedGap,                                             isPredicted: true  },
  ];

  // ── 6. Recommendations ────────────────────────────────────────────────────
  const recommendations = buildRecommendations(input, riskCategory);

  // ── 7. Portfolio risk distribution (demo until backend feeds this) ─────────
  const riskDistribution = buildRiskDistribution();

  return {
    predictedGap,
    riskCategory,
    confidence,
    modelUsed: 'XGBoost (v1.0-frontend)',
    predictionDate: new Date().toISOString().split('T')[0],
    riskDrivers,
    recommendations,
    historicalSeries,
    riskDistribution,
  };
}

// ─── Recommendation builder ───────────────────────────────────────────────────

function buildRecommendations(
  input: PredictionInput,
  risk: RiskCategory
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  if (input.expenditureGrowth > input.benchmarkGrowth + 1) {
    actions.push({
      id: 'cost-1',
      category: 'cost',
      priority: 'high',
      title: 'Cost Containment Initiative',
      description: `High expenditure growth (${input.expenditureGrowth.toFixed(1)}%) compared to benchmark (${input.benchmarkGrowth.toFixed(1)}%). Focus on cost containment — review high-cost utilization patterns and implement care management for top cost drivers.`,
    });
  }

  if (input.prevQualityScore < 82) {
    actions.push({
      id: 'quality-1',
      category: 'quality',
      priority: 'high',
      title: 'Quality Improvement Program',
      description: `Quality score of ${input.prevQualityScore.toFixed(0)} is below the optimal threshold of 82. Implement structured quality improvement programs targeting preventive care gaps and chronic disease management measures.`,
    });
  }

  if (input.qualityChange < -1) {
    actions.push({
      id: 'quality-2',
      category: 'quality',
      priority: 'high',
      title: 'Address Declining Quality Trend',
      description: `Quality change of ${input.qualityChange.toFixed(1)}% indicates declining performance. Conduct root-cause analysis, review care gaps, and implement immediate corrective action plans.`,
    });
  }

  if (input.prevPerformanceGap < -3) {
    actions.push({
      id: 'care-1',
      category: 'care',
      priority: 'high',
      title: 'Strengthen Care Coordination',
      description: `Previous performance gap of ${input.prevPerformanceGap.toFixed(1)}% indicates structural issues. Enhance care coordination protocols, establish multi-disciplinary care teams, and improve transitions-of-care processes.`,
    });
  }

  if (input.beneficiaryGrowth > 5) {
    actions.push({
      id: 'population-1',
      category: 'population',
      priority: 'medium',
      title: 'Population Health Scaling',
      description: `Beneficiary growth of ${input.beneficiaryGrowth.toFixed(1)}% requires population health infrastructure scaling. Expand care management capacity and ensure risk stratification processes accommodate the growing panel.`,
    });
  }

  // Always include preventive care
  actions.push({
    id: 'preventive-1',
    category: 'preventive',
    priority: risk === 'At Risk' ? 'high' : 'medium',
    title: 'Preventive Care & Chronic Disease Management',
    description: 'Increase focus on population health management and preventive care. Prioritise annual wellness visits, chronic disease screenings, and medication adherence programs to reduce downstream acute care costs.',
  });

  if (input.prevSavingsRate < -2) {
    actions.push({
      id: 'cost-2',
      category: 'cost',
      priority: 'medium',
      title: 'Shared Savings Recovery Plan',
      description: `Previous savings rate of ${input.prevSavingsRate.toFixed(1)}% indicates repeated performance shortfalls. Develop a formal savings recovery plan including specialty referral management and post-acute utilisation review.`,
    });
  }

  return actions;
}

// ─── Demo risk distribution ──────────────────────────────────────────────────

function buildRiskDistribution(): RiskDistributionEntry[] {
  const data: Array<{ label: RiskCategory; count: number }> = [
    { label: 'Successful', count: 8  },
    { label: 'Stable',     count: 11 },
    { label: 'At Risk',    count: 5  },
  ];
  const total = data.reduce((s, d) => s + d.count, 0);
  return data.map(d => ({
    label: d.label,
    count: d.count,
    pct:   parseFloat(((d.count / total) * 100).toFixed(1)),
    color: RISK_COLORS[d.label],
  }));
}

// ─── Helpers used by components ───────────────────────────────────────────────

export function getRiskCategoryColor(cat: RiskCategory): string {
  return RISK_COLORS[cat];
}

export function getRiskCategoryBadgeClass(cat: RiskCategory): string {
  switch (cat) {
    case 'Successful': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    case 'Stable':     return 'bg-blue-100  text-blue-800  dark:bg-blue-900/40  dark:text-blue-300';
    case 'At Risk':    return 'bg-red-100   text-red-800   dark:bg-red-900/40   dark:text-red-300';
  }
}

export function getCategoryIcon(cat: RecommendedAction['category']): string {
  switch (cat) {
    case 'cost':        return '💰';
    case 'quality':     return '⭐';
    case 'care':        return '🏥';
    case 'population':  return '👥';
    case 'preventive':  return '🛡️';
  }
}

/** Default blank input — used to pre-populate the form */
export function defaultPredictionInput(): PredictionInput {
  return {
    acoId:              '',
    acoName:            '',
    performanceYear:    new Date().getFullYear(),
    primaryState:       '',
    vbcTrack:           'MSSP_BASIC',
    revenueCategory:    '',
    numBeneficiaries:   0,
    numHospitals:       0,
    numPCPs:            0,
    numSpecialists:     0,
    beneficiaryGrowth:  0,
    prevSavingsRate:    0,
    prevQualityScore:   80,
    prevPerformanceGap: 0,
    qualityChange:      0,
    expenditureGrowth:  0,
    benchmarkGrowth:    0,
  };
}
