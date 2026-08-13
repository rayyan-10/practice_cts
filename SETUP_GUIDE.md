# VBC/ACO Analytics Platform - Complete Setup Guide

This guide will walk you through setting up the complete VBC/ACO Contract Performance Analytics Platform from scratch.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works perfectly)
- A code editor (VS Code recommended)
- Basic understanding of React and PostgreSQL

---

## Step 1: Project Setup

### 1.1 Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React, TypeScript, and Vite
- Tailwind CSS and shadcn/ui components
- Supabase client
- React Query
- React Router
- Recharts for data visualization

### 1.2 Verify Installation

```bash
npm run dev
```

You should see Vite starting up (though it won't work yet without Supabase configuration).

---

## Step 2: Supabase Setup

### 2.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in or create an account
4. Click "New Project"
5. Fill in:
   - **Name**: VBC ACO Analytics (or any name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free
6. Click "Create new project"
7. Wait 2-3 minutes for setup to complete

### 2.2 Get API Credentials

1. Once your project is ready, go to **Project Settings** (gear icon in sidebar)
2. Click **API** in the settings menu
3. Copy these two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### 2.3 Configure Environment Variables

1. In the project root, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_ENVIRONMENT=demo
   ```

---

## Step 3: Database Setup

### 3.1 Run Migration 1: Schema

1. In Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open `supabase/migrations/001_initial_schema.sql` in your code editor
4. Copy the entire contents
5. Paste into the Supabase SQL Editor
6. Click **Run** (or press Ctrl/Cmd + Enter)
7. You should see "Success. No rows returned"

This creates all database tables:
- organizations
- profiles
- organization_members
- acos
- contracts
- providers
- beneficiaries
- claims
- quality_measures
- provider_performance
- contract_performance
- alerts
- recommendations
- audit_logs

### 3.2 Run Migration 2: Security

1. Click **New Query** again in SQL Editor
2. Open `supabase/migrations/002_row_level_security.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click **Run**
6. Verify "Success" message

This enables Row Level Security (RLS) on all tables and creates security policies that ensure:
- Payer users can see all ACOs
- ACO users can only see their own ACO data
- Users cannot access data from other organizations

### 3.3 Run Migration 3: Demo Data

1. Click **New Query** again
2. Open `supabase/migrations/003_seed_demo_data.sql`
3. Copy and paste contents
4. Click **Run**

This creates:
- Demo payer organization
- Two demo ACO organizations
- Sample contracts
- Sample providers
- Sample beneficiaries
- Quality measures
- Provider performance data
- Contract performance data
- Sample alerts and recommendations

### 3.4 Verify Database Setup

1. Click **Table Editor** in Supabase sidebar
2. You should see all tables listed
3. Click on `organizations` - you should see 3 organizations
4. Click on `contracts` - you should see 2 contracts
5. Click on `providers` - you should see 3 providers

---

## Step 4: Create Demo User Accounts

Since user authentication is handled by Supabase Auth, we need to create users manually.

### 4.1 Create Payer Admin User

1. In Supabase dashboard, click **Authentication** in sidebar
2. Click **Users** tab
3. Click **Add user** → **Create new user**
4. Fill in:
   - **Email**: `payer-admin@demo.com`
   - **Password**: Create a password (e.g., `Demo123456!`)
   - **Auto Confirm User**: ✓ Check this box
5. Click **Create user**
6. **Copy the User ID** that appears (looks like `a1b2c3d4-...`)

### 4.2 Link Payer User to Organization

1. Go back to **SQL Editor**
2. Create new query with this SQL (replace `USER_ID` with the ID you copied):

```sql
-- Insert profile for payer user
INSERT INTO profiles (id, full_name, email, job_title)
VALUES (
  'USER_ID_HERE',
  'Demo Payer Admin',
  'payer-admin@demo.com',
  'System Administrator'
);

-- Link user to payer organization
INSERT INTO organization_members (organization_id, user_id, role, status)
VALUES (
  '00000000-0000-0000-0000-000000000001', -- Demo Medicare Payer
  'USER_ID_HERE',
  'PAYER_ADMIN',
  'APPROVED'
);
```

3. Replace `USER_ID_HERE` with your actual user ID (in both places)
4. Run the query

### 4.3 Create ACO Admin User

Repeat the process for an ACO user:

1. Go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Fill in:
   - **Email**: `aco-admin@demo.com`
   - **Password**: Create a password (e.g., `Demo123456!`)
   - **Auto Confirm User**: ✓ Check this
4. Click **Create user**
5. **Copy the User ID**

6. In SQL Editor, run this (replace `USER_ID`):

```sql
-- Insert profile for ACO user
INSERT INTO profiles (id, full_name, email, job_title)
VALUES (
  'USER_ID_HERE',
  'Demo ACO Admin',
  'aco-admin@demo.com',
  'ACO Administrator'
);

-- Link user to Pioneer Health Network
INSERT INTO organization_members (organization_id, user_id, role, status)
VALUES (
  '00000000-0000-0000-0000-000000000002', -- Pioneer Health Network
  'USER_ID_HERE',
  'ACO_ADMIN',
  'APPROVED'
);
```

### 4.4 Verify User Setup

Run this query to see all users and their organization links:

```sql
SELECT 
  p.email,
  p.full_name,
  om.role,
  o.name as organization_name,
  o.organization_type
FROM profiles p
JOIN organization_members om ON om.user_id = p.id
JOIN organizations o ON o.id = om.organization_id;
```

You should see both users with their organizations.

---

## Step 5: Test the Application

### 5.1 Start Development Server

```bash
npm run dev
```

The app should start at `http://localhost:5173`

### 5.2 Test Payer Login

1. Navigate to `http://localhost:5173`
2. You'll be redirected to the login page
3. Enter:
   - **Email**: `payer-admin@demo.com`
   - **Password**: (the password you created)
4. Click **Sign In**
5. You should see the **Payer Dashboard** with:
   - 24 total ACOs
   - Portfolio overview
   - Financial KPIs
   - ACO list preview

### 5.3 Test ACO Login

1. Click **Sign Out** (top right)
2. Log in with:
   - **Email**: `aco-admin@demo.com`
   - **Password**: (the ACO password you created)
3. You should see the **ACO Dashboard** with:
   - Pioneer Health Network data
   - Performance overview
   - Provider performance
   - Care opportunities

### 5.4 Test Role-Based Access

**Important Security Test:**

1. While logged in as ACO user, try to access payer routes:
   - Go to `http://localhost:5173/payer/dashboard`
   - You should be blocked or redirected
   - This confirms RLS is working

2. Open browser DevTools → Console
3. Try this in the console (while logged in as ACO):
   ```javascript
   // Try to query another ACO's data
   supabase.from('acos').select('*')
   ```
4. You should only see YOUR ACO data, not other ACOs
5. This confirms Row Level Security is working correctly

---

## Step 6: Explore Features

### Payer Dashboard Features

- **Portfolio Overview**: View all ACO contracts and performance
- **Financial Analytics**: See aggregate savings and losses
- **ACO List**: Browse and filter ACO portfolio
- **Risk Assessment**: Identify contracts at risk

### ACO Dashboard Features

- **Performance Overview**: Your ACO's financial and quality performance
- **Provider Analytics**: See provider-level performance
- **Care Opportunities**: Recommendations to improve outcomes
- **Risk Stratification**: High-risk patient populations

---

## Step 7: Add More Demo Data (Optional)

### 7.1 Create Additional ACO

```sql
-- Create new ACO organization
INSERT INTO organizations (id, name, organization_type, legal_name, identifier, city, state, verification_status, verified_at)
VALUES (
  gen_random_uuid(),
  'Regional Medical Group',
  'ACO',
  'Regional Medical Group LLC',
  'ACO-2024-015',
  'Denver',
  'CO',
  'APPROVED',
  NOW()
) RETURNING id; -- Save this ID

-- Create ACO entity (use organization ID from above)
INSERT INTO acos (organization_id, aco_identifier, name, program_type, status, verification_status)
VALUES (
  'ORGANIZATION_ID_HERE',
  'ACO-2024-015',
  'Regional Medical Group',
  'MSSP Basic',
  'ACTIVE',
  'APPROVED'
);
```

### 7.2 Add More Providers

```sql
-- Add provider to Pioneer Health Network
INSERT INTO providers (aco_id, provider_identifier, name, provider_type, specialty, city, state, status)
VALUES (
  '00000000-0000-0000-0000-000000000011', -- Pioneer Health Network
  'PRV-' || FLOOR(RANDOM() * 999 + 100),
  'Dr. John Smith',
  'PHYSICIAN',
  'Cardiology',
  'Boston',
  'MA',
  'ACTIVE'
);
```

---

## Troubleshooting

### Issue: "Missing Supabase environment variables"

**Solution**: 
- Verify `.env` file exists in project root
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart dev server after adding `.env`

### Issue: Login returns "Invalid credentials"

**Solution**:
- Verify user was created in Supabase Auth
- Ensure "Auto Confirm User" was checked
- Check that profile and organization_member records were created
- Try password reset if needed

### Issue: Can't see any data after login

**Solution**:
- Verify RLS policies were created (migration 002)
- Check organization_members table has link for your user
- Verify organization has correct organization_type
- Check browser console for errors

### Issue: ACO user can see other ACO data

**Solution**:
- RLS policies may not be working
- Re-run migration 002
- Verify policies exist:
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'acos';
  ```

### Issue: npm install fails

**Solution**:
- Ensure Node.js 18+ is installed: `node --version`
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then re-run `npm install`

---

## Next Steps

Once the basic setup is working, you can:

1. **Add more features**: Implement contracts management, detailed analytics, what-if simulator
2. **Customize styling**: Modify Tailwind config for your brand colors
3. **Add real calculations**: Implement actual financial reconciliation logic
4. **Build charts**: Use Recharts to visualize trends
5. **Create reports**: Add PDF/CSV export functionality
6. **Enhance security**: Add additional validation and audit logging

---

## Important Notes

- ✅ This is a **DEMO** platform with synthetic data
- ✅ All data is fictional for demonstration purposes
- ⚠️ Do NOT use with real patient data without proper HIPAA compliance
- ⚠️ Never commit `.env` file to version control
- ⚠️ Row Level Security (RLS) is essential for production use

---

## Getting Help

If you encounter issues:

1. Check the browser console for errors (F12)
2. Review Supabase logs in the dashboard
3. Verify all migrations ran successfully
4. Ensure user accounts are properly linked to organizations
5. Test RLS policies in SQL Editor

For questions about:
- **React/Frontend**: Check React and Vite documentation
- **Database**: Review Supabase PostgreSQL docs
- **Styling**: See Tailwind CSS and shadcn/ui documentation

---

## Summary Checklist

- ✅ Node.js and dependencies installed
- ✅ Supabase project created
- ✅ Environment variables configured
- ✅ Database migrations run successfully
- ✅ Demo data loaded
- ✅ Payer user account created and linked
- ✅ ACO user account created and linked
- ✅ Application starts without errors
- ✅ Can log in as both user types
- ✅ Role-based access control working
- ✅ Dashboards display data correctly

If all items are checked, you're ready to start development! 🎉
