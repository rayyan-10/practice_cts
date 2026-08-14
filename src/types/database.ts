// ─── Scalar enum types ────────────────────────────────────────────────────────

export type UserRole = 'PAYER' | 'ACO';
export type OrganizationType = 'PAYER' | 'ACO' | 'PROVIDER_GROUP';
export type VerificationStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type ContractType = 'MSSP_BASIC' | 'MSSP_ENHANCED' | 'REACH' | 'NEXT_GEN' | 'CUSTOM';
export type RiskArrangement = 'ONE_SIDED' | 'TWO_SIDED';
export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'TERMINATED';
export type ProviderType = 'PHYSICIAN' | 'HOSPITAL' | 'SPECIALIST' | 'CLINIC' | 'SNF' | 'HOME_HEALTH' | 'OTHER';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertType = 'FINANCIAL' | 'QUALITY' | 'PROVIDER' | 'PATIENT_RISK' | 'CONTRACT' | 'DATA_QUALITY';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
export type PerformanceStatus = 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'POOR' | 'CRITICAL';

// ─── Identity & auth tables ───────────────────────────────────────────────────

/**
 * Mirrors the `profiles` table created by migration 100.
 *
 * Key schema notes:
 *  - `id`      — gen_random_uuid(), NOT the auth UUID.
 *  - `user_id` — the auth.users UUID; this is what auth.ts and RLS use.
 *  - `role`    — 'PAYER' | 'ACO'; set at signup and stored in the DB.
 *
 * Do not use `id` to identify users in application code — always use `user_id`.
 */
export interface Profile {
  id: string;        // row PK (gen_random_uuid) — not the auth UUID
  user_id: string;   // auth.users UUID — use this everywhere
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

/**
 * Mirrors the `profile_aco_assignments` table created by migration 005.
 *
 * Rules:
 *  - One row per ACO user (UNIQUE on user_id).
 *  - PAYER users have no row in this table.
 *  - Not user-writeable via the anon key — insert/update via service role only.
 *  - `user_id` matches auth.users UUID (same as profiles.user_id).
 */
export interface ProfileAcoAssignment {
  id: string;
  user_id: string;   // auth.users UUID
  aco_id: string;    // acos.id UUID
  assigned_at: string;
}

// ─── Organization tables ──────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  organization_type: OrganizationType;
  legal_name: string;
  identifier: string;
  website?: string;
  email_domain?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  verification_status: VerificationStatus;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── ACO & contract tables ────────────────────────────────────────────────────

export interface ACO {
  id: string;
  organization_id: string;
  aco_identifier: string;
  name: string;
  program_type?: string;
  status: ContractStatus;
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
  // Joined relations (present when query uses select with nested relation)
  organization?: Organization;
}

export interface Contract {
  id: string;
  aco_id: string;
  payer_organization_id: string;
  contract_number: string;
  contract_name: string;
  contract_type: ContractType;
  start_date: string;
  end_date: string;
  benchmark_amount: number;
  sharing_rate: number;
  risk_arrangement: RiskArrangement;
  minimum_savings_rate: number;
  minimum_loss_rate: number;
  quality_withhold_rate: number;
  status: ContractStatus;
  version: number;
  created_at: string;
  updated_at: string;
  aco?: ACO;
}

export interface ContractVersion {
  id: string;
  contract_id: string;
  version_number: number;
  configuration_json: Record<string, unknown>;
  change_reason?: string;
  created_by?: string;
  created_at: string;
}

export interface Provider {
  id: string;
  aco_id: string;
  provider_identifier: string;
  name: string;
  provider_type: ProviderType;
  specialty?: string;
  location?: string;
  city?: string;
  state?: string;
  zip?: string;
  status: ContractStatus;
  created_at: string;
  updated_at: string;
}

export interface Beneficiary {
  id: string;
  aco_id: string;
  external_reference: string;
  risk_level: RiskLevel;
  risk_score: number;
  age_band?: string;
  gender?: string;
  chronic_condition_count: number;
  attribution_date?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Claim {
  id: string;
  beneficiary_id: string;
  provider_id: string;
  service_date: string;
  service_category?: string;
  diagnosis_category?: string;
  procedure_code?: string;
  allowed_amount: number;
  paid_amount: number;
  claim_status: string;
  created_at: string;
}

// ─── Performance & clinical tables ───────────────────────────────────────────

export interface QualityMeasure {
  id: string;
  contract_id: string;
  measure_code: string;
  measure_name: string;
  measure_category?: string;
  target_value: number;
  actual_value?: number;
  previous_value?: number;
  measurement_period?: string;
  measurement_date?: string;
  status?: PerformanceStatus;
  created_at: string;
  updated_at: string;
}

export interface ProviderPerformance {
  id: string;
  provider_id: string;
  contract_id: string;
  period: string;
  patient_count: number;
  total_cost: number;
  cost_per_patient: number;
  quality_score?: number;
  readmission_rate?: number;
  ed_utilization_rate?: number;
  hospitalization_rate?: number;
  risk_score?: number;
  performance_status?: PerformanceStatus;
  created_at: string;
  updated_at: string;
  provider?: Provider;
}

export interface ContractPerformance {
  id: string;
  contract_id: string;
  period: string;
  beneficiary_count: number;
  benchmark: number;
  actual_expenditure: number;
  projected_expenditure?: number;
  variance?: number;
  variance_percentage?: number;
  potential_savings?: number;
  potential_losses?: number;
  quality_score?: number;
  risk_score?: number;
  performance_status?: PerformanceStatus;
  created_at: string;
  updated_at: string;
}

// ─── Alerts, recommendations & audit ─────────────────────────────────────────

export interface Alert {
  id: string;
  organization_id?: string;
  aco_id?: string;
  contract_id?: string;
  provider_id?: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  description?: string;
  status: AlertStatus;
  metadata?: Record<string, unknown>;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface Recommendation {
  id: string;
  aco_id: string;
  provider_id?: string;
  beneficiary_group?: string;
  recommendation_type: string;
  title: string;
  description: string;
  expected_impact?: string;
  priority?: string;
  status: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  organization_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
