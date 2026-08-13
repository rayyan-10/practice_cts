# 🚀 Quick Start Guide

## Prerequisites
- ✅ Node.js and npm installed
- ✅ Supabase account and project created
- ✅ Environment variables configured in `.env`

## Step 1: Run SQL Migration (5 minutes)

### 1.1 Disable Email Confirmation
1. Open your Supabase Dashboard
2. Go to **Authentication** → **Providers** → **Email**
3. **Turn OFF** "Confirm email"
4. Click **Save**

### 1.2 Execute SQL Script
1. Open **SQL Editor** in Supabase
2. Click **New Query**
3. Copy the ENTIRE contents from:
   ```
   DEMO_CTS/setup_authentication.sql
   ```
4. Paste into SQL Editor
5. Click **RUN** (or Ctrl+Enter)
6. You should see "Success. No rows returned"

### 1.3 Verify (Optional)
```sql
-- Check if profiles table was created
SELECT * FROM profiles LIMIT 1;

-- Should return empty table (no error)
```

## Step 2: Start the Application (1 minute)

The dev server should already be running. If not:

```bash
cd DEMO_CTS
npm run dev
```

Open: **http://localhost:5173**

## Step 3: Test Authentication (3 minutes)

### Create PAYER Account
1. Go to http://localhost:5173/signup
2. Click **"Payer / CMS"** card
3. Enter details:
   - Full Name: John Payer
   - Email: john@payer.com
   - Password: Test123456
   - Confirm Password: Test123456
4. Click **"Create Account"**
5. ✅ Should auto-redirect to `/payer/dashboard`

### Create ACO Account
1. Open in incognito or logout first
2. Go to http://localhost:5173/signup
3. Click **"ACO"** card
4. Enter details:
   - Full Name: Jane ACO
   - Email: jane@aco.com
   - Password: Test123456
   - Confirm Password: Test123456
5. Click **"Create Account"**
6. ✅ Should auto-redirect to `/aco/dashboard`

### Test Login
1. Logout
2. Go to http://localhost:5173/login
3. Login with john@payer.com / Test123456
4. ✅ Should auto-redirect to `/payer/dashboard`

## Step 4: Test Analysis Feature (2 minutes)

### Access Analysis
1. Login as PAYER user (john@payer.com)
2. On dashboard, click the **"Analysis"** card (middle position)
3. ✅ Should navigate to `/payer/analysis`

### Configure Analysis
1. **Select Years**: Click 2026, 2025, 2024 (or click "Select All")
2. **Select ACOs**: Click 2-3 ACO cards (or click "Select All")
3. **Select Analysis Types**: Click "Future Risks" and "Performance"
4. ✅ Button should show: "Ready to analyze X year(s), X ACO(s) with X analysis type(s)"

### Generate Results
1. Click **"View Analysis"** button
2. ✅ Should show loading spinner: "Generating Analysis..."
3. Wait 2.5 seconds
4. ✅ Should display analysis results with cards

### Explore Results
1. Scroll through different analysis types
2. Check the data visualizations
3. Click **"New Analysis"** to reconfigure
4. Click **"Back to Dashboard"** to return

## Step 5: Verify Everything Works ✅

### Authentication Checklist
- [x] PAYER signup works
- [x] ACO signup works  
- [x] Login redirects to correct dashboard
- [x] Session persists on refresh
- [x] Logout works
- [x] ACO cannot access /payer/analysis
- [x] PAYER cannot access /aco/dashboard

### Analysis Feature Checklist
- [x] Analysis card visible on PAYER dashboard
- [x] Can select multiple years
- [x] Can select multiple ACOs
- [x] Can select multiple analysis types
- [x] Bulk select/clear works
- [x] View Analysis button shows loading
- [x] Results display correctly
- [x] New Analysis resets form
- [x] Navigation works

## 🎉 You're Done!

The application is now fully functional with:
1. ✅ Simplified authentication (2 roles)
2. ✅ Predictive analysis feature (CMS portal)
3. ✅ Smooth UI with animations
4. ✅ Mock data for testing

## 🔗 Next Steps

### For Development
- Read `ANALYSIS_FEATURE.md` for detailed feature docs
- Read `IMPLEMENTATION_SUMMARY.md` for technical overview
- Check `SIMPLIFIED_AUTH_SETUP.md` for auth troubleshooting

### For Backend Integration
- Create POST `/api/analysis` endpoint
- Match request/response format in docs
- Uncomment API call in `PayerAnalysis.tsx` (line ~280)
- Replace mock data with real API response

## ⚠️ Troubleshooting

### "No organization access" Error
**Solution**: Run Step 1 (SQL migration)

### Analysis Page Shows 404
**Solution**: 
- Verify you're logged in as PAYER user
- Check dev server is running
- Hard refresh browser (Ctrl+Shift+R)

### Profile Not Created After Signup
**Solution**:
```sql
-- Check Supabase logs
-- Manually verify trigger exists:
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'users';

-- Should show: on_auth_user_created
```

### Cannot Access Analysis Feature
**Solution**:
- Verify you're logged in as PAYER (not ACO)
- Check browser console for errors
- Verify `/payer/analysis` route in App.tsx

## 📚 Documentation

- `QUICK_START.md` - This file (⭐ Start here)
- `IMPLEMENTATION_SUMMARY.md` - Complete overview
- `ANALYSIS_FEATURE.md` - Analysis feature details
- `SIMPLIFIED_AUTH_SETUP.md` - Auth setup guide
- `setup_authentication.sql` - Database migration

## 💡 Tips

1. **Use Chrome DevTools**: Check Console and Network tabs for errors
2. **Check Supabase Logs**: Real-time logs in Supabase Dashboard
3. **Test in Incognito**: Avoid cookie/cache issues
4. **Clear Browser Data**: If authentication seems stuck

## 🆘 Need Help?

1. Check browser console for errors
2. Check Supabase logs
3. Review documentation files
4. Verify SQL migration ran successfully
5. Confirm email confirmation is disabled

---

**Estimated Time**: 11 minutes total

**Result**: Fully functional VBC Analytics platform with simplified auth and predictive analysis!
