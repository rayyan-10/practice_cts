# Add ACO List Endpoint to Backend

## Problem
Frontend is using "A1001" as default ACO ID, but it doesn't exist in your Model 3 dataset.

## Solution
Add an endpoint to your FastAPI backend to return available ACO IDs.

---

## Step 1: Add Endpoint to Your Backend `main.py`

Add this endpoint **after** your Model 3 endpoints:

```python
@app.get("/meta/model3/available-acos", tags=["Metadata"])
def get_model3_available_acos():
    """
    Get list of all available ACO IDs in Model 3 twin dataset.
    Useful for frontend dropdown/autocomplete.
    """
    try:
        aco_ids = sorted(model3._twin_df["ACO_ID"].unique().tolist())
        return {
            "aco_ids": aco_ids,
            "count": len(aco_ids),
            "sample": aco_ids[:10] if len(aco_ids) > 10 else aco_ids
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/meta/model3/search-acos", tags=["Metadata"])
def search_model3_acos(q: str = ""):
    """
    Search for ACO IDs that match a query string.
    Example: /meta/model3/search-acos?q=A10
    """
    try:
        all_acos = model3._twin_df["ACO_ID"].unique().tolist()
        if q:
            filtered = [aco for aco in all_acos if q.upper() in str(aco).upper()]
        else:
            filtered = all_acos[:50]  # Return first 50 if no query
        
        return {
            "query": q,
            "results": sorted(filtered),
            "count": len(filtered)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Step 2: Restart Your Backend

```bash
# Stop backend (Ctrl+C)
# Restart
uvicorn main:app --reload --port 8000
```

## Step 3: Test the Endpoint

### In Browser:
```
https://staring-script-surpass.ngrok-free.app/meta/model3/available-acos
```

**Expected Response**:
```json
{
  "aco_ids": ["ACO001", "ACO002", "ACO003", ...],
  "count": 150,
  "sample": ["ACO001", "ACO002", "ACO003", "ACO004", "ACO005", ...]
}
```

### Search for Specific ACOs:
```
https://staring-script-surpass.ngrok-free.app/meta/model3/search-acos?q=ACO1
```

---

## Step 4: Update Frontend API Client

Add methods to `src/lib/api.ts`:

```typescript
// Add these methods to ContractIQAPI class

async getAvailableACOs(): Promise<{ aco_ids: string[]; count: number; sample: string[] }> {
  return this.request('/meta/model3/available-acos');
}

async searchACOs(query: string): Promise<{ query: string; results: string[]; count: number }> {
  return this.request(`/meta/model3/search-acos?q=${encodeURIComponent(query)}`);
}
```

---

## Step 5: Update Frontend to Use Real ACO IDs

### Option A: Dropdown with Real ACO IDs

Update the prediction pages to fetch and show available ACOs:

```typescript
// In PayerPrediction.tsx or ACOPrediction.tsx

const [availableACOs, setAvailableACOs] = useState<string[]>([]);

useEffect(() => {
  // Load available ACO IDs
  api.getAvailableACOs()
    .then(data => {
      setAvailableACOs(data.aco_ids);
      // Set first ACO as default
      if (data.aco_ids.length > 0) {
        setModel3Input({ ...model3Input, aco_id: data.aco_ids[0] });
      }
    })
    .catch(err => console.error('Failed to load ACOs:', err));
}, []);

// Replace text input with dropdown
<select
  value={model3Input.aco_id}
  onChange={(e) => setModel3Input({ ...model3Input, aco_id: e.target.value })}
  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
>
  <option value="">Select ACO</option>
  {availableACOs.map(acoId => (
    <option key={acoId} value={acoId}>{acoId}</option>
  ))}
</select>
```

### Option B: Autocomplete Search

```typescript
const [acoSearchResults, setAcoSearchResults] = useState<string[]>([]);
const [acoSearchQuery, setAcoSearchQuery] = useState('');

const handleACOSearch = async (query: string) => {
  setAcoSearchQuery(query);
  if (query.length >= 2) {
    const results = await api.searchACOs(query);
    setAcoSearchResults(results.results);
  } else {
    setAcoSearchResults([]);
  }
};

// UI with search
<div>
  <Input
    value={acoSearchQuery}
    onChange={(e) => handleACOSearch(e.target.value)}
    placeholder="Search ACO ID..."
  />
  {acoSearchResults.length > 0 && (
    <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
      {acoSearchResults.map(acoId => (
        <div
          key={acoId}
          className="p-2 hover:bg-accent cursor-pointer"
          onClick={() => {
            setModel3Input({ ...model3Input, aco_id: acoId });
            setAcoSearchQuery(acoId);
            setAcoSearchResults([]);
          }}
        >
          {acoId}
        </div>
      ))}
    </div>
  )}
</div>
```

---

## Step 6: Quick Manual Test (No Code Changes)

If you want to test **right now** without code changes:

1. **Open your backend console** (where uvicorn is running)
2. **Look for the Model 3 loading** - it might print ACO IDs
3. **Or run this in Python**:

```bash
# In your backend directory
python
```

```python
import joblib
model3 = joblib.load('models/model3_twin_aco_updated.joblib')
aco_ids = model3._twin_df["ACO_ID"].unique().tolist()
print("Available ACO IDs:")
print(aco_ids[:20])  # Print first 20
```

4. **Use one of those ACO IDs** in your frontend form

---

## Alternative: Check What Format Your Backend Uses

Your Model 3 dataset might use different ACO ID formats:
- `A1001` (current frontend default)
- `ACO001`
- `1001`
- `A-1001`

Run this to find out:

```python
import joblib
model3 = joblib.load('models/model3_twin_aco_updated.joblib')
print("Sample ACO IDs:", model3._twin_df["ACO_ID"].unique()[:10])
print("Total ACOs:", len(model3._twin_df["ACO_ID"].unique()))
```

---

## Summary

**Immediate Solution**:
1. Add `/meta/model3/available-acos` endpoint to backend
2. Restart backend
3. Visit endpoint in browser to see valid ACO IDs
4. Use one of those IDs in your frontend form

**Long-term Solution**:
1. Update frontend to fetch and display available ACO IDs
2. Replace text input with dropdown or autocomplete
3. Set first available ACO as default

**Quick Test**:
- Check your backend Python console or dataset directly
- Find a valid ACO ID
- Type it into the frontend form manually

Would you like me to help you add these endpoints to your backend or update the frontend to use a dropdown with real ACO IDs?
