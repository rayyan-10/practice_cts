# ContractIQ — Backend Developer Task Guide

> **Target Audience:** Backend Developers  
> **Document Purpose:** Clear, practical reference detailing backend API endpoints, database requirements, feature calculations, and ML model connections.

---

## Data Verification & Mathematical Readiness

> [!NOTE]  
> **Dataset Verification Result:** **VERIFIED & PASSED**  
> All primary datasets (`MSSP_Synthetic_Classification_V4`, `MSSP_Synthetic_Regression_V4`, `MSSP_Synthetic_TwinACO_V5`, `MSSP_Provider_Risk_FINAL`) contain all raw fields and pre-calculated features required for the mathematical calculations detailed below.

| Model / Dataset | Calculations Supported | Required Underlying Columns Present |
|---|---|---|
| **Model 1 & Model 2** (`MSSP_Synthetic_Classification_V4`, `MSSP_Synthetic_Regression_V4`) | `Expenditure_Growth`, `Benchmark_Growth`, `Quality_Change`, `Beneficiary_Growth`, `Previous_Performance_Gap` | `N_AB`, `Previous_Savings_Rate`, `Previous_Quality_Score`, `Previous_Performance_Gap`, `Expenditure_Growth`, `Benchmark_Growth`, `Quality_Change`, `Beneficiary_Growth`, `N_Hosp`, `N_PCP`, `N_Spec`, `Rev_Exp_Cat`, `Track` |
| **Model 3** (`MSSP_Synthetic_TwinACO_V5`) | Twin Lookup, Savings Rate Comparison, Quality Score Comparison, Peer Difference | `ACO_ID`, `Performance_Year`, `Cluster`, `Twin_ACO_1`, `Twin_ACO_2`, `Twin_ACO_3`, `Sav_rate`, `QualScore` |
| **Model 5** (`MSSP_Provider_Risk_FINAL`) | `Srvcs_Per_Bene`, `Charge_To_Pymt_Ratio`, `Pymt_Per_Bene` | `Tot_Srvcs`, `Tot_Benes`, `Tot_Sbmtd_Chrg`, `Tot_Mdcr_Pymt_Amt`, `Tot_Mdcr_Stdzd_Amt`, `Rndrng_NPI` |

---

## SECTION 1 — PROJECT FLOW

```
Frontend Request
       ↓
Backend API Endpoint
       ↓
Database / CMS Historical Data Retrieval
       ↓
Feature Preparation & Derived Calculations
       ↓
Call ML Model (.joblib)
       ↓
Format Result JSON
       ↓
Frontend Response
```

**In 3 Simple Steps:**
1. The frontend sends basic selection parameters (such as `ACO_ID`, `Year`, or Provider `NPI`).
2. The backend retrieves stored historical/current data from the database, computes required growth/ratio features, and passes them to the ML model.
3. The ML model returns predictions, which the backend formats into a clean JSON response for the frontend UI.

---

## SECTION 2 — FOUR ML ANALYSES

### MODEL 1 — ACO RISK ANALYSIS

| Field | Detail |
|---|---|
| **Analysis Name** | ACO At-Risk Prediction |
| **Goal** | Predict whether an ACO is likely to be **At_Risk** (financial loss) or achieve **Savings** next year. |
| **Frontend Input** | `ACO_ID` (string), `Performance_Year` (integer) |
| **Backend Retrieves** | Current and previous year expenditure, benchmark, quality scores, beneficiary counts, provider counts, revenue category, and track. |
| **Backend Calculates** | 5 derived growth/change features (see formulas below). |
| **Model Input** | 13 features (JSON object / dictionary) |
| **Model Output** | `prediction` ("At_Risk" / "Savings"), `probability_at_risk` (0.0% to 100.0%) |

#### Backend Calculations for Model 1:
```python
Expenditure_Growth = ((Current_Expenditure - Previous_Expenditure) / Previous_Expenditure) * 100
Benchmark_Growth   = ((Current_Benchmark - Previous_Benchmark) / Previous_Benchmark) * 100
Quality_Change     = Current_Quality_Score - Previous_Quality_Score
Beneficiary_Growth = ((Current_Beneficiaries - Previous_Beneficiaries) / Previous_Beneficiaries) * 100

# If Previous_Performance_Gap is not directly stored in DB:
Previous_Performance_Gap = ((Previous_Expenditure - Previous_Benchmark) / Previous_Benchmark) * 100
```
> ⚠️ **Note:** The frontend should **NOT** ask users to manually calculate or type historical values. The backend auto-prepares all 13 features using database records.

#### Example Call:
- **User selects:** ACO `A1001`, Year `2024`
- **Model Output:** `{"prediction": "At_Risk", "probability_at_risk": 72.4}`

---

### MODEL 2 — PERFORMANCE GAP ANALYSIS

| Field | Detail |
|---|---|
| **Analysis Name** | ACO Performance Gap Forecasting |
| **Goal** | Predict the exact future spending gap % relative to the benchmark. |
| **Frontend Input** | `ACO_ID` (string), `Performance_Year` (integer) |
| **Backend Retrieves** | Same historical/current ACO data as Model 1. |
| **Backend Calculates** | Same 5 derived growth/change features as Model 1. |
| **Model Input** | **Same 13 features** as Model 1 (`N_AB`, `Previous_Savings_Rate`, `Previous_Quality_Score`, `Previous_Performance_Gap`, `Expenditure_Growth`, `Benchmark_Growth`, `Quality_Change`, `Beneficiary_Growth`, `N_Hosp`, `N_PCP`, `N_Spec`, `Rev_Exp_Cat`, `Track`) |
| **Model Output** | `predicted_performance_gap_pct` (float, e.g. `-3.21%`) |

#### Example Call:
- **User selects:** ACO `A1001`, Year `2024`
- **Model Output:** `{"predicted_performance_gap_pct": -3.21}`  
  *(Negative % means spending below benchmark [good]; Positive % means spending above benchmark [concerning]).*

---

### MODEL 3 — TWIN ACO ANALYSIS

| Field | Detail |
|---|---|
| **Analysis Name** | Structural Peer & Twin ACO Comparison |
| **Goal** | Find 3 structurally similar ACO peers, compare Savings Rate & Quality Score, and identify the best-performing twin. |
| **Frontend Input** | `ACO_ID` (string), `Performance_Year` (integer) |
| **Backend Retrieves** | Model 3 output containing pre-calculated twins and performance data for selected ACO & peers. |
| **Backend Calculates** | Difference between target ACO metrics and peer average; determines verdict (`Better`, `Worse`, `Similar`). |
| **Model Input** | `ACO_ID`, `Performance_Year` |
| **Model Output** | 3 Twin ACO IDs, Savings Rate comparison, Quality Score comparison, metric verdicts, best twin ID. |

#### Example Output Format:
```json
{
  "selected_aco": "A1001",
  "twins": ["A3250", "A4527", "A3834"],
  "metrics": [
    {
      "metric": "Savings Rate",
      "selected_value": 0.0889,
      "peer_average": 0.0629,
      "verdict": "Better"
    },
    {
      "metric": "Quality Score",
      "selected_value": 77.05,
      "peer_average": 81.78,
      "verdict": "Worse"
    }
  ],
  "best_twin": "A4527"
}
```
> 💡 **Note:** Model 3 handles both twin identification and performance comparison. Do **NOT** create a separate comparison service.

---

### MODEL 5 — PROVIDER RISK ANALYSIS

| Field | Detail |
|---|---|
| **Analysis Name** | Individual Provider Risk & Billing Utilization Analysis |
| **Goal** | Identify whether an individual healthcare provider (NPI) exhibits high-risk billing or utilization patterns. |
| **Frontend Input** | `ACO_ID` (string), Provider `NPI` (string), `Year` (optional) |
| **Backend Retrieves** | Provider CMS dataset record matching the selected NPI. |
| **Backend Calculates** | 3 key financial & utilization ratios (see formulas below). |
| **Model Input** | `Rndrng_NPI` + 39 provider utilization, demographic, financial, and chronic condition features. |
| **Model Output** | `risk_probability_pct` (0.0% to 100.0%), `risk_status` ("High Risk" / "Low Risk"), `message`, and legal disclaimer. |

#### Backend Calculations for Model 5:
```python
Srvcs_Per_Bene       = Tot_Srvcs / Tot_Benes
Charge_To_Pymt_Ratio = Tot_Sbmtd_Chrg / Tot_Mdcr_Pymt_Amt
Pymt_Per_Bene        = Tot_Mdcr_Stdzd_Amt / Tot_Benes
```

#### Example Output:
```json
{
  "npi": "1003006115",
  "risk_probability_pct": 99.6,
  "risk_status": "High Risk",
  "emoji": "🔴",
  "message": "This provider is identified as potentially high risk.",
  "disclaimer": "High Risk indicates anomalous utilization/billing patterns and is not a formal CMS audit or legal finding."
}
```
> 📌 **Important Scope Rule:** Model 5 operates strictly at the **individual provider/NPI level**. `ACO_ID` is used by the backend to filter available providers for the user, not as an input feature into Model 5.

---

## SECTION 3 — ACO ↔ PROVIDER MAPPING

The backend must maintain the relationship linking ACOs to their participating providers:

```
ACO_ID  ──→  Provider / NPI
```

**Example Data Mapping:**
- `A1001` ──→ `NPI1003006115` (Dr. Smith)
- `A1001` ──→ `NPI1003000480` (Dr. Johnson)
- `A1002` ──→ `NPI1003000480` (Dr. Johnson — *Note: Providers can belong to multiple ACOs*)

### Frontend-to-Model Flow:
```
User selects ACO (e.g. A1001)
       ↓
Backend queries linked NPIs for A1001
       ↓
User picks Provider NPI
       ↓
Backend retrieves provider CMS record
       ↓
Backend calculates ratios & calls Model 5
       ↓
Model 5 result returned to UI
```

---

## SECTION 4 — BASIC DATABASE TASKS

The backend database must store and serve the following core tables:

1. **ACO Master Table:** `ACO_ID`, `ACO_Name`, `Track`, `Rev_Exp_Cat`, `Primary_State`.
2. **ACO Annual Performance Table:** `ACO_ID`, `Performance_Year`, `Expenditure`, `Benchmark`, `Quality_Score`, `Beneficiaries_Count`, `N_Hosp`, `N_PCP`, `N_Spec`.
3. **Provider Master Table:** `NPI`, `Provider_Type`, `State`, `Tot_Benes`, `Tot_Srvcs`, `Tot_Sbmtd_Chrg`, `Tot_Mdcr_Pymt_Amt`, `Tot_Mdcr_Stdzd_Amt`, chronic condition percentages.
4. **ACO ↔ Provider Mapping Table:** `ACO_ID`, `NPI`, `Year`.

### Core Database Operations Required:
- Retrieve historical data for a specific ACO and Year.
- Insert / Update current-year ACO metrics entered by ACO users.
- Retrieve previous-year baseline metrics for growth calculations.
- Query providers belonging to a selected ACO.

---

## SECTION 5 — CURRENT-YEAR ACO DATA

```
ACO User
   ↓
Enters/Updates Current-Year Metrics (e.g., 2025 Expenditure, Benchmark, Quality)
   ↓
Backend Input Validation
   ↓
Stores Record under ACO_ID + Year in DB
   ↓
┌───────────────────────────────────────┬────────────────────────────────────────┐
│  ACO User Analyzes Own Current Data   │  CMS Admin Views/Analyzes All ACO Data  │
└───────────────────────────────────────┴────────────────────────────────────────┘
```

> 🔐 **Tenant Isolation:** Ensure strict query filtering (`WHERE ACO_ID = :user_aco_id`). ACO 1 users must never view or edit ACO 2 data.

---

## SECTION 6 — LOGIN AND ACCESS CONTROL

Implement Role-Based Access Control (RBAC) with standard JWT tokens:

| Role | Access Scope | Permissions |
|---|---|---|
| **ACO User** | Own ACO data only (`ACO_ID`) | View history, submit current-year data, run Models 1–5 for their ACO & linked providers. |
| **CMS Admin** | All ACOs (`*`) | View all ACO data, view comparative benchmarks, run ML analyses across any ACO/Provider. |

---

## SECTION 7 — API / MODEL CONNECTION

Expose 4 simple POST endpoints for the frontend:

```
POST /api/models/model1/risk-analysis
POST /api/models/model2/performance-gap
POST /api/models/model3/twin-analysis
POST /api/models/model5/provider-risk
```

### Standard Endpoint Execution Pattern:
```
1. Receive request JSON payload from Frontend
2. Query DB to fetch baseline / historical parameters
3. Compute derived features (growth %, financial ratios)
4. Invoke model inference function (e.g. model.predict())
5. Format and return JSON response
```

---

## SECTION 8 — VALIDATION AND ERROR HANDLING

Return structured HTTP status codes and clear JSON error messages:

| Case / Scenario | HTTP Code | Error Response Message |
|---|---|---|
| **ACO Not Found** | `404 Not Found` | `"ACO_ID 'A9999' was not found in the database."` |
| **Provider Not Found** | `404 Not Found` | `"Provider NPI '1000000000' was not found."` |
| **Unlinked Provider** | `400 Bad Request` | `"Provider NPI '1003006115' is not associated with ACO 'A1001'."` |
| **Year / Baseline Missing** | `422 Unprocessable` | `"Previous year data for 2023 is missing; cannot compute growth metrics."` |
| **Division by Zero** | *Handled internally* | Standardize ratio to `0.0` if `Tot_Benes == 0` or `Previous_Expenditure == 0`. |
| **Model Failure** | `500 Internal Server Error` | `"ML Model inference service unavailable. Please try again."` |

---

## SECTION 9 — FINAL TASK CHECKLIST

- [ ] **Database Setup:** Create tables for ACO Master, ACO History, Provider Data, and ACO-Provider Mapping.
- [ ] **Data Retrieval:** Implement queries for ACO historical metrics and provider details.
- [ ] **Current-Year Storage:** Build endpoint for ACO users to save/update current-year data.
- [ ] **Model 1 Integration:** Build feature calculator (growth %, gap %) & connect Model 1 `.joblib`.
- [ ] **Model 2 Integration:** Connect Model 2 regressor with shared 13-feature calculator.
- [ ] **Model 3 Integration:** Connect Model 3 twin finder & return peer comparison verdicts.
- [ ] **ACO ↔ Provider Mapping:** Build API endpoint listing NPIs associated with an ACO.
- [ ] **Model 5 Integration:** Build provider ratio calculator (`Srvcs_Per_Bene`, `Charge_To_Pymt_Ratio`, `Pymt_Per_Bene`) & connect Model 5 `.joblib`.
- [ ] **Authentication & RBAC:** Enforce JWT auth, ACO data isolation, and CMS Admin full access.
- [ ] **Error Handling:** Implement input validation, division-by-zero checks, and standard error responses.
- [ ] **Frontend Response Formatter:** Ensure API response JSON match frontend schema specifications.
