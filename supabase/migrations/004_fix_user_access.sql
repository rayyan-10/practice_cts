-- Quick fix to link existing users to organizations
-- Run this in Supabase SQL Editor if you have users without organization access

-- Step 1: Check current auth users without organization membership
-- Copy your user ID from Supabase Auth dashboard

-- Step 2: Create a test organization (if needed)
INSERT INTO organizations (id, name, organization_type, legal_name, identifier, verification_status, verified_at)
VALUES 
  ('00000000-0000-0000-0000-000000000099', 'Test Organization', 'ACO', 'Test Organization Inc', 'TEST-ORG-001', 'APPROVED', NOW())
ON CONFLICT (id) DO NOTHING;

-- Step 3: Create ACO record for the test organization
INSERT INTO acos (id, organization_id, aco_identifier, name, program_type, status, verification_status)
VALUES 
  ('00000000-0000-0000-0000-000000000098', '00000000-0000-0000-0000-000000000099', 'ACO-TEST-001', 'Test Organization', 'MSSP Basic', 'ACTIVE', 'APPROVED')
ON CONFLICT (id) DO NOTHING;

-- Step 4: Link your user (REPLACE 'your-user-id-here' with your actual user ID from auth.users)
-- Get your user ID by running: SELECT id, email FROM auth.users;
-- Then uncomment and run:

/*
INSERT INTO organization_members (organization_id, user_id, role, status)
VALUES 
  ('00000000-0000-0000-0000-000000000099', 'your-user-id-here', 'ACO_ADMIN', 'APPROVED')
ON CONFLICT (organization_id, user_id) DO UPDATE 
  SET status = 'APPROVED', role = 'ACO_ADMIN';
*/

-- To link to demo payer organization instead:
/*
INSERT INTO organization_members (organization_id, user_id, role, status)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'your-user-id-here', 'PAYER_ADMIN', 'APPROVED')
ON CONFLICT (organization_id, user_id) DO UPDATE 
  SET status = 'APPROVED', role = 'PAYER_ADMIN';
*/
