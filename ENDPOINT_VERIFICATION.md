# Endpoint Verification - Frontend vs Backend

## 🔍 Current Frontend Configuration

**API Base URL**: 
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://staring-script-surpass.ngrok-free.dev';
```

**Environment Variable** (`.env`):
```env
VITE_API_URL=https://staring-script-surpass.ngrok-free.app
```

## 📋 Frontend Endpoints (from `src/lib/api.ts`)

### Model 1 - Risk Classification
```
POST /model1/predict
Content-Type: application/json

Body: ACOFeatures (13 fields)
```

### Model 2 - Performance Gap
```
POST /model2/predict
Content-Type: application/js