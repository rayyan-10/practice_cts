# Test API Connection - Quick Guide

## 🔴 FIRST: Restart Your Dev Server!

```bash
# Press Ctrl+C to stop current server
# Then restart
npm run dev
```

## Test 1: Check Environment Variable is Loaded

Open your browser to http://localhost:5173, press **F12** for DevTools, then in Console tab type:

```javascript
console.log('API URL:', import.meta.env.VITE_API_URL)
```

### ✅ Expected Output:
```
API URL: https://staring-script-surpass.ngrok-free.app
```

### ❌ If it shows `http://localhost:8000`:
Your dev server wasn't restarted after updating `.env`!

### ❌ If it shows `undefined`:
The environment variable isn't loaded. Make sure:
1. Variable name starts with `VITE_`
2. You restarted dev server
3. No typos in `.env` file

## Test 2: Direct Backend Health Check

Open a new browser tab and visit:

```
https://staring-script-surpass.ngrok-free.app/health
```

### ✅ Expected:
```json
{
  "status": "healthy",
  "message": "FastAPI backend is running"
}
```

### ❌ If you see ngrok warning:
Click "Visit Site" button, then test again

### ❌ If timeout or error:
- Check backend is running
- Check ngrok tunnel is active
- Try the localhost version: `http://localhost:8000/health`

## Test 3: Check API from Frontend Console

In your app (http://localhost:5173), press F12, Console tab, paste:

```javascript
// Test tracks metadata
fetch('https://staring-script-surpass.ngrok-free.app/meta/tracks')
  .then(response => {
    console.log('Status:', response.status);
    return response.json();
  })
  .then(data => console.log('Tracks data:', data))
  .catch(error => console.error('Error:', error));
```

### ✅ Expected:
```
Status: 200
Tracks data: {values: ["BASIC", "ENHANCED", "One-Sided", "Two-Sided"]}
```

### ❌ Common Errors:

**CORS Error**:
```
Access to fetch at '...' from origin 'http://localhost:5173' has been blocked by CORS policy
```
→ Your backend needs CORS middleware configured

**Network Error**:
```
TypeError: Failed to fetch
```
→ Backend not reachable. Check backend is running and ngrok tunnel is active

**404 Not Found**:
```
Status: 404
```
→ Endpoint doesn't exist. Check backend has `/meta/tracks` endpoint

## Test 4: Full Prediction Test

In Console tab, paste this complete prediction test:

```javascript
// Test Combined Assessment
fetch('https://staring-script-surpass.ngrok-free.app/aco/assess', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    N_AB: 14500,
    Previous_Savings_Rate: 0.045,
    Previous_Quality_Score: 88.5,
    Previous_Performance_Gap: -2.1,
    Expenditure_Growth: 3.2,
    Benchmark_Growth: 2.8,
    Quality_Change: 1.5,
    Beneficiary_Growth: 2.0,
    N_Hosp: 3,
    N_PCP: 180,
    N_Spec: 250,
    Rev_Exp_Cat: 'Low Revenue',
    Track: 'ENHANCED'
  })
})
.then(response => {
  console.log('Status:', response.status);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
})
.then(data => {
  console.log('✅ Prediction Success!');
  console.log('Risk Classification:', data.risk_classification);
  console.log('Performance Gap:', data.performance_gap);
  console.log('Summary:', data.summary);
})
.catch(error => {
  console.error('❌ Prediction Failed:', error);
});
```

### ✅ Expected:
```
Status: 200
✅ Prediction Success!
Risk Classification: {prediction: "At_Risk", probability_at_risk: 67.3, ...}
Performance Gap: {predicted_performance_gap_pct: -3.21, ...}
Summary: "ACO predicted as At_Risk with 67.3% probability..."
```

### ❌ Status 422 - Validation Error:
Your data format doesn't match what backend expects. Check backend console for details.

### ❌ Status 500 - Server Error:
Backend crashed. Check backend console for Python traceback.

## Test 5: Watch Network Traffic

While on predictions page (http://localhost:5173/payer/predictions or /aco/predictions):

1. Open DevTools (F12)
2. Go to **Network** tab
3. Fill the form on the page
4. Click "Run Prediction"
5. Watch Network tab for new requests

### ✅ What to Look For:

**Metadata requests** (when page loads):
```
GET https://staring-script-surpass.ngrok-free.app/meta/tracks          200
GET https://staring-script-surpass.ngrok-free.app/meta/rev-exp-categories 200
GET https://staring-script-surpass.ngrok-free.app/meta/model3/available-years 200
```

**Prediction request** (when clicking button):
```
POST https://staring-script-surpass.ngrok-free.app/aco/assess          200
```

### ❌ If No Requests Appear:
- JavaScript error preventing API call
- Check Console tab for errors
- Verify button click handler is working

### ❌ If Requests Go to localhost:8000:
- Frontend not reading updated environment variable
- Restart dev server
- Clear browser cache (Ctrl+Shift+R)

## Test 6: Backend Console Verification

When you click "Run Prediction", watch your backend console (where uvicorn is running).

### ✅ You Should See:
```
INFO: 120.56.108.243:0 - "POST /aco/assess HTTP/1.1" 200 OK
```

### ❌ If You See Nothing:
Request isn't reaching backend:
- Check ngrok tunnel is running: `ngrok http 8000`
- Check frontend is sending to correct URL
- Check network tab in browser

### ❌ If You See Error Stack Trace:
Backend is crashing. Read the error message:
- Missing model file?
- Data validation error?
- Python exception?

## Quick Command Reference

### Restart Frontend:
```bash
cd DEMO_CTS
npm run dev
```

### Check Backend Health (Local):
```bash
curl http://localhost:8000/health
```

### Check Backend Health (Ngrok):
```bash
curl https://staring-script-surpass.ngrok-free.app/health
```

### View Environment Variables:
```bash
cat .env | grep VITE_API_URL
```

### Clear Vite Cache:
```bash
rm -rf node_modules/.vite
npm run dev
```

## 🎯 Most Likely Solution

If predictions aren't working:

1. **Update `.env`** ✅ (Already done)
2. **Restart frontend** 🔄 (Do this now!)
3. **Clear browser cache** (Ctrl+Shift+R)
4. **Test with console commands** above

The issue is almost certainly that the frontend dev server needs to be restarted!

---

**After restarting, try one of the console tests above to verify connection.**
