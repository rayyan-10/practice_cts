/**
 * Financial calculation utilities for VBC/ACO analytics
 */

export interface SharedSavingsCalculation {
  benchmark: number;
  actualExpenditure: number;
  variance: number;
  variancePercentage: number;
  minimumSavingsRate: number;
  sharingRate: number;
  potentialSavings: number;
  sharedSavings: number;
  meetsMinimum: boolean;
}

export interface SharedLossCalculation {
  benchmark: number;
  actualExpenditure: number;
  variance: number;
  variancePercentage: number;
  minimumLossRate: number;
  sharingRate: number;
  potentialLoss: number;
  sharedLoss: number;
  exceedsMinimum: boolean;
}

/**
 * Calculate variance between benchmark and actual expenditure
 */
export function calculateVariance(benchmark: number, actualExpenditure: number): number {
  return benchmark - actualExpenditure;
}

/**
 * Calculate variance as a percentage of benchmark
 */
export function calculateVariancePercentage(benchmark: number, actualExpenditure: number): number {
  if (benchmark === 0) return 0;
  return ((benchmark - actualExpenditure) / benchmark) * 100;
}

/**
 * Calculate cost per beneficiary
 */
export function calculatePerBeneficiaryCost(totalCost: number, beneficiaryCount: number): number {
  if (beneficiaryCount === 0) return 0;
  return totalCost / beneficiaryCount;
}

/**
 * Calculate shared savings based on contract parameters
 */
export function calculateSharedSavings(
  benchmark: number,
  actualExpenditure: number,
  sharingRate: number,
  minimumSavingsRate: number = 0.02
): SharedSavingsCalculation {
  const variance = calculateVariance(benchmark, actualExpenditure);
  const variancePercentage = calculateVariancePercentage(benchmark, actualExpenditure);
  const potentialSavings = Math.max(0, variance);
  const meetsMinimum = variancePercentage >= (minimumSavingsRate * 100);
  const sharedSavings = meetsMinimum ? potentialSavings * sharingRate : 0;

  return {
    benchmark,
    actualExpenditure,
    variance,
    variancePercentage,
    minimumSavingsRate,
    sharingRate,
    potentialSavings,
    sharedSavings,
    meetsMinimum,
  };
}

/**
 * Calculate shared losses based on contract parameters
 */
export function calculateSharedLosses(
  benchmark: number,
  actualExpenditure: number,
  sharingRate: number,
  minimumLossRate: number = 0.02
): SharedLossCalculation {
  const variance = calculateVariance(benchmark, actualExpenditure);
  const variancePercentage = calculateVariancePercentage(benchmark, actualExpenditure);
  const potentialLoss = Math.abs(Math.min(0, variance));
  const exceedsMinimum = Math.abs(variancePercentage) >= (minimumLossRate * 100);
  const sharedLoss = exceedsMinimum ? potentialLoss * sharingRate : 0;

  return {
    benchmark,
    actualExpenditure,
    variance,
    variancePercentage,
    minimumLossRate,
    sharingRate,
    potentialLoss,
    sharedLoss,
    exceedsMinimum,
  };
}

/**
 * Calculate projected annual expenditure based on current trend
 */
export function calculateProjectedExpenditure(
  currentExpenditure: number,
  monthsElapsed: number,
  totalMonths: number = 12
): number {
  if (monthsElapsed === 0) return 0;
  const monthlyAverage = currentExpenditure / monthsElapsed;
  return monthlyAverage * totalMonths;
}

/**
 * Calculate quality gap (difference between target and actual)
 */
export function calculateQualityGap(targetValue: number, actualValue: number): number {
  return targetValue - actualValue;
}

/**
 * Calculate quality gap percentage
 */
export function calculateQualityGapPercentage(targetValue: number, actualValue: number): number {
  if (targetValue === 0) return 0;
  return ((actualValue - targetValue) / targetValue) * 100;
}

/**
 * Determine if quality target is met
 */
export function isQualityTargetMet(targetValue: number, actualValue: number): boolean {
  return actualValue >= targetValue;
}

/**
 * Calculate contract risk score (0-100, higher is riskier)
 */
export function calculateContractRiskScore(
  variancePercentage: number,
  qualityScore: number,
  monthsRemaining: number
): number {
  // Risk factors:
  // 1. Cost variance (40% weight)
  // 2. Quality performance (40% weight)
  // 3. Time remaining (20% weight)

  // Cost risk: negative variance increases risk
  const costRisk = variancePercentage < 0 ? Math.min(100, Math.abs(variancePercentage) * 5) : 0;

  // Quality risk: below 80% increases risk
  const qualityRisk = qualityScore < 80 ? (80 - qualityScore) * 2 : 0;

  // Time risk: fewer months remaining increases urgency
  const timeRisk = monthsRemaining < 3 ? (3 - monthsRemaining) * 20 : 0;

  const totalRisk = (costRisk * 0.4) + (qualityRisk * 0.4) + (timeRisk * 0.2);
  return Math.min(100, Math.max(0, totalRisk));
}

/**
 * Calculate provider performance score
 */
export function calculateProviderPerformanceScore(
  costPerPatient: number,
  averageCostPerPatient: number,
  qualityScore: number,
  readmissionRate: number,
  targetReadmissionRate: number = 15
): number {
  // Scoring factors:
  // 1. Cost efficiency (40% weight)
  // 2. Quality (40% weight)
  // 3. Readmission rate (20% weight)

  // Cost efficiency: compare to average
  const costEfficiencyScore = averageCostPerPatient > 0
    ? Math.max(0, 100 - ((costPerPatient / averageCostPerPatient - 1) * 100))
    : 50;

  // Quality score (already 0-100)
  const qualityScoreNormalized = qualityScore;

  // Readmission score
  const readmissionScore = readmissionRate <= targetReadmissionRate
    ? 100
    : Math.max(0, 100 - ((readmissionRate - targetReadmissionRate) * 5));

  const totalScore = (costEfficiencyScore * 0.4) + (qualityScoreNormalized * 0.4) + (readmissionScore * 0.2);
  return Math.min(100, Math.max(0, totalScore));
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format large currency (millions, billions)
 */
export function formatLargeCurrency(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(2)}B`;
  } else if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  } else if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format number with commas
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
