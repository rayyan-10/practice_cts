# Fix CORS Error in Your Backend

## The Problem

Your backend is rejecting requests from the frontend with:
```
No 'Access-Control-Allow-Origin' header is present
```

## The Solution

Add CORS middleware to your FastAPI backend.

### Step 1: Open Your Backend `main.py`

Navigate to your backend directory:
```bash
cd E:\CTS Mock\api
```

Open `main.py` in your editor.

### Step 2: Add CORS Middleware

Add these lines to your `main.py` **BEFORE** you define your routes:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # ← ADD THIS

app = FastAPI()

# ↓↓↓ ADD THIS ENTIRE BLOCK ↓↓↓
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (for development)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)
# ↑↑↑ END OF CORS BLOCK ↑↑↑

# Your routes come after this
@app.get("/")
async def root():
    return {"message": "Hello World"}

# ... rest of your code
```

### Step 3: Restart Your Backend

Stop your backend (Ctrl+C) and restart:
```bash
uvicorn main:app --reload --port 8000
```

### Step 4: Test Again

Go back to your frontend and click "Run Prediction" again. It should now work!

## Full Example

Here's what the top of your `main.py` should look like:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import joblib
# ... other imports

app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health():
    return {"status": "healthy", "message": "FastAPI backend is running"}

# ... rest of your endpoints
```

## For Production (Later)

When deploying to production, replace `allow_origins=["*"]` with your actual frontend URL:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Local development
        "https://your-frontend-domain.com",  # Production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Verify It Works

After adding CORS and restarting backend:

1. Refresh your frontend (http://localhost:5173)
2. Navigate to predictions page
3. Click "Run Prediction"
4. Check browser console - CORS errors should be gone
5. Check backend console - you should see incoming requests:
   ```
   INFO: 120.56.108.243:0 - "POST /aco/assess HTTP/1.1" 200 OK
   ```

## Why This Happens

- **CORS** (Cross-Origin Resource Sharing) is a security feature in browsers
- Your frontend (http://localhost:5173) and backend (ngrok URL) are different "origins"
- Without CORS headers, browsers block these requests
- Adding the middleware tells the browser "it's okay to make these requests"

---

**Do this now and your predictions will work!**
