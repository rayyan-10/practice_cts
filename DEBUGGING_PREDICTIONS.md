# Debugging Predictions Not Working

## ⚠️ Issue Fixed

The `.env` file was reverted to `localhost:8000`. I've updated it to:
```env
VITE_API_URL=https://staring-script-surpass.ngrok-free.app
```

## 🔴 CRITICAL: You MUST Restart Frontend

**Stop your dev server (Ctrl+C) and restart it:**
```bash
npm run dev
```

Environment variables are **ONLY loaded when Vite starts**, not during hot reload.

## 🔍 Step-by-Step Debugging

### Step 1: Open Browser DevTools (F12)

Before clicking "Run Prediction":
1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Go to **Network** tab
4. Keep DevTools open

### Step 2: Click "Run Prediction"

Watch for:

#### In Console Tab:
Look for any errors like:
- `Failed to fetch`
- `Network Error`
- `CORS error`
- Any red error messages

#### In Network Tab:
Look for requests to your backend:
- Should see requests to `staring-script-surpass.ngrok-free.app`
- Click on the request to see details
- Check the **Status** (should be 200)
- Check the **Response** tab to see what the backend returned

### Step 3: Common Issues

#### ❌ Issue: No network requests appear
**Cause**: Frontend not sending request at all

**Debug**:
```javascript
// Check browser console for this log
console.log('API URL:', import.meta.env.VITE_API_URL);
```

**Solution**:
- Verify `.env` has correct URL
- Restart dev server
- Clear browser cache (Ctrl+Shift+R)

#### ❌ Issue: Request goes to `localhost:8000`
**Cause**: Frontend not reading updated .env

**Solution**:
1. Stop dev server (Ctrl+C)
2. Delete `.vite` cache: `rm -rf node_modules/.vite`
3. Restart: `npm run dev`

#### ❌ Issue: 404 Not Found
**Cause**: Wrong endpoint URL

**Debug**: Check Network tab → Request URL
- Should be: `https://staring-script-surpass.ngrok-free.app/aco/assess`
- Not: `https://staring-script-surpass.ngrok-free.app/undefined`

**Solution**: API client might be using wrong endpoint

#### ❌ Issue: CORS Error
**Cause**: Backend not allowing requests from frontend

**Solution**: Add to your FastAPI backend:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### ❌ Issue: 422 Validation Error
**Cause**: Missing or invalid data sent to backend

**Debug**: 
- Network tab → Click request → **Payload** tab
- See what data was sent
- Compare with backend expected format

**Solution**: Check that all required fields are filled

#### ❌ Issue: 500 Internal Server Error
**Cause**: Backend crashed processing request

**Debug**: Check your backend console for Python error traceback

#### ❌ Issue: Ngrok Warning Page
**Cause**: Ngrok free tier shows warning on first visit

**Solution**: Click "Visit Site" button, then retry

## 🧪 Quick Tests

### Test 1: Check Environment Variable

Open browser console and type:
```javascript
console.log(import.meta.env.VITE_API_URL)
```

**Expected**: `https://staring-script-surpass.ngrok-free.app`  
**If shows**: `http://localhost:8000` → You didn't restart dev server

### Test 2: Direct API Test

Open browser and visit:
```
https://staring-script-surpass.ngrok-free.app/health
```

**Expected**: 
```json
{"status": "healthy", "message": "FastAPI backend is running"}
```

**If error**: Backend or ngrok tunnel has issue

### Test 3: Test Metadata Endpoint

Open browser console and run:
```javascript
fetch('https://staring-script-surpass.ngrok-free.app/meta/tracks')
  .then(r => r.json())
  .then(d => console.log('Tracks:', d))
  .catch(e => console.error('Error:', e))
```

**Expected**: Should log tracks array  
**If error**: Check what the error message says

### Test 4: Test Full Prediction

In browser console:
```javascript
fetch('https://staring-script-surpass.ngrok-free.app/aco/assess', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
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
.then(r => r.json())
.then(d => console.log('Result:', d))
.catch(e => console.error('Error:', e))
```

**Expected**: Should log prediction result  
**If error**: Shows exactly what's wrong

## 📋 Checklist

Before reporting issue, verify:

- [ ] `.env` has ngrok URL (not localhost)
- [ ] Frontend dev server was restarted after changing `.env`
- [ ] Backend is running (`uvicorn main:app --reload --port 8000`)
- [ ] Ngrok tunnel is active
- [ ] Browser DevTools Network tab shows requests
- [ ] Backend console shows incoming requests
- [ ] Checked browser console for errors
- [ ] Tested health endpoint manually
- [ ] Cleared browser cache

## 🎯 Most Common Solution

**90% of the time, the issue is:**

1. `.env` not updated → Update it
2. Frontend not restarted → Restart it
3. Both of the above!

## 📸 What to Share If Still Not Working

If it still doesn't work, share:

1. **Browser Console screenshot** (with any errors)
2. **Network tab screenshot** (showing requests or lack thereof)
3. **Backend console output** (when clicking Run Prediction)
4. **Output of this command**:
   ```bash
   cat .env | grep VITE_API_URL
   ```

## ✅ Success Indicators

You'll know it's working when:

1. **Browser Network tab** shows request to ngrok URL with status 200
2. **Browser Console** shows no errors
3. **Backend console** shows log like: `INFO: ... "POST /aco/assess HTTP/1.1" 200 OK`
4. **Frontend** displays prediction results

---

**Start with restarting your frontend server - that fixes most issues!**
