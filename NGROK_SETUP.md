# Ngrok Backend Configuration

## ✅ Configuration Updated

Your FastAPI backend is now accessible via ngrok tunnel.

## Backend URL

```
https://staring-script-surpass.ngrok-free.app
```

## What Was Updated

### `.env` File
Updated `VITE_API_URL` to point to your ngrok URL:

```env
VITE_API_URL=https://staring-script-surpass.ngrok-free.app
```

This is the **ONLY** file that needs the ngrok URL. The API client (`src/lib/api.ts`) automatically reads from this environment variable.

## How It Works

```
Frontend (React)
    ↓
Reads VITE_API_URL from .env
    ↓
src/lib/api.ts (API Client)
    ↓
Makes requests to ngrok URL
    ↓
Ngrok Tunnel
    ↓
Your FastAPI Backend (localhost:8000)
    ↓
ML Models Process Request
    ↓
Response back through tunnel
```

## ⚠️ Important: Restart Required

After updating `.env`, you **MUST restart** your frontend dev server:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

Environment variables are only loaded when Vite starts, not during hot reload.

## Testing the Connection

### 1. Verify Backend Health
Open in browser: https://staring-script-surpass.ngrok-free.app/health

Expected response:
```json
{
  "status": "healthy",
  "message": "FastAPI backend is running"
}
```

### 2. Check API Documentation
Open: https://staring-script-surpass.ngrok-free.app/docs

You should see the FastAPI Swagger UI with all endpoints.

### 3. Test from Frontend
1. Login to your app (http://localhost:5173)
2. Navigate to predictions page
3. Fill a form and click "Run Prediction"
4. Check browser console for API calls

### Expected Console Output:
```
POST https://staring-script-surpass.ngrok-free.app/aco/assess
Status: 200 OK
```

## Ngrok Free Tier Considerations

### Session Timeout
- Ngrok free tunnels expire after **2 hours** of inactivity
- If backend becomes unreachable, restart your ngrok tunnel
- The URL may change each time you restart ngrok

### URL Changes
If your ngrok URL changes (new tunnel), update `.env`:

```bash
# Edit .env file
VITE_API_URL=https://your-new-ngrok-url.ngrok-free.app

# Restart frontend
npm run dev
```

### Ngrok Warning Page
First-time visitors may see an ngrok warning page. Click "Visit Site" to proceed.

## Browser Console Debugging

Open browser DevTools (F12) and check:

### Network Tab
- Look for requests to `staring-script-surpass.ngrok-free.app`
- Status should be `200 OK` for successful requests
- Check response data

### Console Tab
- Any errors will appear here
- Look for CORS errors (shouldn't happen with ngrok)
- Check for API response logs

## Troubleshooting

### Error: "Failed to fetch"
**Cause**: Backend not accessible through ngrok

**Solutions**:
1. Verify backend is running: `uvicorn main:app --reload`
2. Check ngrok tunnel is active: `ngrok http 8000`
3. Test health endpoint in browser
4. Ensure firewall isn't blocking ngrok

### Error: "Network Error" or CORS
**Cause**: Backend CORS not configured

**Solution**: Verify your FastAPI has CORS middleware:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Error: "Ngrok warning page"
**Cause**: Ngrok free tier shows warning to first-time visitors

**Solution**: 
- Click "Visit Site" button on the warning page
- This only happens once per browser session

### Dropdown Still Empty
**Cause**: Metadata endpoints not responding

**Solution**:
- Check backend console for errors
- Fallback values will be used automatically
- Verify these endpoints work:
  - `/meta/rev-exp-categories`
  - `/meta/tracks`
  - `/meta/provider-types`
  - `/meta/model3/available-years`

## Switching Back to Localhost

If you want to use localhost instead of ngrok:

```bash
# Edit .env
VITE_API_URL=http://localhost:8000

# Restart frontend
npm run dev
```

## Production Deployment

For production, replace ngrok with your actual deployed backend:

```env
VITE_API_URL=https://your-production-api.com
```

Don't forget to update CORS settings in production to only allow your frontend domain.

## Summary

✅ `.env` updated with ngrok URL  
✅ No other files need modification  
✅ API client automatically uses the URL  
⚠️ **Must restart frontend server**  
⚠️ Test health endpoint first  
⚠️ Ngrok URL may change on restart  

---

**You're all set! Restart your frontend and test the predictions. 🚀**
