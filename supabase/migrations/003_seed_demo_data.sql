-- Seed Demo Data for VBC/ACO Analytics Platform
-- WARNING: This is SYNTHETIC data for demonstration purposes only

-- Create Payer Organization
INSERT INTO organizations (id, name, organization_type, legal_name, identifier, email_domain, city, state, zip, verification_status, verified_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Demo Medicare Payer', 'PAYER', 'Demo Medicare Payer LLC', 'PAYER-001', 'payer.demo', 'Baltimore', 'MD', '21244', 'APPROVED', NOW()),
  ('00000000-0000-0000-0000-000000000002', 'Pioneer Health Network', 'ACO', 'Pioneer Health Network Inc', 'ACO-2024-001', 'pioneer-health.demo', 'Boston', 'MA', '02101', 'APPROVED', NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Community Care Alliance', 'ACO', 'Community Care Alliance LLC', 'ACO-2024-007', 'community-care.demo', 'Chicago', 'IL', '60601', 'APPROVED', NOW());

-- Create ACOs
INSERT INTO acos (id, organization_id, aco_identifier, name, program_type, status, verification_status)
VALUES 
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000002', 'ACO-2024-001', 'Pioneer Health Network', 'MSSP Enhanced', 'ACTIVE', 'APPROVED'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000003', 'ACO-2024-007', 'Community Care Alliance', 'MSSP Basic', 'ACTIVE', 'APPROVED');

-- Create Contracts
INSERT INTO contracts (id, aco_id, payer_organization_id, contract_number, contract_name, contract_type, start_date, end_date, benchmark_amount, sharing_rate, risk_arrangement, minimum_savings_rate, minimum_loss_rate, status)
VALUES 
  (
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'CONTRACT-2024-001',
    'Pioneer Health Network MSSP Agreement',
    'MSSP_ENHANCED',
    '2024-01-01',
    '2026-12-31',
    124500000.00,
    0.5000,
    'TWO_SIDED',
    0.0200,
    0.0200,
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000022',
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000001',
    'CONTRACT-2024-007',
    'Community Care Alliance MSSP Agreement',
    'MSSP_BASIC',
    '2024-01-01',
    '2026-12-31',
    186200000.00,
    0.5000,
    'ONE_SIDED',
    0.0200,
    0.0000,
    'ACTIVE'
  );

-- Create Providers for Pioneer Health Network
INSERT INTO providers (id, aco_id, provider_identifier, name, provider_type, specialty, city, state, status)
VALUES 
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000011', 'PRV-001', 'Dr. Sarah Chen', 'PHYSICIAN', 'Primary Care', 'Boston', 'MA', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000011', 'PRV-042', 'Regional Hospital System', 'HOSPITAL', 'General Hospital', 'Boston', 'MA', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000011', 'PRV-089', 'Metro Specialty Clinic', 'CLINIC', 'Specialty Care', 'Cambridge', 'MA', 'ACTIVE');

-- Create Beneficiaries for Pioneer Health Network (sample)
INSERT INTO beneficiaries (id, aco_id, external_reference, risk_level, risk_score, age_band, gender, chronic_condition_count, attribution_date, status)
VALUES 
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000011', 'BEN-001', 'HIGH', 87.50, '75-84', 'F', 4, '2024-01-01', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000011', 'BEN-002', 'MEDIUM', 62.30, '65-74', 'M', 2, '2024-01-01', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000011', 'BEN-003', 'LOW', 28.10, '65-74', 'F', 1, '2024-01-01', 'ACTIVE');

-- Create Quality Measures
INSERT INTO quality_measures (id, contract_id, measure_code, measure_name, measure_category, target_value, actual_value, previous_value, measurement_period, status)
VALUES 
  (
    '00000000-0000-0000-0000-000000000051',
    '00000000-0000-0000-0000-000000000021',
    'ACO-13',
    'Falls: Screening for Future Fall Risk',
    'Patient Safety',
    80.00,
    87.20,
    85.10,
    'Q2-2026',
    'EXCELLENT'
  ),
  (
    '00000000-0000-0000-0000-000000000052',
    '00000000-0000-0000-0000-000000000021',
    'ACO-27',
    'Diabetes: Hemoglobin A1c Control',
    'Chronic Disease Management',
    75.00,
    81.50,
    79.80,
    'Q2-2026',
    'GOOD'
  ),
  (
    '00000000-0000-0000-0000-000000000053',
    '00000000-0000-0000-0000-000000000021',
    'ACO-42',
    'Preventive Care and Screening',
    'Preventive Care',
    85.00,
    81.00,
    83.20,
    'Q2-2026',
    'NEEDS_ATTENTION'
  );

-- Create Provider Performance Records
INSERT INTO provider_performance (id, provider_id, contract_id, period, patient_count, total_cost, cost_per_patient, quality_score, readmission_rate, hospitalization_rate, performance_status)
VALUES 
  (
    '00000000-0000-0000-0000-000000000061',
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000021',
    '2026-Q2',
    450,
    3690000.00,
    8200.00,
    94.20,
    8.50,
    10.20,
    'EXCELLENT'
  ),
  (
    '00000000-0000-0000-0000-000000000062',
    '00000000-0000-0000-0000-000000000032',
    '00000000-0000-0000-0000-000000000021',
    '2026-Q2',
    1200,
    11760000.00,
    9800.00,
    87.50,
    12.30,
    15.60,
    'GOOD'
  ),
  (
    '00000000-0000-0000-0000-000000000063',
    '00000000-0000-0000-0000-000000000033',
    '00000000-0000-0000-0000-000000000021',
    '2026-Q2',
    320,
    4640000.00,
    14500.00,
    76.30,
    18.20,
    22.40,
    'POOR'
  );

-- Create Contract Performance Records
INSERT INTO contract_performance (id, contract_id, period, beneficiary_count, benchmark, actual_expenditure, projected_expenditure, variance, variance_percentage, potential_savings, quality_score, risk_score, performance_status)
VALUES 
  (
    '00000000-0000-0000-0000-000000000071',
    '00000000-0000-0000-0000-000000000021',
    '2026-Q2',
    12450,
    62250000.00,
    57150000.00,
    114300000.00,
    5100000.00,
    8.19,
    5100000.00,
    91.20,
    15.30,
    'EXCELLENT'
  ),
  (
    '00000000-0000-0000-0000-000000000072',
    '00000000-0000-0000-0000-000000000022',
    '2026-Q2',
    18230,
    93100000.00,
    89300000.00,
    178600000.00,
    3800000.00,
    4.08,
    3800000.00,
    87.50,
    22.10,
    'GOOD'
  );

-- Create Alerts
INSERT INTO alerts (id, organization_id, aco_id, contract_id, alert_type, severity, title, description, status)
VALUES 
  (
    '00000000-0000-0000-0000-000000000081',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000021',
    'QUALITY',
    'MEDIUM',
    'Preventive Care Measure Below Target',
    'ACO-42 Preventive Care and Screening is currently at 81.0%, below the target of 85.0%',
    'OPEN'
  ),
  (
    '00000000-0000-0000-0000-000000000082',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000011',
    NULL,
    'PROVIDER',
    'HIGH',
    'Provider Cost Anomaly Detected',
    'Metro Specialty Clinic (PRV-089) cost per patient is 54.8% above ACO average',
    'OPEN'
  );

-- Create Recommendations
INSERT INTO recommendations (id, aco_id, provider_id, beneficiary_group, recommendation_type, title, description, expected_impact, priority, status)
VALUES 
  (
    '00000000-0000-0000-0000-000000000091',
    '00000000-0000-0000-0000-000000000011',
    NULL,
    'HIGH_RISK',
    'CARE_MANAGEMENT',
    'High-Risk Patient Outreach',
    '320 high-risk beneficiaries identified for proactive care management intervention. Focus on patients with multiple chronic conditions and recent hospitalizations.',
    'Potential savings: $840,000. Expected readmission reduction: 15%',
    'HIGH',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000092',
    '00000000-0000-0000-0000-000000000011',
    NULL,
    'PREVENTIVE_GAP',
    'QUALITY_IMPROVEMENT',
    'Preventive Care Gap Closure',
    '580 beneficiaries are overdue for preventive screenings including mammograms, colonoscopies, and diabetes screening.',
    'Quality score impact: +2.1%. Potential for early disease detection and reduced future costs.',
    'MEDIUM',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000093',
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000033',
    NULL,
    'PROVIDER_INTERVENTION',
    'Provider Performance Improvement',
    'Metro Specialty Clinic shows significantly higher cost per patient. Recommend review of referral patterns and utilization management.',
    'Potential savings: $450,000 if cost per patient reduced to ACO average',
    'HIGH',
    'ACTIVE'
  );

-- Note: In a real implementation, you would also need to:
-- 1. Create actual user accounts in Supabase Auth (cannot be done via SQL migration)
-- 2. Create corresponding profile records
-- 3. Link users to organizations via organization_members table
-- 4. Generate more comprehensive claims data
-- 5. Add more beneficiaries, providers, and performance records

-- To create demo user accounts:
-- Use the Supabase Dashboard Authentication section or signup page
-- Suggested demo accounts:
-- 1. payer-admin@payer.demo (PAYER_ADMIN role, linked to Payer organization)
-- 2. aco-admin@pioneer-health.demo (ACO_ADMIN role, linked to Pioneer Health Network)
-- 3. aco-admin@community-care.demo (ACO_ADMIN role, linked to Community Care Alliance)
