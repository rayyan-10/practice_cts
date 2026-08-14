# Backend Integration Guide - ContractIQ

## Overview

This guide explains how the frontend VBC Analytics platform integrates with your FastAPI backend for ML-powered predictions.

## Architecture

```
Frontend (React + TypeScript)
       ↓
API Client (src/lib/api.ts)
       ↓
FastAPI Backend (http://localhost:8000)
       ↓
ML Models (joblib files)
```

## Files Created/Modified

### New Files
1. **`src/lib/api.ts`** - Complete API client with TypeScript types
2. **`src/pages/payer/PayerPrediction.tsx`** - Main prediction interface
3. **`.env`** - Added `VITE_API_URL=http://localhost:8000`

### Modified Files
1. **`src/App.tsx`** - Added `/payer/predictions` route
2. **`src/pages/payer/PayerDashboard.tsx`** - Updated links to predictions page

## Setup Instructions

### 1. Start FastAPI Backend

```bash
# Navigate to your backend directory
cd path/to/backend

# Install dependencies (if not already done)
pip install fastapi uvicorn joblib pandas numpy scikit-learn xgboost

# Start the server
uvicorn main:app --reload --port 8000
```

### 2. Verify Backend is Running

Open: **http://localhost:8000/docs**

You should see the FastAPI Swagger documentation with all endpoints.

### 3. Start Frontend

```bash
# In the DEMO_CTS directory
npm run dev
```

Open: **http://localhost:5173**

## Using the Predictions Feature

### Access

1. Login as **PAYER** user
2. On dashboard, click **"AI Predictions"** card
3. Or navigate to: `/payer/predictions`

### Available Models

#### **Combined Assessment** (Model 1 + 2)
- **Endpoint**: `POST /aco/assess`
- **Input**: 13 ACO features
- **Output**: Risk classification + Performance gap
- **Use Case**: Complete ACO health assessment

#### **Model 1 - Risk Classification**
- **Endpoint**: `POST /model1/predict`
- **Input**: 13 ACO features
- **Output**: At_Risk or Savings prediction with probabilities
- **Use Case**: Binary risk prediction

#### **Model 2 - Performance Gap**
- **Endpoint**: `POST /model2/predict`
- **Input**: 13 ACO features
- **Output**: Predicted performance gap percentage
- **Use Case**: Exact spending variance prediction

#### **Model 3 - Twin ACO Benchmarking**
- **Endpoint**: `GET /model3/twins/{aco_id}` or `POST /model3/twins`
- **Input**: ACO ID + optional year
- **Output**: 3 twin ACOs + performance comparison
- **Use Case**: Peer benchmarking

#### **Model 5 - Provider Risk** (CMS/Payer only)
- **Endpoint**: `POST /model5/provider-risk`
- **Input**: Provider NPI + utilization data
- **Output**: High Risk / Low Risk classification
- **Use Case**: Provider-level risk screening

## API Integration Details

### API Client (`src/lib/api.ts`)

The API client provides typed methods for all endpoints:

```typescript
import { api } from '@/lib/api';

// Combined Assessment
const result = await api.acoAssess(acoFeatures);

// Model 3 Twin Lookup
const twins = await api.model3TwinsGet('A1001', 2024);

// Provider Risk
const risk = await api.model5ProviderRisk(providerData);

// Metadata
const tracks = await api.getTracks();
```

### Request/Response Flow

1. **User fills form** → Form state updated
2. **Click "Run Prediction"** → `handleRunPrediction()` called
3. **Loading state** → Shows spinner, disables button
4. **API call** → `api.{modelMethod}()` sends request to backend
5. **Backend processes** → ML model inference
6. **Response received** → Results stored in state
7. **Results rendered** → Beautiful visualizations displayed

### Error Handling

The API client handles:
- Network errors
- HTTP errors (404, 500, etc.)
- JSON parsing errors
- Timeout errors

Errors are displayed to users in a friendly format:

```typescript
try {
  const result = await api.acoAssess(features);
  setCombinedResult(result);
} catch (err: any) {
  setError(err.message || 'Failed to get prediction');
}
```

## Input Form Features

### ACO Features Form (Models 1 & 2)

**13 Required Fields:**
1. N_AB - Assigned Beneficiaries
2. Previous_Savings_Rate (0-1 decimal)
3. Previous_Quality_Score (0-100)
4. Previous_Performance_Gap (%)
5. Expenditure_Growth (%)
6. Benchmark_Growth (%)
7. Quality_Change
8. Beneficiary_Growth (%)
9. N_Hosp - Number of Hospitals
10. N_PCP - Primary Care Physicians
11. N_Spec - Specialists
12. Rev_Exp_Cat - Dropdown (High/Low Revenue)
13. Track - Dropdown (BASIC/ENHANCED/One-Sided/Two-Sided)

**Dropdowns populated from backend:**
- Rev_Exp_Cat: `GET /meta/rev-exp-categories`
- Track: `GET /meta/tracks`

### Model 3 Form

- **ACO ID**: Text input (e.g., "A1001")
- **Year**: Dropdown populated from `GET /meta/model3/available-years`

### Model 5 Form

- **Provider NPI**: Required text input
- **Provider Type**: Dropdown from `GET /meta/provider-types`
- **State**: Text input (2-letter code)
- **Financial Fields**: Tot_Benes, Tot_Srvcs, charges, payments, etc.
- **All optional except NPI** - backend imputes missing values

## Results Visualization

### Combined Assessment Display

**Risk Classification Card:**
- Large prediction label (At_Risk / Savings)
- Icon indicator (X for At_Risk, ✓ for Savings)
- Two probability bars (At Risk % / Savings %)
- Color coding (red for At_Risk, green for Savings)

**Performance Gap Card:**
- Large gap percentage with +/- sign
- Direction indicator (Savings / Overspend)
- Trend arrow (↓ for savings, ↑ for overspend)
- Interpretation summary

### Model 3 Twin ACO Display

- Selected ACO info box
- 3 twin ACO cards (best twin highlighted with ⭐)
- Performance metrics comparison table:
  - Your ACO value vs Peer Average
  - Verdict badges (Better/Worse/Similar)
  - Color-coded by verdict

### Model 5 Provider Risk Display

- Large risk emoji (🔴 for High Risk, 🟢 for Low Risk)
- Provider NPI display
- Risk status badge
- Risk probability percentage
- Disclaimer message

## Testing with Sample Data

### Test Model 1 & 2 (Combined)

```json
{
  "N_AB": 14500,
  "Previous_Savings_Rate": 0.045,
  "Previous_Quality_Score": 88.5,
  "Previous_Performance_Gap": -2.1,
  "Expenditure_Growth": 3.2,
  "Benchmark_Growth": 2.8,
  "Quality_Change": 1.5,
  "Beneficiary_Growth": 2.0,
  "N_Hosp": 3,
  "N_PCP": 180,
  "N_Spec": 250,
  "Rev_Exp_Cat": "Low Revenue",
  "Track": "ENHANCED"
}
```

**Expected**: At_Risk prediction ~65%, Performance Gap ~-3.21%

### Test Model 3

- **ACO ID**: A1001
- **Year**: 2024

**Expected**: Returns 3 twin ACOs with metrics comparison

### Test Model 5

```json
{
  "Rndrng_NPI": "1003006115",
  "Rndrng_Prvdr_Type": "Internal Medicine",
  "Tot_Benes": 500,
  "Tot_Srvcs": 2000,
  "Tot_Sbmtd_Chrg": 250000,
  "Tot_Mdcr_Pymt_Amt": 68000,
  "Tot_Mdcr_Stdzd_Amt": 67500,
  "Bene_Avg_Risk_Scre": 1.85
}
```

**Expected**: High Risk status with ~99.6% probability

## Troubleshooting

### Backend Not Running

**Error**: `Failed to fetch` or connection errors

**Solution**:
1. Verify backend is running: `http://localhost:8000/health`
2. Check port 8000 is not blocked
3. Ensure CORS is enabled in FastAPI

### CORS Issues

**Error**: CORS policy blocking requests

**Solution**: Backend already has CORS middleware configured:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

For production, replace `["*"]` with `["http://localhost:5173"]`

### 404 Errors

**Error**: `ACO 'XXXX' not found`

**Solution**: Use valid ACO IDs from your dataset. Check available IDs:

```bash
# In your backend, check the twin dataset
python
>>> import joblib
>>> model3 = joblib.load('models/model3_twin_aco_updated.joblib')
>>> print(model3._twin_df['ACO_ID'].unique())
```

### Validation Errors

**Error**: Missing required fields

**Solution**: Ensure all 13 ACO features are filled. Check console for details.

### Model Loading Errors

**Error**: 500 Internal Server Error from backend

**Solution**:
1. Check backend console for model loading errors
2. Verify all `.joblib` files are in correct paths
3. Ensure `twin_aco_model.py` is importable

## Production Deployment

### Environment Variables

Update `.env` for production:

```env
VITE_API_URL=https://your-api-domain.com
```

### Backend Configuration

Update FastAPI CORS:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Build Frontend

```bash
npm run build
```

Deploy the `dist/` folder to your hosting service.

## API Rate Limiting

Currently no rate limiting is implemented. For production, consider:

1. **Backend rate limiting** using FastAPI middleware
2. **Frontend request throttling** for batch operations
3. **Caching** for metadata endpoints

## Future Enhancements

### Potential Features

1. **Batch Processing**
   - Upload CSV of ACOs
   - Get predictions for all at once
   - Export results to CSV/PDF

2. **Historical Predictions**
   - Save prediction results
   - Track prediction accuracy over time
   - Compare predicted vs actual outcomes

3. **Real-time Updates**
   - WebSocket connection for long-running predictions
   - Progress indicators for batch operations

4. **Advanced Filtering**
   - Filter ACOs by region, track, size
   - Pre-fill forms with historical data
   - Smart defaults based on ACO profile

5. **Visualization Enhancements**
   - Interactive charts using Recharts
   - Trend analysis over multiple years
   - What-if scenario modeling

## Support

### Documentation
- FastAPI Docs: http://localhost:8000/docs
- Backend Tasks: `CONTRACTIQ_BACKEND_TASKS.md`
- This Guide: `BACKEND_INTEGRATION_GUIDE.md`

### Testing Endpoints

Use Postman, curl, or the FastAPI Swagger UI to test endpoints independently.

**Example with curl:**

```bash
curl -X POST http://localhost:8000/model1/predict \
  -H "Content-Type: application/json" \
  -d @sample_data.json
```

## Summary

The frontend is now fully integrated with your FastAPI backend:

✅ Complete API client with TypeScript types  
✅ Comprehensive prediction interface  
✅ Beautiful result visualizations  
✅ Error handling and loading states  
✅ Metadata fetching for dropdowns  
✅ All 5 models accessible  
✅ PAYER-only Model 5 access  
✅ Responsive and accessible UI  

**Next Steps:**
1. Start both backend and frontend
2. Test each model with sample data
3. Verify results match expectations
4. Customize visualizations as needed
