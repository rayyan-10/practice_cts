-- ============================================================================
-- SIMPLIFIED AUTHENTICATION SYSTEM - SINGLE EXECUTION SCRIPT
-- ============================================================================
-- Copy and paste this entire script into Supabase SQL Editor and click RUN
-- ============================================================================

-- Step 1: Drop existing complex structures (if they exist)
-- WARNING: This will remove organization-based authentication data
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

-- ============================================================================
-- VERIFICATION (Optional - run these separately to verify setup)
-- ============================================================================

-- Verify table structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
-- ORDER BY ordinal_position;

-- Verify RLS policies
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename = 'profiles';

-- Verify triggers
-- SELECT trigger_name, event_object_table
-- FROM information_schema.triggers
-- WHERE event_object_table = 'users'
-- AND trigger_schema = 'auth';

-- ============================================================================
-- Setup complete! 
-- 
-- Next steps:
-- 1. Disable email confirmation in Supabase Dashboard:
--    Authentication → Providers → Email → Turn OFF "Confirm email" → Save
--
-- 2. Test signup at: http://localhost:5173/signup
-- 
-- 3. Test login at: http://localhost:5173/login
-- ============================================================================
