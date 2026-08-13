# Financial Calculations Reference

This document explains the financial calculation methodologies used in the VBC/ACO Analytics Platform.

## Overview

The platform implements standard value-based care (VBC) financial reconciliation calculations based on Medicare Shared Savings Program (MSSP) and similar ACO program methodologies.

---

## Core Concepts

### Benchmark

The **benchmark** is the target expenditure amount against which actual performance is measured. It represents the expected cost of care for the attributed beneficiary population.

```
Benchmark = Historical Per-Capita Expenditure × Current Beneficiary Count × Trend Factor
```

In this demo, benchmarks are pre-calculated values stored in the contract.

### Actual Expenditure

The **actual expenditure** is the total healthcare spending for the ACO's attributed beneficiaries during the performance period.

```
Actual Expenditure = Sum of all Claims (Paid Amount)
```

### Variance

The **variance** is the difference between benchmark and actual expenditure.

```
Variance = Benchmark - Actual Expenditure
```

- **Positive variance**: Spending below benchmark (potential savings)
- **Negative variance**: Spending above benchmark (potential losses)

### Variance Percentage

```
Variance % = (Variance / Benchmark) × 100
```

Example:
- Benchmark: $100M
- Actual: $92M
- Variance: $8M
- Variance %: 8.0% below benchmark

---

## Shared Savings Calculation

### One-Sided Risk (Savings Only)

In one-sided risk arrangements, ACOs can earn shared savings but do not owe shared losses.

#### Requirements

1. **Minimum Savings Rate (MSR)**: Typically 2-4%
   - Variance must exceed MSR to earn any savings
   
2. **Quality Performance**: Must meet quality performance standards
   - Usually 70%+ of maximum quality score

#### Calculation

```typescript
if (variancePercentage >= minimumSavingsRate && qualityMet) {
  sharedSavings = variance × sharingRate
} else {
  sharedSavings = 0
}
```

#### Example

```
Benchmark:              $100,000,000
Actual Expenditure:     $92,000,000
Variance:               $8,000,000
Variance %:             8.0%
Minimum Savings Rate:   2.0%
Sharing Rate:           50%
Quality Performance:    ✓ Met

Calculation:
- Variance % (8.0%) > MSR (2.0%) ✓
- Quality standards met ✓
- Shared Savings = $8,000,000 × 50% = $4,000,000
```

### Two-Sided Risk (Savings and Losses)

In two-sided risk arrangements, ACOs can earn higher shared savings percentages but must also pay shared losses if spending exceeds benchmark.

#### Shared Savings (Same as One-Sided)

```typescript
if (variancePercentage >= minimumSavingsRate && qualityMet) {
  sharedSavings = variance × sharingRate
} else {
  sharedSavings = 0
}
```

#### Shared Losses

```typescript
if (variancePercentage <= -minimumLossRate) {
  sharedLoss = Math.abs(variance) × sharingRate
} else {
  sharedLoss = 0
}
```

#### Example: Savings Scenario

```
Benchmark:              $100,000,000
Actual Expenditure:     $92,000,000
Variance:               $8,000,000
Variance %:             8.0%
Minimum Savings Rate:   2.0%
Sharing Rate:           60% (higher for two-sided)
Quality Performance:    ✓ Met

Shared Savings = $8,000,000 × 60% = $4,800,000
```

#### Example: Loss Scenario

```
Benchmark:              $100,000,000
Actual Expenditure:     $105,000,000
Variance:               -$5,000,000
Variance %:             -5.0%
Minimum Loss Rate:      2.0%
Sharing Rate:           60%

Calculation:
- Variance % (-5.0%) exceeds MLR (-2.0%)
- Shared Loss = $5,000,000 × 60% = $3,000,000
- ACO owes $3,000,000 to payer
```

---

## Quality Performance

### Quality Score Calculation

Quality scores are typically calculated as a weighted average of multiple quality measures:

```typescript
qualityScore = Σ(measureScore × measureWeight) / Σ(measureWeights)
```

### Quality Withholds

Some programs withhold a percentage of shared savings based on quality performance:

```typescript
finalSharedSavings = calculatedSharedSavings × (1 - qualityWithholdRate) + qualityEarnings
```

Where:
```typescript
qualityEarnings = calculatedSharedSavings × qualityWithholdRate × qualityPerformanceRate
```

#### Example

```
Calculated Shared Savings:  $4,000,000
Quality Withhold Rate:      5%
Quality Performance:        90% of max

Withheld Amount:            $4,000,000 × 5% = $200,000
Quality Earnings:           $200,000 × 90% = $180,000
Final Shared Savings:       $3,800,000 + $180,000 = $3,980,000
```

---

## Cost Per Beneficiary Calculations

### Total Cost Per Beneficiary

```
Cost Per Beneficiary = Total Expenditure / Beneficiary Count
```

### Per Member Per Month (PMPM)

```
PMPM = Total Expenditure / (Beneficiary Count × Months)
```

### Risk-Adjusted Per Capita Cost

```
Risk-Adjusted Cost = Actual Cost / Average Risk Score
```

---

## Projection Calculations

### Year-End Expenditure Projection

Based on year-to-date performance:

```typescript
projectedAnnualExpenditure = (actualYTD / monthsElapsed) × 12
```

#### Example

```
Actual YTD (6 months):      $57,000,000
Months Elapsed:             6
Months in Year:             12

Projected Annual:           ($57,000,000 / 6) × 12 = $114,000,000
```

### Projected Savings/Loss

```typescript
projectedVariance = benchmark - projectedExpenditure
projectedSharedSavings = projectedVariance × sharingRate (if conditions met)
```

---

## Provider Performance Scoring

### Cost Efficiency Score

Compares provider's cost per patient against ACO average:

```typescript
costEfficiencyScore = 100 - ((providerCostPerPatient / acoCostPerPatient - 1) × 100)
```

#### Example

```
Provider Cost Per Patient:  $12,000
ACO Average Cost Per Patient: $9,000
Variance:                   33.3% above average

Cost Efficiency Score:      100 - 33.3 = 66.7
```

### Overall Provider Score

Weighted combination of multiple factors:

```typescript
providerScore = 
  (costEfficiencyScore × 0.40) +
  (qualityScore × 0.40) +
  (readmissionScore × 0.20)
```

---

## Risk Scoring

### Contract Risk Score

Measures likelihood of not meeting savings target:

```typescript
contractRiskScore = 
  (costRisk × 0.40) +
  (qualityRisk × 0.40) +
  (timeRisk × 0.20)

where:
  costRisk = variancePercentage < 0 ? Math.min(100, Math.abs(variancePercentage) × 5) : 0
  qualityRisk = qualityScore < 80 ? (80 - qualityScore) × 2 : 0
  timeRisk = monthsRemaining < 3 ? (3 - monthsRemaining) × 20 : 0
```

### Risk Levels

- **LOW**: Risk Score 0-25
- **MEDIUM**: Risk Score 26-50
- **HIGH**: Risk Score 51-75
- **CRITICAL**: Risk Score 76-100

---

## Implementation Examples

### TypeScript Implementation

See `src/lib/calculations/financial.ts` for complete implementations:

```typescript
import { calculateSharedSavings } from '@/lib/calculations/financial';

const result = calculateSharedSavings(
  100000000,  // benchmark
  92000000,   // actualExpenditure
  0.50,       // sharingRate (50%)
  0.02        // minimumSavingsRate (2%)
);

console.log(result);
// {
//   benchmark: 100000000,
//   actualExpenditure: 92000000,
//   variance: 8000000,
//   variancePercentage: 8.0,
//   minimumSavingsRate: 0.02,
//   sharingRate: 0.50,
//   potentialSavings: 8000000,
//   sharedSavings: 4000000,
//   meetsMinimum: true
// }
```

---

## Important Considerations

### Data Completeness

- Claims data must be complete (run-out period)
- Beneficiary attribution must be finalized
- All adjustments applied (risk adjustment, sequestration, etc.)

### Truncation and Caps

Real MSSP programs include:
- **High-cost case truncation**: Very high-cost patients may be capped
- **Negative expenditure corrections**: Certain adjustments for quality
- **Caps on losses**: Maximum shared loss amounts

These are not fully implemented in this demo.

### Quality Requirements

- Minimum quality score requirements (typically 30-40%)
- Pay-for-performance quality incentives
- Quality withhold arrangements

### Regulatory Compliance

Real implementations must follow:
- CMS MSSP regulations
- Program-specific financial methodologies
- Annual regulatory updates

---

## Testing Calculations

### Unit Tests Example

```typescript
describe('calculateSharedSavings', () => {
  it('should calculate savings when variance exceeds MSR', () => {
    const result = calculateSharedSavings(
      100000000, // benchmark
      92000000,  // actual
      0.50,      // 50% sharing
      0.02       // 2% MSR
    );
    
    expect(result.sharedSavings).toBe(4000000);
    expect(result.meetsMinimum).toBe(true);
  });
  
  it('should return zero savings when below MSR', () => {
    const result = calculateSharedSavings(
      100000000, // benchmark
      99000000,  // actual (only 1% savings)
      0.50,
      0.02       // 2% MSR not met
    );
    
    expect(result.sharedSavings).toBe(0);
    expect(result.meetsMinimum).toBe(false);
  });
});
```

---

## References

- [CMS MSSP Shared Savings Program](https://www.cms.gov/medicare/payment/fee-for-service-providers/shared-savings-program)
- [MSSP Financial Methodology](https://www.cms.gov/files/document/medicare-shared-savings-program-financial-benchmarking-methodology.pdf)
- Healthcare Financial Management Association (HFMA) resources

---

## Disclaimer

These calculations are simplified for demonstration purposes. Production implementations must:

1. Follow official program specifications exactly
2. Include all regulatory adjustments
3. Handle edge cases (negative expenditures, etc.)
4. Be validated against official CMS reconciliation
5. Be audited by qualified healthcare finance professionals

This demo does not constitute financial or regulatory advice.
