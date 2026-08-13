-- FIX USER ACCESS ISSUE
-- This script will link your user account to an organization

-- STEP 1: Find your user ID
-- Run this first and copy your user ID:
SELECT id, email FROM auth.users;

-- STEP 2: Check if you have a profile
SELECT * FROM profiles;

-- STEP 3: If no profile exists, create one (uncomment and replace the values)
/*
INSERT INTO profiles (id, full_name, email)
VALUES (
  'YOUR-USER-ID-FROM-STEP-1',  -- Replace with your user ID
  'Your Full Name',              -- Replace with your name
  'your.email@example.com'       -- Replace with your email
);
*/

-- STEP 4: Check existing organizations
SELECT id, name, organization_type FROM organizations;

-- STEP 5: Link your user to an existing organization (OPTION A - Use demo data)
-- If you ran migration 003_seed_demo_data.sql, link to demo organizations:

-- For PAYER access (uncomment and replace YOUR-USER-ID):
/*
INSERT INTO organization_members (organization_id, user_id, role, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',  -- Demo Medicare Payer
  'YOUR-USER-ID-FROM-STEP-1',               -- Your user ID
  'PAYER_ADMIN',
  'APPROVED'
);
*/

-- For ACO access - Pioneer Health Network (uncomment and replace YOUR-USER-ID):
/*
INSERT INTO organization_members (organization_id, user_id, role, status)
VALUES (
  '00000000-0000-0000-0000-000000000002',  -- Pioneer Health Network
  'YOUR-USER-ID-FROM-STEP-1',               -- Your user ID
  'ACO_ADMIN',
  'APPROVED'
);
*/

-- STEP 6: OR Create a new organization and link to it (OPTION B - Fresh start)
/*
-- Create new organization
INSERT INTO organizations (name, organization_type, legal_name, identifier, verification_status, verified_at)
VALUES (
  'My Test Organization',
  'ACO',  -- or 'PAYER'
  'My Test Organization Inc',
  'TEST-' || NOW()::text,
  'APPROVED',
  NOW()
)
RETURNING id;

-- Copy the returned ID and use it below
-- Link user to the new organization (replace BOTH IDs):
INSERT INTO organization_members (organization_id, user_id, role, status)
VALUES (
  'ORG-ID-FROM-ABOVE',           -- Organization ID from previous query
  'YOUR-USER-ID-FROM-STEP-1',    -- Your user ID
  'ACO_ADMIN',                    -- or 'PAYER_ADMIN'
  'APPROVED'
);

-- If ACO type, create ACO record:
INSERT INTO acos (organization_id, aco_identifier, name, program_type, status, verification_status)
VALUES (
  'ORG-ID-FROM-ABOVE',
  'ACO-TEST-' || NOW()::text,
  'My Test Organization',
  'MSSP Basic',
  'ACTIVE',
  'APPROVED'
);
*/

-- STEP 7: Verify the fix worked
SELECT 
  u.email,
  om.role,
  om.status,
  o.name as organization_name,
  o.organization_type
FROM auth.users u
JOIN profiles p ON p.id = u.id
JOIN organization_members om ON om.user_id = u.id
JOIN organizations o ON o.id = om.organization_id
WHERE u.id = 'YOUR-USER-ID-FROM-STEP-1';  -- Replace with your user ID
