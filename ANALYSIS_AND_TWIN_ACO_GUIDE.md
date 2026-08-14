# Analysis Page & Twin ACO Feature Guide

## 1. Analysis Page Integration

### Current State
The Analysis page (`/payer/analysis`) currently shows **mock data**. It doesn't send requests to your backend yet.

### What It Does
Allows CMS users to:
- Select multiple **years** (2016-2026)
- Select multiple **ACOs**
- Select multiple **analysis types**:
  - Future Risks → Model 1 (Risk Classification)
  - Performance → Model 2 (Performance Gap)
  - Twin ACOs → Model 3 (Twin ACO Benchmarking)
  - Risks → Model 1 (current risk assessment)
  - Improvement → Combined analysis

### How to Connect to Backend

#### Analysis Type Mapping:

| Frontend Selection | Backend Endpoint | Model | What It Does |
|-------------------|------------------|-------|--------------|
| Future Risks | `/model1/predict` | Model 1 | Predicts if ACO will be At_Risk or achieve Savings |
| Performance | `/model2/predict` | Model 2 | Predicts performance gap percentage |
| Twin ACOs | `/model3/twins/{aco_id}` | Model 3 | Finds 3 similar ACOs and compares performance |
| Risks | `/model1/predict` | Model 1 | Same as Future Risks (current assessment) |
| Improvement | `/aco/assess` | Models 1+2 | Combined risk + gap analysis |

#### Implementation Steps:

**Step 1: For each selected ACO and year, call the appropriate endpoints**

```typescript
// Example for "Future Risks" analysis
for (const acoId of selectedACOs) {
  for (const year of selectedYears) {
    // Get ACO features from your database for this ACO + year
    const acoFeatures = await getACOFeatures(acoId, year);
    
    // Call Model 1
    const response = await api.model1Predict(acoFeatures);
    
    // Store results
    results.push({
      aco: acoId,
      year: year,
      prediction: response.prediction,
      probability: response.probability_at_risk
    });
  }
}
```

**Step 2: For "Twin ACOs" analysis**

```typescript
// For each selected ACO
for (const acoId of selectedACOs) {
  for (const year of selectedYears) {
    // Call Model 3
    const response = await api.model3TwinsGet(acoId, year);
    
    // Store results
    results.push({
      aco: acoId,
      year: year,
      twins: response.twins,
      bestTwin: response.best_twin,
      metrics: response.metrics
    });
  }
}
```

**Step 3: Display aggregated results**

The current mock results show how to display each analysis type. You just need to replace mock data with real API responses.

### Data Source Challenge

**Problem**: Your backend models need **13 ACO features** as input, but the Analysis page only has ACO IDs and years.

**Solutions**:

**Option A**: Store ACO historical data in Supabase
```sql
CREATE TABLE aco_historical_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aco_id VARCHAR NOT NULL,
  year INTEGER NOT NULL,
  n_ab FLOAT,
  previous_savings_rate FLOAT,
  previous_quality_score FLOAT,
  -- ... all 13 features
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(aco_id, year)
);
```

Then fetch features before calling API:
```typescript
const features = await supabase
  .from('aco_historical_features')
  .select('*')
  .eq('aco_id', acoId)
  .eq('year', year)
  .single();

const prediction = await api.model1Predict({
  N_AB: features.n_ab,
  Previous_Savings_Rate: features.previous_savings_rate,
  // ... map all fields
});
```

**Option B**: Use default/average values
```typescript
// Use industry averages when historical data not available
const defaultFeatures = {
  N_AB: 14500,
  Previous_Savings_Rate: 0.045,
  Previous_Quality_Score: 88.5,
  // ... other defaults
};
```

**Option C**: Create a backend batch endpoint
```python
# In your FastAPI backend
@app.post("/analysis/batch")
def batch_analysis(
    aco_ids: list[str],
    years: list[int],
    analysis_types: list[str]
):
    # Backend fetches ACO features from its own database
    # Runs all requested analyses
    # Returns aggregated results
    pass
```

This is the **cleanest approach** - frontend sends simple request, backend handles complexity.

---

## 2. Twin ACO Feature Explained

### What is Twin ACO (Model 3)?

**Concept**: Find ACOs that are **structurally similar** to a target ACO and compare their performance.

### How It Works

**Input**:
- `aco_id`: The ACO you want to analyze (e.g., "A1001")
- `year`: Optional performance year (defaults to most recent)

**Process**:
1. Model finds 3 ACOs that are most similar in structure:
   - Similar number of beneficiaries
   - Similar number of providers
   - Similar geographic/demographic profile
   - Similar track (BASIC/ENHANCED)
2. Compares performance metrics between your ACO and its "twins"
3. Identifies which twin performed best
4. Shows where your ACO is better/worse than peers

**Output**:
```json
{
  "selected_aco": "A1001",
  "performance_year": 2024,
  "twins": ["A1023", "A1045", "A1067"],
  "best_twin": "A1045",
  "metrics": [
    {
      "metric": "Savings Rate",
      "selected_value": 4.2,
      "peer_average": 5.1,
      "verdict": "Worse"
    },
    {
      "metric": "Quality Score",
      "selected_value": 91.5,
      "peer_average": 88.3,
      "verdict": "Better"
    }
  ]
}
```

### Frontend Implementation

**Current UI** (in `/payer/predictions` and `/aco/predictions`):

```typescript
// User inputs
const [model3Input, setModel3Input] = useState({
  aco_id: 'A1001',  // ACO identifier
  year: 2024        // Optional year
});

// Call API
const result = await api.model3TwinsGet(model3Input.aco_id, model3Input.year);

// Display results
// - Show the 3 twin ACOs
// - Highlight best twin
// - Display metric comparisons with color-coded verdicts
```

**What to display**:

1. **Selected ACO Info Box**:
   - ACO ID: A1001
   - Performance Year: 2024

2. **Twin ACOs** (3 cards):
   - Twin 1: A1023
   - Twin 2: A1045 ⭐ (Best Twin)
   - Twin 3: A1067

3. **Performance Comparison Table**:
   | Metric | Your ACO | Peer Average | Verdict |
   |--------|----------|--------------|---------|
   | Savings Rate | 4.2% | 5.1% | 🔴 Worse |
   | Quality Score | 91.5 | 88.3 | 🟢 Better |
   | Beneficiary Satisfaction | 87.0 | 85.2 | 🟢 Better |

### Use Cases

**For CMS/Payers**:
- "Which ACOs are similar to this high-performing ACO?"
- "Is this ACO underperforming compared to similar peers?"
- "Should we adjust benchmarks based on peer comparison?"

**For ACOs**:
- "Which other ACOs are like us?"
- "What are similar ACOs doing better?"
- "Are we competitive within our peer group?"

### Input Requirements

**Minimum Required**:
- `aco_id`: String identifier (e.g., "A1001")

**Optional**:
- `year`: Integer (e.g., 2024)
  - If not provided, uses most recent data
  - If provided, looks up historical data for that year

**Frontend Form**:
```tsx
<div>
  <Label>ACO ID</Label>
  <Input
    value={model3Input.aco_id}
    onChange={(e) => setModel3Input({...model3Input, aco_id: e.target.value})}
    placeholder="e.g. A1001"
  />
</div>

<div>
  <Label>Year (Optional)</Label>
  <select
    value={model3Input.year || ''}
    onChange={(e) => setModel3Input({...model3Input, year: Number(e.target.value)})}
  >
    <option value="">Latest</option>
    {availableYears.map(year => (
      <option key={year} value={year}>{year}</option>
    ))}
  </select>
</div>
```

### Data Visualization

**Display Components**:

1. **Header Card** - Shows selected ACO and year
2. **Twin ACO Cards** - 3 cards with twin IDs, best one highlighted
3. **Metrics Comparison** - Table/cards showing:
   - Metric name
   - Your ACO's value
   - Peer average
   - Verdict badge (Better/Worse/Similar)

**Color Coding**:
- 🟢 Green: Better than peers
- 🔴 Red: Worse than peers
- 🟡 Yellow: Similar to peers

---

## Quick Implementation Checklist

### For Analysis Page:

- [ ] Create ACO historical features table in Supabase
- [ ] OR create backend batch analysis endpoint
- [ ] Update `handleViewAnalysis()` to call real APIs
- [ ] Map selected analysis types to correct endpoints
- [ ] Replace mock results with real API responses
- [ ] Add error handling for failed API calls
- [ ] Add loading states per analysis type

### For Twin ACO:

- [x] UI already implemented in predictions pages
- [ ] Verify ACO IDs in your dataset match expected format
- [ ] Test with valid ACO IDs from your backend
- [ ] Handle 404 errors when ACO not found
- [ ] Display "No data for selected year" when year unavailable

---

## Example: Complete Analysis Integration

```typescript
// In PayerAnalysis.tsx - handleViewAnalysis()

const handleViewAnalysis = async () => {
  setLoading(true);
  const results: AnalysisResult[] = [];

  try {
    // For each ACO + Year combination
    for (const acoId of selectedACOs) {
      for (const year of selectedYears) {
        // Fetch ACO features (from Supabase or use defaults)
        const features = await getACOFeatures(acoId, year);

        // Future Risks analysis
        if (selectedAnalysisTypes.includes('future-risks')) {
          const risk = await api.model1Predict(features);
          results.push({
            type: 'future-risks',
            aco: acoId,
            year: year,
            data: risk
          });
        }

        // Performance analysis
        if (selectedAnalysisTypes.includes('performance')) {
          const gap = await api.model2Predict(features);
          results.push({
            type: 'performance',
            aco: acoId,
            year: year,
            data: gap
          });
        }

        // Twin ACOs analysis
        if (selectedAnalysisTypes.includes('twin-acos')) {
          const twins = await api.model3TwinsGet(acoId, year);
          results.push({
            type: 'twin-acos',
            aco: acoId,
            year: year,
            data: twins
          });
        }
      }
    }

    // Aggregate results by type
    const aggregated = aggregateResults(results);
    setAnalysisResults(aggregated);
    setShowResults(true);

  } catch (error) {
    console.error('Analysis failed:', error);
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

---

## Summary

**Analysis Page**:
- Connects to Models 1, 2, 3 based on selected analysis types
- Needs ACO historical features as input
- Best implemented with batch backend endpoint

**Twin ACO (Model 3)**:
- Finds 3 similar ACOs
- Compares performance metrics
- Input: ACO ID + optional year
- Output: Twin IDs + metric comparisons with verdicts
- Already has UI in prediction pages
- Just needs valid ACO IDs to test

Both features are frontend-ready, just need backend data integration!
