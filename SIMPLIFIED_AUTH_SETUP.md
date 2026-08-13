# Simplified Authentication Setup Guide

This guide will help you set up the simplified authentication system for the VBC Analytics platform.

## Overview

The new authentication system is intentionally simple:

```
Supabase Auth (auth.users)
    ↓
profiles table
    ↓
role (PAYER or ACO)
    ↓
Dashboard routing
```

## Prerequisites

1. Supabase account with a project created
2. Environment variables configured in `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Step 1: Disable Email Confirmation (Important!)

Since this is a prototype/demo, we don't want email confirmation to block signups.

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers** → **Email**
3. Scroll down to **Confirm email**
4. **Turn OFF** the toggle for "Confirm email"
5. Click **Save**

## Step 2: Run the Database Migration

Copy and paste the following SQL into your Supabase SQL Editor and run it:

```sql
-- ============================================================================
-- SIMPLIFIED AUTHENTICATION SYSTEM
-- ============================================================================

-- Step 1: Drop existing complex structures (if they exist)
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS acos CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Step 2: Create profiles table with simplified structure
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('PAYER', 'ACO')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for faster lookups
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- Step 4: Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
CREATE POLICY "Users can read own profile"
    ON profiles
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON profiles
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Step 6: Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'ACO')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create trigger to call the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 8: Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at ON profiles;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
```

## Step 3: Verify the Setup

After running the migration, verify everything is set up correctly:

```sql
-- Check if profiles table exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- Check triggers
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND trigger_schema = 'auth';
```

Expected results:
- profiles table has columns: id, user_id, full_name, email, role, created_at, updated_at
- Two RLS policies exist for SELECT and UPDATE
- Trigger `on_auth_user_created` exists on `auth.users`

## Step 4: Test the Authentication Flow

### Test Signup (Payer)

1. Navigate to http://localhost:5173/signup
2. Click **Payer / CMS**
3. Enter:
   - Full Name: Test Payer
   - Email: testpayer@example.com
   - Password: Test123456
   - Confirm Password: Test123456
4. Click **Create Account**
5. You should be automatically redirected to `/payer/dashboard`

### Test Signup (ACO)

1. Navigate to http://localhost:5173/signup (in incognito or after logout)
2. Click **ACO**
3. Enter:
   - Full Name: Test ACO
   - Email: testaco@example.com
   - Password: Test123456
   - Confirm Password: Test123456
4. Click **Create Account**
5. You should be automatically redirected to `/aco/dashboard`

### Test Login

1. Logout from the dashboard
2. Navigate to http://localhost:5173/login
3. Enter credentials for either account
4. Click **Sign In**
5. You should be automatically redirected to the correct dashboard based on your role

## Step 5: Verify Database Records

After creating test accounts, check the database:

```sql
-- View all profiles
SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.email,
    p.role,
    p.created_at,
    u.email as auth_email,
    u.created_at as auth_created_at
FROM profiles p
JOIN auth.users u ON u.id = p.user_id
ORDER BY p.created_at DESC;

-- Count by role
SELECT role, COUNT(*) as count
FROM profiles
GROUP BY role;
```

## Troubleshooting

### Issue: "Unable to create your account"

**Solution**: Check if email confirmation is disabled (Step 1)

### Issue: "Profile Not Found" after login

**Possible causes**:
1. Database trigger not working
2. RLS policies blocking access

**Debug query**:
```sql
-- Check if profile was created
SELECT * FROM profiles WHERE email = 'your-email@example.com';

-- Check auth user
SELECT id, email, created_at FROM auth.users WHERE email = 'your-email@example.com';
```

**Manual fix** (if trigger failed):
```sql
-- Get user ID
SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Manually create profile (replace USER_ID_HERE with actual ID)
INSERT INTO profiles (user_id, full_name, email, role)
VALUES (
    'USER_ID_HERE',
    'Your Name',
    'your-email@example.com',
    'PAYER'  -- or 'ACO'
);
```

### Issue: Wrong dashboard after login

**Check the profile role**:
```sql
SELECT email, role FROM profiles WHERE email = 'your-email@example.com';
```

**Update role if needed**:
```sql
UPDATE profiles 
SET role = 'PAYER'  -- or 'ACO'
WHERE email = 'your-email@example.com';
```

### Issue: "relation does not exist" error

**Solution**: The migration wasn't run. Go back to Step 2.

### Issue: Session not persisting after page refresh

**Check**: Make sure Supabase Auth is configured correctly in your environment variables.

## Testing Checklist

- [ ] Signup as Payer works
- [ ] Signup as ACO works
- [ ] Login as Payer redirects to Payer dashboard
- [ ] Login as ACO redirects to ACO dashboard
- [ ] Logout works
- [ ] Session persists after page refresh
- [ ] ACO user cannot access /payer/dashboard (redirects to ACO dashboard)
- [ ] Payer user cannot access /aco/dashboard (redirects to Payer dashboard)
- [ ] Unauthenticated user is redirected to /login when accessing protected routes

## Next Steps

Once authentication is working:

1. Connect the authenticated users to existing business features (contracts, analytics, etc.)
2. Update existing queries to use the profile role instead of organization memberships
3. Test all existing dashboard features with the new auth system

## Clean Up Old Authentication Code

After confirming the new system works, you can safely remove:

- Old migration files (001_initial_schema.sql, 002_row_level_security.sql, 003_seed_demo_data.sql)
- Debug page (if created)
- Any organization-related components that are no longer used

## Support

If you encounter issues:

1. Check browser console for errors
2. Check Supabase logs in the Dashboard
3. Use the debugging SQL queries provided above
4. Verify environment variables are correct
