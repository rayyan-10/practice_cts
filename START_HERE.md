# 🚀 Quick Start Guide - ContractIQ VBC Analytics

## ✅ What's Ready

Your frontend application is **fully implemented** and ready to test with the FastAPI backend.

## 📋 Features Implemented

### 1️⃣ Authentication System
- **2 Roles**: PAYER (CMS) and ACO users
- **Simplified signup**: Choose role during registration
- **Auto-routing**: Login redirects to role-specific dashboard

### 2️⃣ Analysis Feature (CMS Portal)
- Multi-select analysis with years, ACOs, and analysis types
- Bulk selection with checkboxes
- Route: `/payer/analysis`

### 3️⃣ ML Predictions Integration
- **Complete API client** for all 5 backend models
- **Payer Interface**: Access to all 5 models
- **ACO Interface**: Access to models 1, 2, 3 (Model 5 restricted)
- **Beautiful visualizations** with color-coded results
- **Dynamic forms** with backend metadata

## 🎯 Testing Instructions

### Step 1: Start the Backend

```bash
# Navigate to your FastAPI backend directory
cd path/to/backend

# Start the server
uvicorn main:app --reload --port 8000
```

Verify: http://localhost:8000/docs

### Step 2: Start the Frontend

```bash
# In the DEMO_CTS directory
npm run dev
```

Open: http://localhost:5173

### Step 3: Test Payer Flow

1. **Signup** (if no account):
   - Go to `/signup`
   - Enter email and password
   - **Select "CMS/Payer User"** role
   - Click "Create Account"

2. **Login**:
   - Email: your_email@example.com
   - Auto-redirects to `/payer/dashboard`

3. **Navigate to Predictions**:
   - Click **"AI Predictions"** card on dashboard
   - Or go to `/payer/predictions`

4. **Test Each Model**:

   **Combined Assessment:**
   - Fill all 13 ACO features
   - Click "Run Prediction"
   - See risk classification + performance gap

   **Model 1 - Risk:**
   - Same 13 features
   - Get At_Risk or Savings prediction

   **Model 2 - Gap:**
   - Same 13 features
   - Get performance gap percentage

   **Model 3 - Twins:**
   - Enter ACO ID (e.g., "A1001")
   - Select year (optional)
   - Get 3 twin ACOs + comparison

   **Model 5 - Provider:**
   - Enter Provider NPI
   - Fill optional fields
   - Get High/Low risk classification

### Step 4: Test ACO Flow

1. **Logout** from Payer account

2. **Signup as ACO**:
   - Go to `/signup`
   - **Select "ACO User"** role
   - Create account

3. **Login** and test:
   - Auto-redirects to `/aco/dashboard`
   - Click **"AI Predictions"** card
   - Test Models 1, 2, 3
   - Verify Model 5 is **NOT shown** (only CMS/Payer)

## 📊 Sample Test Data

### For Models 1 & 2 (ACO Features)
```
N_AB: 14500
Previous_Savings_Rate: 0.045
Previous_Quality_Score: 88.5
Previous_Performance_Gap: -2.1
Expenditure_Growth: 3.2
Benchmark_Growth: 2.8
Quality_Change: 1.5
Beneficiary_Growth: 2.0
N_Hosp: 3
N_PCP: 180
N_Spec: 250
Rev_Exp_Cat: Low Revenue
Track: ENHANCED
```

### For Model 3 (Twin ACO)
```
ACO ID: A1001
Year: 2024
```

### For Model 5 (Provider Risk)
```
NPI: 1003006115
Provider Type: Internal Medicine
Tot_Benes: 500
Tot_Srvcs: 2000
```

## 🔍 What to Verify

### ✅ Authentication
- [ ] Signup with role selection works
- [ ] Login redirects to correct dashboard
- [ ] Logout works properly

### ✅ Payer Predictions
- [ ] All 5 models are accessible
- [ ] Forms populate dropdowns from backend
- [ ] Results display correctly
- [ ] Error messages show for invalid inputs
- [ ] Loading states appear during API calls

### ✅ ACO Predictions
- [ ] Models 1, 2, 3 are accessible
- [ ] Model 5 is NOT shown
- [ ] Info banner explains restriction
- [ ] Results display correctly

### ✅ Visualizations
- [ ] Risk indicators show correct colors
- [ ] Charts and graphs render
- [ ] Icons appear properly
- [ ] Responsive on different screen sizes

## 📁 Key Files

```
DEMO_CTS/
├── src/
│   ├── lib/
│   │   └── api.ts                    # API client (all 5 models)
│   ├── pages/
│   │   ├── payer/
│   │   │   └── PayerPrediction.tsx   # CMS predictions (5 models)
│   │   └── aco/
│   │       └── ACOPrediction.tsx     # ACO predictions (3 models)
│   └── App.tsx                       # Routes configured
└── .env                              # Backend URL configured
```

## 🐛 Troubleshooting

### Backend Connection Error
**Error**: "Failed to fetch" or connection refused

**Solution**:
1. Verify backend is running: `http://localhost:8000/health`
2. Check `.env` has: `VITE_API_URL=http://localhost:8000`
3. Restart frontend after changing `.env`

### CORS Error
**Error**: CORS policy blocking requests

**Solution**: Backend already has CORS middleware. Verify it allows origin `http://localhost:5173`

### 404 on Predictions Page
**Error**: Page not found

**Solution**:
1. Ensure you're logged in
2. Check you're using the correct URL for your role:
   - PAYER: `/payer/predictions`
   - ACO: `/aco/predictions`

### Model Returns Error
**Error**: Backend returns 500 or validation error

**Solution**:
1. Check backend console for error details
2. Verify all required fields are filled
3. Use valid ACO IDs from your dataset
4. Check sample data format matches backend expectations

## 📚 Documentation

- **Complete Integration Guide**: `BACKEND_INTEGRATION_GUIDE.md`
- **Backend Tasks**: `CONTRACTIQ_BACKEND_TASKS.md`
- **Integration Status**: `INTEGRATION_STATUS.md`
- **Completion Summary**: `BACKEND_INTEGRATION_COMPLETE.md`

## 🎉 You're Ready!

All frontend work is complete. Just start the backend and test away!

**Questions?** Check the documentation files above or review the code comments.

---

**Happy Testing! 🚀**
