# Quick Fix: Twin ACO "A1001 Not Found" Error

## Problem
Frontend uses "A1001" as default ACO ID, but it doesn't exist in your Model 3 dataset.

## Quick Solution (5 Minutes)

### Step 1: Find Valid ACO IDs

**Option A - Via Python** (if you have access to backend machine):

```bash
# In your backend directory
cd E:\CTS Mock\api
python
```

```python
import joblib
model3 = joblib.load('../models/model3_twin_aco_updated.joblib')

# Get all ACO IDs
aco_ids = model3._twin_df["ACO_ID"].unique().tolist()

# Print first 20
print("First 20 ACO IDs:")
for aco in aco_ids[:20]:
    print(f"  - {aco}")

# Print total count
print(f"\nTotal ACOs: {len(aco_ids)}")

# Test one
print(f"\nTesting with first ACO: {aco_ids[0]}")
result = model3.predict(aco_ids[0])
print(f"Result: {result['status']}")
```

**Option B - Via Backend Endpoint**:

Add this to your FastAPI `main.py`:

```python
@app.get("/meta/model3/available-acos", tags=["Metadata"])
def get_model3_available_acos():
    """Get list of all available ACO IDs."""
    try:
        aco_ids = sorted(model3._twin_df["ACO_ID"].unique().tolist())
        return {
            "aco_ids": aco_ids,
            "count": len(aco_ids),
            "sample": aco_ids[:10]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

Restart backend, then visit:
```
https://staring-script-surpass.ngrok-free.app/meta/model3/available-acos
```

### Step 2: Use a Valid ACO ID

Once you know valid ACO IDs, **temporarily** update the default in your prediction pages:

**In `src/pages/payer/PayerPrediction.tsx` line ~60**:
```typescript
// Change from:
const [model3Input, setModel3Input] = useState({ aco_id: 'A1001', year: 2024 });

// To (use your actual ACO ID):
const [model3Input, setModel3Input] = useState({ aco_id: 'ACO001', year: 2024 });
```

**In `src/pages/aco/ACOPrediction.tsx` line ~60**:
```typescript
// Same change
const [model3Input, setModel3Input] = useState({ aco_id: 'ACO001', year: 2024 });
```

### Step 3: Test

1. Restart frontend (Ctrl+C, then `npm run dev`)
2. Navigate to predictions page
3. Select "Model 3: Twins"
4. Click "Run Prediction"
5. Should now work! 🎉

---

## Permanent Solution: ACO Dropdown

### Backend Update

Add to your `main.py`:

```python
@app.get("/meta/model3/available-acos", tags=["Metadata"])
def get_model3_available_acos():
    """Get list of all available ACO IDs in Model 3 twin dataset."""
    try:
        aco_ids = sorted(model3._twin_df["ACO_ID"].unique().tolist())
        return {
            "aco_ids": aco_ids,
            "count": len(aco_ids),
            "sample": aco_ids[:10] if len(aco_ids) > 10 else aco_ids
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Frontend Update

**I've already added** the API client methods:
- `api.getAvailableACOs()`
- `api.searchACOs(query)`

Now update the prediction pages to use a dropdown:

```typescript
// Add state for ACO list
const [availableACOs, setAvailableACOs] = useState<string[]>([]);

// Load ACOs on mount
useEffect(() => {
  loadMetadata();
  loadAvailableACOs();
}, []);

const loadAvailableACOs = async () => {
  try {
    const data = await api.getAvailableACOs();
    setAvailableACOs(data.aco_ids);
    // Set first ACO as default if available
    if (data.aco_ids.length > 0) {
      setModel3Input({ aco_id: data.aco_ids[0], year: 2024 });
    }
  } catch (err) {
    console.error('Failed to load ACOs:', err);
  }
};

// Replace text input with dropdown
<div className="space-y-2">
  <Label>ACO ID</Label>
  <select
    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
    value={model3Input.aco_id}
    onChange={(e) => setModel3Input({ ...model3Input, aco_id: e.target.value })}
  >
    {availableACOs.length === 0 ? (
      <option value="">Loading ACOs...</option>
    ) : (
      <>
        <option value="">Select ACO</option>
        {availableACOs.map((acoId) => (
          <option key={acoId} value={acoId}>{acoId}</option>
        ))}
      </>
    )}
  </select>
</div>
```

---

## Summary

**Immediate Fix**:
1. Find valid ACO ID from your dataset
2. Replace "A1001" with valid ID in prediction pages
3. Restart frontend

**Long-term Fix**:
1. Add `/meta/model3/available-acos` endpoint to backend
2. Update frontend to load and display ACO dropdown
3. Users can select from available ACOs

**Backend Endpoint Added**: ✅ API client methods ready  
**Frontend Dropdown**: ⏳ Needs implementation in prediction pages  

Let me know which ACO ID format your dataset uses and I can help update the default!
