-- ============================================================================
-- MIGRATION 005: RECONCILE AUTH AND ACO ACCESS
-- ============================================================================
-- CONFIRMED DATABASE STATE (read-only inspection performed before this migration):
--   Applied:     001_initial_schema, 002_row_level_security,
--                003_seed_demo_data, 100_simplified_auth
--   NOT applied: 005 (this file)
--
-- Tables that EXIST (created by 001, survived 100):
--   profiles, contracts, contract_versions, alerts, audit_logs,
--   contract_performance, quality_measures, providers, beneficiaries,
--   provider_performance, recommendations
--
-- Tables that DO NOT EXIST (dropped by 100 with CASCADE):
--   organizations, acos, organization_members
--
-- Active breakage:
--   RLS functions from 002 (is_payer_admin, get_user_aco_ids,
--   get_user_organization_ids) reference the dropped organization_members
--   table. Any query that triggers RLS evaluation on contracts,
--   quality_measures, providers, beneficiaries, provider_performance,
--   or contract_performance fails with:
--     42P01: relation "organization_members" does not exist
--
-- FK breakage (Scenario C):
--   Migration 001 created contract_versions.created_by,
--   alerts.acknowledged_by, alerts.resolved_by, and audit_logs.user_id
--   as REFERENCES profiles(id). After migration 100, profiles.id is a
--   gen_random_uuid() — not the auth UUID. Those FKs must point to
--   auth.users(id) instead.
--
-- What this migration does:
--   1.  Ensures all enum types exist (safe DO-block guards).
--   2.  Recreates organizations and acos (dropped by 100) using
--       CREATE TABLE IF NOT EXISTS — no-op if they somehow exist.
--   2b. Fixes the four broken FK constraints on existing tables.
--   3.  Creates profile_aco_assignments (new lean ACO-user join table).
--   4.  Adds indexes (all IF NOT EXISTS).
--   5.  Ensures updated_at trigger function exists (CREATE OR REPLACE).
--   6.  Drops all stale RLS policies from migrations 002 and 100 by name.
--   7.  Drops the three broken RLS helper functions from 002.
--       Creates two new helper functions: is_payer_user, get_user_aco_id.
--   8.  Re-creates ALL RLS policies — idempotent (DROP IF EXISTS first).
--   9.  Re-seeds demo data (ON CONFLICT DO NOTHING).
--
-- IDEMPOTENT: safe to run multiple times on the same database.
-- NO DESTRUCTIVE DROPS on data tables.
-- NO changes to the profiles table or handle_new_user trigger.
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS & ENUM TYPES
-- ============================================================================
-- PostgreSQL has no CREATE TYPE IF NOT EXISTS, so each type is guarded
-- with a DO block that silently swallows duplicate_object errors.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE organization_type AS ENUM ('PAYER', 'ACO', 'PROVIDER_GROUP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE verification_status AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('PAYER_ADMIN', 'PAYER_ANALYST', 'ACO_ADMIN', 'ACO_ANALYST');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE contract_type AS ENUM ('MSSP_BASIC', 'MSSP_ENHANCED', 'REACH', 'NEXT_GEN', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE risk_arrangement AS ENUM ('ONE_SIDED', 'TWO_SIDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE contract_status AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE provider_type AS ENUM ('PHYSICIAN', 'HOSPITAL', 'SPECIALIST', 'CLINIC', 'SNF', 'HOME_HEALTH', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE alert_type AS ENUM ('FINANCIAL', 'QUALITY', 'PROVIDER', 'PATIENT_RISK', 'CONTRACT', 'DATA_QUALITY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE alert_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE alert_status AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE performance_status AS ENUM ('EXCELLENT', 'GOOD', 'NEEDS_ATTENTION', 'POOR', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- SECTION 2: RECREATE TABLES DROPPED BY MIGRATION 100
-- ============================================================================
-- organizations and acos were dropped by migration 100 with CASCADE.
-- All other business tables (contracts, providers, etc.) survived because
-- migration 100 only explicitly dropped organizations, acos, and
-- organization_members — the remaining tables lost their FK targets but
-- the tables themselves still exist.
-- CREATE TABLE IF NOT EXISTS is a no-op if the table already exists.

-- Organizations ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(255) NOT NULL,
    organization_type   organization_type NOT NULL,
    legal_name          VARCHAR(255) NOT NULL,
    identifier          VARCHAR(100) UNIQUE NOT NULL,
    website             VARCHAR(255),
    email_domain        VARCHAR(255),
    address             TEXT,
    city                VARCHAR(100),
    state               VARCHAR(50),
    zip                 VARCHAR(20),
    country             VARCHAR(100) DEFAULT 'United States',
    phone               VARCHAR(50),
    verification_status verification_status DEFAULT 'PENDING',
    verified_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ACOs ------------------------------------------------------------------------
-- The FK from contracts, providers, beneficiaries, and recommendations to
-- acos(id) was originally set ON DELETE CASCADE in migration 001. Those
-- tables survived migration 100 because their rows had no parent in a
-- dropped table (acos was dropped, taking the FK target away, but
-- PostgreSQL CASCADE on DROP TABLE cascades the DROP not just the rows).
-- Recreating acos here restores the referential integrity target.
CREATE TABLE IF NOT EXISTS acos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    aco_identifier      VARCHAR(100) UNIQUE NOT NULL,
    name                VARCHAR(255) NOT NULL,
    program_type        VARCHAR(100),
    status              contract_status DEFAULT 'ACTIVE',
    verification_status verification_status DEFAULT 'PENDING',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 2b: FK RECONCILIATION FOR EXISTING TABLES (SCENARIO C FIX)
-- ============================================================================
-- Migration 001 created three tables with FKs pointing to profiles(id).
-- At that time profiles.id was the auth UUID (profiles.id PRIMARY KEY
-- REFERENCES auth.users(id)).
--
-- Migration 100 dropped and recreated profiles with:
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid()   ← now a random UUID
--   user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id)
--
-- After migration 100, profiles.id is no longer the auth UUID.
-- The old FKs in contract_versions, alerts, and audit_logs now reference
-- the wrong column for user identification. This section re-points them
-- to auth.users(id) directly.
--
-- Constraint names follow PostgreSQL auto-naming: {table}_{column}_fkey
-- Verified from migration 001 source (no explicit constraint names used).
--
-- Each operation is wrapped in its own DO block:
--   DROP: uses IF EXISTS — silent no-op if constraint is already gone.
--   ADD:  catches duplicate_object — silent no-op if already correct.

-- contract_versions.created_by ------------------------------------------------
DO $$ BEGIN
    ALTER TABLE contract_versions
        DROP CONSTRAINT IF EXISTS contract_versions_created_by_fkey;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE contract_versions
        ADD CONSTRAINT contract_versions_created_by_fkey
            FOREIGN KEY (created_by)
            REFERENCES auth.users(id)
            ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- alerts.acknowledged_by ------------------------------------------------------
DO $$ BEGIN
    ALTER TABLE alerts
        DROP CONSTRAINT IF EXISTS alerts_acknowledged_by_fkey;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE alerts
        ADD CONSTRAINT alerts_acknowledged_by_fkey
            FOREIGN KEY (acknowledged_by)
            REFERENCES auth.users(id)
            ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- alerts.resolved_by ----------------------------------------------------------
DO $$ BEGIN
    ALTER TABLE alerts
        DROP CONSTRAINT IF EXISTS alerts_resolved_by_fkey;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE alerts
        ADD CONSTRAINT alerts_resolved_by_fkey
            FOREIGN KEY (resolved_by)
            REFERENCES auth.users(id)
            ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- audit_logs.user_id ----------------------------------------------------------
DO $$ BEGIN
    ALTER TABLE audit_logs
        DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE audit_logs
        ADD CONSTRAINT audit_logs_user_id_fkey
            FOREIGN KEY (user_id)
            REFERENCES auth.users(id)
            ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- SECTION 3: PROFILE → ACO ASSIGNMENT TABLE
-- ============================================================================
-- New table — does not exist in any prior migration.
-- Provides a direct, single-row-per-ACO-user mapping:
--   user_id = auth.users UUID (same value as profiles.user_id)
--   aco_id  = acos.id UUID
--
-- Design rules:
--   - PAYER users have NO row here; their role column alone grants access.
--   - ACO users have EXACTLY ONE row (UNIQUE on user_id enforces this).
--   - This table is NOT writable via the anon key.
--     Rows are inserted by a service-role admin only.
--   - RLS below allows each user to SELECT their own row.

CREATE TABLE IF NOT EXISTS profile_aco_assignments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    aco_id      UUID NOT NULL REFERENCES acos(id)       ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_aco_assignments_user ON profile_aco_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_aco_assignments_aco  ON profile_aco_assignments(aco_id);

-- ============================================================================
-- SECTION 4: INDEXES ON BUSINESS TABLES
-- ============================================================================
-- All guarded with IF NOT EXISTS — safe to re-run.

CREATE INDEX IF NOT EXISTS idx_acos_org                      ON acos(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_aco                 ON contracts(aco_id);
CREATE INDEX IF NOT EXISTS idx_contracts_payer               ON contracts(payer_organization_id);
CREATE INDEX IF NOT EXISTS idx_providers_aco                 ON providers(aco_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_aco             ON beneficiaries(aco_id);
CREATE INDEX IF NOT EXISTS idx_claims_beneficiary            ON claims(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_claims_provider               ON claims(provider_id);
CREATE INDEX IF NOT EXISTS idx_claims_service_date           ON claims(service_date);
CREATE INDEX IF NOT EXISTS idx_quality_measures_contract     ON quality_measures(contract_id);
CREATE INDEX IF NOT EXISTS idx_provider_performance_provider ON provider_performance(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_performance_contract ON provider_performance(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_performance_contract ON contract_performance(contract_id);
CREATE INDEX IF NOT EXISTS idx_alerts_org                    ON alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_alerts_aco                    ON alerts(aco_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status                 ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_aco           ON recommendations(aco_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user               ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org                ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created            ON audit_logs(created_at);

-- ============================================================================
-- SECTION 5: UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
-- CREATE OR REPLACE is idempotent — safe to run over any existing version.
-- Trigger creation uses DO blocks to swallow duplicate_object errors.
-- Note: profiles already has the set_updated_at trigger from migration 100.
-- We do not recreate it here.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    CREATE TRIGGER update_organizations_updated_at
        BEFORE UPDATE ON organizations
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER update_acos_updated_at
        BEFORE UPDATE ON acos
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER update_contracts_updated_at
        BEFORE UPDATE ON contracts
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER update_providers_updated_at
        BEFORE UPDATE ON providers
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER update_beneficiaries_updated_at
        BEFORE UPDATE ON beneficiaries
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER update_quality_measures_updated_at
        BEFORE UPDATE ON quality_measures
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER update_provider_performance_updated_at
        BEFORE UPDATE ON provider_performance
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER update_contract_performance_updated_at
        BEFORE UPDATE ON contract_performance
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER update_recommendations_updated_at
        BEFORE UPDATE ON recommendations
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- SECTION 6: DROP ALL STALE RLS POLICIES
-- ============================================================================
-- Drops every policy created by migrations 002 and 100, by exact name.
-- DROP POLICY IF EXISTS is a no-op when the policy does not exist.
-- Policies on tables that do not yet exist (organizations, acos) are
-- also safe — DROP POLICY IF EXISTS handles missing tables gracefully
-- when the table itself doesn't exist we skip those with DO blocks.

-- profiles (migration 002 used auth.uid() = id; migration 100 created
-- "Users can read own profile" and "Users can update own profile")
DROP POLICY IF EXISTS "Users can view their own profile"  ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile"         ON profiles;
DROP POLICY IF EXISTS "Users can update own profile"       ON profiles;

-- contracts
DROP POLICY IF EXISTS "Payer admins can view all contracts" ON contracts;
DROP POLICY IF EXISTS "ACO users can view their contracts"  ON contracts;
DROP POLICY IF EXISTS "Payer admins can manage contracts"   ON contracts;

-- contract_versions
DROP POLICY IF EXISTS "Users can view contract versions for accessible contracts" ON contract_versions;

-- providers
DROP POLICY IF EXISTS "Payer admins can view all providers"   ON providers;
DROP POLICY IF EXISTS "ACO users can view their providers"    ON providers;
DROP POLICY IF EXISTS "ACO admins can manage their providers" ON providers;

-- beneficiaries
DROP POLICY IF EXISTS "Payer admins can view all beneficiaries" ON beneficiaries;
DROP POLICY IF EXISTS "ACO users can view their beneficiaries"  ON beneficiaries;

-- claims
DROP POLICY IF EXISTS "Payer admins can view all claims"                  ON claims;
DROP POLICY IF EXISTS "ACO users can view claims for their beneficiaries" ON claims;

-- quality_measures
DROP POLICY IF EXISTS "Users can view quality measures for accessible contracts" ON quality_measures;
DROP POLICY IF EXISTS "Payer admins can manage quality measures"                 ON quality_measures;

-- provider_performance
DROP POLICY IF EXISTS "Payer admins can view all provider performance" ON provider_performance;
DROP POLICY IF EXISTS "ACO users can view their provider performance"  ON provider_performance;

-- contract_performance
DROP POLICY IF EXISTS "Payer admins can view all contract performance" ON contract_performance;
DROP POLICY IF EXISTS "ACO users can view their contract performance"  ON contract_performance;

-- alerts
DROP POLICY IF EXISTS "Users can view alerts for their organizations"  ON alerts;
DROP POLICY IF EXISTS "Users can update alerts for their organizations" ON alerts;

-- recommendations
DROP POLICY IF EXISTS "ACO users can view their recommendations"  ON recommendations;
DROP POLICY IF EXISTS "ACO users can manage their recommendations" ON recommendations;

-- audit_logs
DROP POLICY IF EXISTS "Users can view audit logs for their organizations" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs"                      ON audit_logs;

-- organizations and acos (tables were dropped by 100 so these may not exist;
-- wrapped in DO blocks to avoid "relation does not exist" errors)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their own organizations" ON organizations;
    DROP POLICY IF EXISTS "Payer admins can insert organizations"  ON organizations;
    DROP POLICY IF EXISTS "Payer admins can update organizations"  ON organizations;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Payer admins can view all ACOs"  ON acos;
    DROP POLICY IF EXISTS "ACO users can view their own ACO" ON acos;
    DROP POLICY IF EXISTS "Payer admins can manage ACOs"     ON acos;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================================
-- SECTION 7: RLS HELPER FUNCTIONS
-- ============================================================================
-- Drop the three broken functions from migration 002 (they reference
-- the dropped organization_members table and error at runtime).
-- Then create two new SECURITY DEFINER functions that only query
-- profiles and profile_aco_assignments — tables guaranteed to exist.

-- 7a. Drop the broken helpers from migration 002.
--     DROP FUNCTION IF EXISTS with explicit argument types is precise
--     and will not accidentally drop unrelated overloads.
DROP FUNCTION IF EXISTS is_payer_admin(UUID);
DROP FUNCTION IF EXISTS get_user_organization_ids(UUID);
DROP FUNCTION IF EXISTS get_user_aco_ids(UUID);

-- 7b. is_payer_user(user_uuid UUID) → BOOLEAN
--     Returns TRUE when the given auth UUID has role = 'PAYER' in profiles.
--     SECURITY DEFINER: executes as the function owner, bypasses RLS on
--     profiles so the lookup always works even when profiles has RLS enabled.
--     SET search_path = public: prevents search-path injection attacks.
CREATE OR REPLACE FUNCTION is_payer_user(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM profiles
        WHERE user_id = user_uuid
          AND role = 'PAYER'
    );
END;
$$;

-- 7c. get_user_aco_id(user_uuid UUID) → UUID
--     Returns the aco_id assigned to this user, or NULL if none exists.
--     ACO-scoped policies use: aco_id = get_user_aco_id(auth.uid())
--     A PAYER user has no assignment row → returns NULL →
--     NULL = anything is FALSE → PAYER falls through to is_payer_user().
--     An ACO user with no assignment row also gets NULL → sees nothing
--     (secure default until an admin assigns them).
CREATE OR REPLACE FUNCTION get_user_aco_id(user_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_aco_id UUID;
BEGIN
    SELECT aco_id
    INTO v_aco_id
    FROM profile_aco_assignments
    WHERE user_id = user_uuid;

    RETURN v_aco_id;
END;
$$;

-- ============================================================================
-- SECTION 8: ENABLE RLS + CREATE ALL POLICIES (IDEMPOTENT)
-- ============================================================================
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY is idempotent.
-- Every CREATE POLICY is preceded by DROP POLICY IF EXISTS for the same
-- name and table — making this section fully re-runnable.

-- ── profiles ─────────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
    ON profiles FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- ── profile_aco_assignments ───────────────────────────────────────────────────
ALTER TABLE profile_aco_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aco_assignments_select_own" ON profile_aco_assignments;
CREATE POLICY "aco_assignments_select_own"
    ON profile_aco_assignments FOR SELECT
    USING (auth.uid() = user_id);

-- ── organizations ─────────────────────────────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- PAYER: all organizations.
-- ACO:   only the organization that owns their assigned ACO.
-- Uses IN (SELECT ...) rather than = (SELECT ...) to be safe against
-- any future scenario where multiple rows could be returned.
DROP POLICY IF EXISTS "organizations_select" ON organizations;
CREATE POLICY "organizations_select"
    ON organizations FOR SELECT
    USING (
        is_payer_user(auth.uid())
        OR id IN (
            SELECT organization_id
            FROM acos
            WHERE id = get_user_aco_id(auth.uid())
        )
    );

DROP POLICY IF EXISTS "organizations_insert_payer" ON organizations;
CREATE POLICY "organizations_insert_payer"
    ON organizations FOR INSERT
    WITH CHECK (is_payer_user(auth.uid()));

DROP POLICY IF EXISTS "organizations_update_payer" ON organizations;
CREATE POLICY "organizations_update_payer"
    ON organizations FOR UPDATE
    USING (is_payer_user(auth.uid()));

-- ── acos ──────────────────────────────────────────────────────────────────────
ALTER TABLE acos ENABLE ROW LEVEL SECURITY;

-- PAYER: all ACOs.
-- ACO:   only their assigned ACO.
DROP POLICY IF EXISTS "acos_select" ON acos;
CREATE POLICY "acos_select"
    ON acos FOR SELECT
    USING (
        is_payer_user(auth.uid())
        OR id = get_user_aco_id(auth.uid())
    );

DROP POLICY IF EXISTS "acos_insert_payer" ON acos;
CREATE POLICY "acos_insert_payer"
    ON acos FOR INSERT
    WITH CHECK (is_payer_user(auth.uid()));

DROP POLICY IF EXISTS "acos_update_payer" ON acos;
CREATE POLICY "acos_update_payer"
    ON acos FOR UPDATE
    USING (is_payer_user(auth.uid()));

-- ── contracts ─────────────────────────────────────────────────────────────────
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contracts_select" ON contracts;
CREATE POLICY "contracts_select"
    ON contracts FOR SELECT
    USING (
        is_payer_user(auth.uid())
        OR aco_id = get_user_aco_id(auth.uid())
    );

DROP POLICY IF EXISTS "contracts_insert_payer" ON contracts;
CREATE POLICY "contracts_insert_payer"
    ON contracts FOR INSERT
    WITH CHECK (is_payer_user(auth.uid()));

DROP POLICY IF EXISTS "contracts_update_payer" ON contracts;
CREATE POLICY "contracts_update_payer"
    ON contracts FOR UPDATE
    USING (is_payer_user(auth.uid()));

-- ── contract_versions ─────────────────────────────────────────────────────────
ALTER TABLE contract_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_versions_select" ON contract_versions;
CREATE POLICY "contract_versions_select"
    ON contract_versions FOR SELECT
    USING (
        contract_id IN (
            SELECT id FROM contracts
            WHERE is_payer_user(auth.uid())
               OR aco_id = get_user_aco_id(auth.uid())
        )
    );

DROP POLICY IF EXISTS "contract_versions_insert_payer" ON contract_versions;
CREATE POLICY "contract_versions_insert_payer"
    ON contract_versions FOR INSERT
    WITH CHECK (is_payer_user(auth.uid()));

-- ── providers ─────────────────────────────────────────────────────────────────
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "providers_select" ON providers;
CREATE POLICY "providers_select"
    ON providers FOR SELECT
    USING (
        is_payer_user(auth.uid())
        OR aco_id = get_user_aco_id(auth.uid())
    );

DROP POLICY IF EXISTS "providers_insert_aco" ON providers;
CREATE POLICY "providers_insert_aco"
    ON providers FOR INSERT
    WITH CHECK (
        is_payer_user(auth.uid())
        OR aco_id = get_user_aco_id(auth.uid())
    );

DROP POLICY IF EXISTS "providers_update_aco" ON providers;
CREATE POLICY "providers_update_aco"
    ON providers FOR UPDATE
    USING (
        is_payer_user(auth.uid())
        OR aco_id = get_user_aco_id(auth.uid())
    );

-- ── beneficiaries ─────────────────────────────────────────────────────────────
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "beneficiaries_select" ON beneficiaries;
CREATE POLICY "beneficiaries_select"
    ON beneficiaries FOR SELECT
    USING (
        is_payer_user(auth.uid())
        OR aco_id = get_user_aco_id(auth.uid())
    );

-- ── claims ────────────────────────────────────────────────────────────────────
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "claims_select" ON claims;
CREATE POLICY "claims_select"
    ON claims FOR SELECT
    USING (
        is_payer_user(auth.uid())
        OR beneficiary_id IN (
            SELECT id FROM beneficiaries
            WHERE aco_id = get_user_aco_id(auth.uid())
        )
    );

-- ── quality_measures ──────────────────────────────────────────────────────────
ALTER TABLE quality_measures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quality_measures_select" ON quality_measures;
CREATE POLICY "quality_measures_select"
    ON quality_measures FOR SELECT
    USING (
        is_payer_user(auth.uid())
        OR contract_id IN (
            SELECT id FROM contracts
            WHERE aco_id = get_user_aco_id(auth.uid())
        )
    );

DROP POLICY IF EXISTS "quality_measures_insert_payer" ON quality_measures;
CREATE POLICY "quality_measures_insert_payer"
    ON quality_measures FOR INSERT
    WITH CHECK (is_payer_user(auth.uid()));

DROP POLICY IF EXISTS "quality_measures_update_payer" ON quality_measures;
CREATE POLICY "quality_measures_update_payer"
    ON quality_measures FOR UPDATE
    USING (is_payer_user(auth.uid()));

-- ── provider_performance ──────────────────────────────────────────────────────
ALTER TABLE provider_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provider_performance_select" ON provider_performance;
CREATE POLICY "provider_performance_select"
    ON provider_performance FOR SELECT
    USING (
        is_payer_user(auth.uid())
        OR provider_id IN (
            SELECT id FROM providers
            WHERE aco_id = get_user_aco_id(auth.uid())
        )
    );

-- ── contract_performance ──────────────────────────────────────────────────────
ALTER TABLE contract_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_performance_select" ON contract_performance;
CREATE POLICY "contract_performance_select"
    ON contract_performance FOR SELECT
    USING (
        is_payer_user(auth.uid())
        OR contract_id IN (
            SELECT id FROM contracts
            WHERE aco_id = get_user_aco_id(auth.uid())
        )
    );

-- ── alerts ────────────────────────────────────────────────────────────────────
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alerts_select" ON alerts;
CREATE POLICY "alerts_select"
    ON alerts FOR SELECT
    USING (
        is_payer_user(auth.uid())
        OR aco_id = get_user_aco_id(auth.uid())
    );

DROP POLICY IF EXISTS "alerts_update" ON alerts;
CREATE POLICY "alerts_update"
    ON alerts FOR UPDATE
    USING (
        is_payer_user(auth.uid())
        OR aco_id = get_user_aco_id(auth.uid())
    );

-- ── recommendations ───────────────────────────────────────────────────────────
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recommendations_select" ON recommendations;
CREATE POLICY "recommendations_select"
    ON recommendations FOR SELECT
    USING (
        is_payer_user(auth.uid())
        OR aco_id = get_user_aco_id(auth.uid())
    );

DROP POLICY IF EXISTS "recommendations_insert_aco" ON recommendations;
CREATE POLICY "recommendations_insert_aco"
    ON recommendations FOR INSERT
    WITH CHECK (
        is_payer_user(auth.uid())
        OR aco_id = get_user_aco_id(auth.uid())
    );

DROP POLICY IF EXISTS "recommendations_update_aco" ON recommendations;
CREATE POLICY "recommendations_update_aco"
    ON recommendations FOR UPDATE
    USING (
        is_payer_user(auth.uid())
        OR aco_id = get_user_aco_id(auth.uid())
    );

-- ── audit_logs ────────────────────────────────────────────────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- PAYER users read all logs. ACO users cannot read audit logs (cross-ACO data).
-- Any authenticated user may insert their own log entries.
DROP POLICY IF EXISTS "audit_logs_select_payer" ON audit_logs;
CREATE POLICY "audit_logs_select_payer"
    ON audit_logs FOR SELECT
    USING (is_payer_user(auth.uid()));

DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON audit_logs;
CREATE POLICY "audit_logs_insert_authenticated"
    ON audit_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- SECTION 9: RESEED DEMO DATA
-- ============================================================================
-- All inserts use ON CONFLICT (id) DO NOTHING.
-- Safe to re-run: existing rows are never modified or deleted.
-- Insert order follows FK dependency:
--   organizations → acos → contracts → providers → beneficiaries
--   → quality_measures → provider_performance → contract_performance
--   → alerts → recommendations

-- Organizations ---------------------------------------------------------------
INSERT INTO organizations
    (id, name, organization_type, legal_name, identifier,
     email_domain, city, state, zip, verification_status, verified_at)
VALUES
    ('00000000-0000-0000-0000-000000000001',
     'Demo Medicare Payer', 'PAYER', 'Demo Medicare Payer LLC',
     'PAYER-001', 'payer.demo', 'Baltimore', 'MD', '21244', 'APPROVED', NOW()),
    ('00000000-0000-0000-0000-000000000002',
     'Pioneer Health Network', 'ACO', 'Pioneer Health Network Inc',
     'ACO-2024-001', 'pioneer-health.demo', 'Boston', 'MA', '02101', 'APPROVED', NOW()),
    ('00000000-0000-0000-0000-000000000003',
     'Community Care Alliance', 'ACO', 'Community Care Alliance LLC',
     'ACO-2024-007', 'community-care.demo', 'Chicago', 'IL', '60601', 'APPROVED', NOW())
ON CONFLICT (id) DO NOTHING;

-- ACOs ------------------------------------------------------------------------
INSERT INTO acos
    (id, organization_id, aco_identifier, name, program_type,
     status, verification_status)
VALUES
    ('00000000-0000-0000-0000-000000000011',
     '00000000-0000-0000-0000-000000000002',
     'ACO-2024-001', 'Pioneer Health Network',
     'MSSP Enhanced', 'ACTIVE', 'APPROVED'),
    ('00000000-0000-0000-0000-000000000012',
     '00000000-0000-0000-0000-000000000003',
     'ACO-2024-007', 'Community Care Alliance',
     'MSSP Basic', 'ACTIVE', 'APPROVED')
ON CONFLICT (id) DO NOTHING;

-- Contracts -------------------------------------------------------------------
INSERT INTO contracts
    (id, aco_id, payer_organization_id, contract_number, contract_name,
     contract_type, start_date, end_date, benchmark_amount, sharing_rate,
     risk_arrangement, minimum_savings_rate, minimum_loss_rate, status)
VALUES
    ('00000000-0000-0000-0000-000000000021',
     '00000000-0000-0000-0000-000000000011',
     '00000000-0000-0000-0000-000000000001',
     'CONTRACT-2024-001', 'Pioneer Health Network MSSP Agreement',
     'MSSP_ENHANCED', '2024-01-01', '2026-12-31',
     124500000.00, 0.5000, 'TWO_SIDED', 0.0200, 0.0200, 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000022',
     '00000000-0000-0000-0000-000000000012',
     '00000000-0000-0000-0000-000000000001',
     'CONTRACT-2024-007', 'Community Care Alliance MSSP Agreement',
     'MSSP_BASIC', '2024-01-01', '2026-12-31',
     186200000.00, 0.5000, 'ONE_SIDED', 0.0200, 0.0000, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Providers -------------------------------------------------------------------
INSERT INTO providers
    (id, aco_id, provider_identifier, name, provider_type,
     specialty, city, state, status)
VALUES
    ('00000000-0000-0000-0000-000000000031',
     '00000000-0000-0000-0000-000000000011',
     'PRV-001', 'Dr. Sarah Chen', 'PHYSICIAN',
     'Primary Care', 'Boston', 'MA', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000032',
     '00000000-0000-0000-0000-000000000011',
     'PRV-042', 'Regional Hospital System', 'HOSPITAL',
     'General Hospital', 'Boston', 'MA', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000033',
     '00000000-0000-0000-0000-000000000011',
     'PRV-089', 'Metro Specialty Clinic', 'CLINIC',
     'Specialty Care', 'Cambridge', 'MA', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Beneficiaries ---------------------------------------------------------------
INSERT INTO beneficiaries
    (id, aco_id, external_reference, risk_level, risk_score,
     age_band, gender, chronic_condition_count, attribution_date, status)
VALUES
    ('00000000-0000-0000-0000-000000000041',
     '00000000-0000-0000-0000-000000000011',
     'BEN-001', 'HIGH', 87.50, '75-84', 'F', 4, '2024-01-01', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000042',
     '00000000-0000-0000-0000-000000000011',
     'BEN-002', 'MEDIUM', 62.30, '65-74', 'M', 2, '2024-01-01', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000043',
     '00000000-0000-0000-0000-000000000011',
     'BEN-003', 'LOW', 28.10, '65-74', 'F', 1, '2024-01-01', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Quality measures ------------------------------------------------------------
INSERT INTO quality_measures
    (id, contract_id, measure_code, measure_name, measure_category,
     target_value, actual_value, previous_value, measurement_period, status)
VALUES
    ('00000000-0000-0000-0000-000000000051',
     '00000000-0000-0000-0000-000000000021',
     'ACO-13', 'Falls: Screening for Future Fall Risk', 'Patient Safety',
     80.00, 87.20, 85.10, 'Q2-2026', 'EXCELLENT'),
    ('00000000-0000-0000-0000-000000000052',
     '00000000-0000-0000-0000-000000000021',
     'ACO-27', 'Diabetes: Hemoglobin A1c Control', 'Chronic Disease Management',
     75.00, 81.50, 79.80, 'Q2-2026', 'GOOD'),
    ('00000000-0000-0000-0000-000000000053',
     '00000000-0000-0000-0000-000000000021',
     'ACO-42', 'Preventive Care and Screening', 'Preventive Care',
     85.00, 81.00, 83.20, 'Q2-2026', 'NEEDS_ATTENTION')
ON CONFLICT (id) DO NOTHING;

-- Provider performance --------------------------------------------------------
INSERT INTO provider_performance
    (id, provider_id, contract_id, period, patient_count, total_cost,
     cost_per_patient, quality_score, readmission_rate,
     hospitalization_rate, performance_status)
VALUES
    ('00000000-0000-0000-0000-000000000061',
     '00000000-0000-0000-0000-000000000031',
     '00000000-0000-0000-0000-000000000021',
     '2026-Q2', 450, 3690000.00, 8200.00, 94.20, 8.50, 10.20, 'EXCELLENT'),
    ('00000000-0000-0000-0000-000000000062',
     '00000000-0000-0000-0000-000000000032',
     '00000000-0000-0000-0000-000000000021',
     '2026-Q2', 1200, 11760000.00, 9800.00, 87.50, 12.30, 15.60, 'GOOD'),
    ('00000000-0000-0000-0000-000000000063',
     '00000000-0000-0000-0000-000000000033',
     '00000000-0000-0000-0000-000000000021',
     '2026-Q2', 320, 4640000.00, 14500.00, 76.30, 18.20, 22.40, 'POOR')
ON CONFLICT (id) DO NOTHING;

-- Contract performance --------------------------------------------------------
INSERT INTO contract_performance
    (id, contract_id, period, beneficiary_count, benchmark,
     actual_expenditure, projected_expenditure, variance,
     variance_percentage, potential_savings, quality_score,
     risk_score, performance_status)
VALUES
    ('00000000-0000-0000-0000-000000000071',
     '00000000-0000-0000-0000-000000000021',
     '2026-Q2', 12450, 62250000.00, 57150000.00, 114300000.00,
     5100000.00, 8.19, 5100000.00, 91.20, 15.30, 'EXCELLENT'),
    ('00000000-0000-0000-0000-000000000072',
     '00000000-0000-0000-0000-000000000022',
     '2026-Q2', 18230, 93100000.00, 89300000.00, 178600000.00,
     3800000.00, 4.08, 3800000.00, 87.50, 22.10, 'GOOD')
ON CONFLICT (id) DO NOTHING;

-- Alerts ----------------------------------------------------------------------
-- Note: organization_id values reference the organizations rows inserted above.
-- The alerts table's organization_id column has no FK constraint after
-- migration 100 dropped organizations — the column exists as a plain UUID.
-- Referential integrity is restored logically by the seed order above.
INSERT INTO alerts
    (id, organization_id, aco_id, contract_id,
     alert_type, severity, title, description, status)
VALUES
    ('00000000-0000-0000-0000-000000000081',
     '00000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000011',
     '00000000-0000-0000-0000-000000000021',
     'QUALITY', 'MEDIUM',
     'Preventive Care Measure Below Target',
     'ACO-42 Preventive Care and Screening is currently at 81.0%, below the target of 85.0%',
     'OPEN'),
    ('00000000-0000-0000-0000-000000000082',
     '00000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-000000000011',
     NULL,
     'PROVIDER', 'HIGH',
     'Provider Cost Anomaly Detected',
     'Metro Specialty Clinic (PRV-089) cost per patient is 54.8% above ACO average',
     'OPEN')
ON CONFLICT (id) DO NOTHING;

-- Recommendations -------------------------------------------------------------
INSERT INTO recommendations
    (id, aco_id, provider_id, beneficiary_group, recommendation_type,
     title, description, expected_impact, priority, status)
VALUES
    ('00000000-0000-0000-0000-000000000091',
     '00000000-0000-0000-0000-000000000011',
     NULL, 'HIGH_RISK', 'CARE_MANAGEMENT',
     'High-Risk Patient Outreach',
     '320 high-risk beneficiaries identified for proactive care management intervention. Focus on patients with multiple chronic conditions and recent hospitalizations.',
     'Potential savings: $840,000. Expected readmission reduction: 15%',
     'HIGH', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000092',
     '00000000-0000-0000-0000-000000000011',
     NULL, 'PREVENTIVE_GAP', 'QUALITY_IMPROVEMENT',
     'Preventive Care Gap Closure',
     '580 beneficiaries are overdue for preventive screenings including mammograms, colonoscopies, and diabetes screening.',
     'Quality score impact: +2.1%. Potential for early disease detection and reduced future costs.',
     'MEDIUM', 'ACTIVE'),
    ('00000000-0000-0000-0000-000000000093',
     '00000000-0000-0000-0000-000000000011',
     '00000000-0000-0000-0000-000000000033',
     NULL, 'PROVIDER_INTERVENTION',
     'Provider Performance Improvement',
     'Metro Specialty Clinic shows significantly higher cost per patient. Recommend review of referral patterns and utilization management.',
     'Potential savings: $450,000 if cost per patient reduced to ACO average',
     'HIGH', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SECTION 10: POST-MIGRATION INSTRUCTIONS & VERIFICATION QUERIES
-- ============================================================================
--
-- ── ASSIGNING ACO USERS ──────────────────────────────────────────────────────
-- After running this migration, link each ACO-role user to their ACO by
-- inserting a row into profile_aco_assignments using the service-role key
-- (Supabase dashboard → SQL Editor, or a server-side admin script):
--
--   INSERT INTO profile_aco_assignments (user_id, aco_id)
--   VALUES ('<auth-user-uuid>', '<aco-uuid>')
--   ON CONFLICT (user_id) DO UPDATE SET aco_id = EXCLUDED.aco_id;
--
-- To find auth user UUIDs:
--   SELECT id, email FROM auth.users;
--
-- Demo ACO UUIDs seeded above:
--   Pioneer Health Network  → '00000000-0000-0000-0000-000000000011'
--   Community Care Alliance → '00000000-0000-0000-0000-000000000012'
--
-- PAYER-role users do NOT need a profile_aco_assignments row.
-- Their role = 'PAYER' in profiles is sufficient to pass is_payer_user().
--
-- ── VERIFICATION QUERIES ─────────────────────────────────────────────────────
-- Run these after applying the migration to confirm correct state.
--
-- 1. All expected tables exist:
--    SELECT table_name
--    FROM information_schema.tables
--    WHERE table_schema = 'public'
--    ORDER BY table_name;
--    -- Expected: acos, alerts, audit_logs, beneficiaries, claims,
--    --   contract_performance, contract_versions, contracts, organizations,
--    --   profile_aco_assignments, profiles, provider_performance,
--    --   providers, quality_measures, recommendations
--
-- 2. RLS is enabled on every table:
--    SELECT tablename, rowsecurity
--    FROM pg_tables
--    WHERE schemaname = 'public'
--    ORDER BY tablename;
--    -- Every row should show rowsecurity = true
--
-- 3. New policies exist and old broken policies are gone:
--    SELECT tablename, policyname, cmd
--    FROM pg_policies
--    WHERE schemaname = 'public'
--    ORDER BY tablename, policyname;
--    -- Should NOT contain any policy whose name starts with "Payer admins",
--    --   "ACO users", "ACO admins", "Users can view", "System can insert"
--    -- SHOULD contain short-named policies: acos_select, contracts_select,
--    --   profiles_select_own, aco_assignments_select_own, etc.
--
-- 4. New helper functions exist and old broken ones are gone:
--    SELECT proname, prosecdef
--    FROM pg_proc
--    WHERE pronamespace = 'public'::regnamespace
--      AND proname IN (
--        'is_payer_user', 'get_user_aco_id',
--        'is_payer_admin', 'get_user_aco_ids', 'get_user_organization_ids'
--      );
--    -- Should return exactly 2 rows: is_payer_user and get_user_aco_id
--    -- Both should show prosecdef = true (SECURITY DEFINER)
--
-- 5. FK constraints on contract_versions, alerts, audit_logs now reference
--    auth.users, not profiles:
--    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table,
--           ccu.column_name AS foreign_column, rc.delete_rule
--    FROM information_schema.table_constraints tc
--    JOIN information_schema.key_column_usage kcu
--      ON tc.constraint_name = kcu.constraint_name
--    JOIN information_schema.constraint_column_usage ccu
--      ON tc.constraint_name = ccu.constraint_name
--    JOIN information_schema.referential_constraints rc
--      ON tc.constraint_name = rc.constraint_name
--    WHERE tc.constraint_type = 'FOREIGN KEY'
--      AND tc.table_name IN ('contract_versions', 'alerts', 'audit_logs')
--      AND kcu.column_name IN
--        ('created_by', 'acknowledged_by', 'resolved_by', 'user_id')
--    ORDER BY tc.table_name, kcu.column_name;
--    -- foreign_table should be 'users' (auth.users), NOT 'profiles'
--
-- 6. Demo seed data counts:
--    SELECT 'organizations'     AS tbl, count(*) FROM organizations
--    UNION ALL
--    SELECT 'acos',                     count(*) FROM acos
--    UNION ALL
--    SELECT 'contracts',                count(*) FROM contracts
--    UNION ALL
--    SELECT 'providers',                count(*) FROM providers
--    UNION ALL
--    SELECT 'beneficiaries',            count(*) FROM beneficiaries
--    UNION ALL
--    SELECT 'quality_measures',         count(*) FROM quality_measures
--    UNION ALL
--    SELECT 'provider_performance',     count(*) FROM provider_performance
--    UNION ALL
--    SELECT 'contract_performance',     count(*) FROM contract_performance
--    UNION ALL
--    SELECT 'alerts',                   count(*) FROM alerts
--    UNION ALL
--    SELECT 'recommendations',          count(*) FROM recommendations;
--    -- Expected: 3, 2, 2, 3, 3, 3, 3, 2, 2, 3
--
-- 7. Confirm the broken RLS error is resolved (run as the anon role):
--    SET ROLE anon;
--    SELECT id FROM contracts LIMIT 1;
--    -- Should return 0 rows (RLS restricts anon), NOT error 42P01
--    RESET ROLE;
-- ============================================================================
