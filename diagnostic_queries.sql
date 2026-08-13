-- Run these queries in Supabase SQL Editor to diagnose the issue
-- Copy and paste each query one by one

-- Query 1: Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Query 2: Check auth users
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- Query 3: Check profiles
SELECT * FROM profiles;

-- Query 4: Check organizations
SELECT id, name, organization_type, verification_status 
FROM organizations;

-- Query 5: Check organization_members (THIS IS THE CRITICAL ONE)
SELECT 
  om.id,
  om.user_id,
  om.organization_id,
  om.role,
  om.status,
  p.email as user_email,
  o.name as org_name,
  o.organization_type
FROM organization_members om
LEFT JOIN profiles p ON p.id = om.user_id
LEFT JOIN organizations o ON o.id = om.organization_id;

-- Query 6: Check ACOs
SELECT * FROM acos;

-- Query 7: Find your user and see if they have organization access
-- Replace 'your-email@example.com' with your actual email
SELECT 
  u.id as user_id,
  u.email,
  p.id as profile_id,
  om.id as membership_id,
  om.organization_id,
  om.role,
  om.status,
  o.name as org_name
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN organization_members om ON om.user_id = u.id
LEFT JOIN organizations o ON o.id = om.organization_id
WHERE u.email = 'your-email@example.com';  -- CHANGE THIS TO YOUR EMAIL
