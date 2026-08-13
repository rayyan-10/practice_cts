-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE organization_type AS ENUM ('PAYER', 'ACO', 'PROVIDER_GROUP');
CREATE TYPE verification_status AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE user_role AS ENUM ('PAYER_ADMIN', 'PAYER_ANALYST', 'ACO_ADMIN', 'ACO_ANALYST');
CREATE TYPE contract_type AS ENUM ('MSSP_BASIC', 'MSSP_ENHANCED', 'REACH', 'NEXT_GEN', 'CUSTOM');
CREATE TYPE risk_arrangement AS ENUM ('ONE_SIDED', 'TWO_SIDED');
CREATE TYPE contract_status AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED');
CREATE TYPE provider_type AS ENUM ('PHYSICIAN', 'HOSPITAL', 'SPECIALIST', 'CLINIC', 'SNF', 'HOME_HEALTH', 'OTHER');
CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE alert_type AS ENUM ('FINANCIAL', 'QUALITY', 'PROVIDER', 'PATIENT_RISK', 'CONTRACT', 'DATA_QUALITY');
CREATE TYPE alert_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE alert_status AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');
CREATE TYPE performance_status AS ENUM ('EXCELLENT', 'GOOD', 'NEEDS_ATTENTION', 'POOR', 'CRITICAL');

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    organization_type organization_type NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    identifier VARCHAR(100) UNIQUE NOT NULL,
    website VARCHAR(255),
    email_domain VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    country VARCHAR(100) DEFAULT 'United States',
    phone VARCHAR(50),
    verification_status verification_status DEFAULT 'PENDING',
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    job_title VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization members table
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    status verification_status DEFAULT 'APPROVED',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- ACOs table
CREATE TABLE acos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    aco_identifier VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    program_type VARCHAR(100),
    status contract_status DEFAULT 'ACTIVE',
    verification_status verification_status DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contracts table
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aco_id UUID NOT NULL REFERENCES acos(id) ON DELETE CASCADE,
    payer_organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    contract_name VARCHAR(255) NOT NULL,
    contract_type contract_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    benchmark_amount DECIMAL(15, 2) NOT NULL,
    sharing_rate DECIMAL(5, 4) NOT NULL, -- 0.5000 = 50%
    risk_arrangement risk_arrangement NOT NULL,
    minimum_savings_rate DECIMAL(5, 4) DEFAULT 0.0200, -- 2%
    minimum_loss_rate DECIMAL(5, 4) DEFAULT 0.0200, -- 2%
    quality_withhold_rate DECIMAL(5, 4) DEFAULT 0.0000,
    status contract_status DEFAULT 'ACTIVE',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contract versions table
CREATE TABLE contract_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    configuration_json JSONB NOT NULL,
    change_reason TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contract_id, version_number)
);

-- Providers table
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aco_id UUID NOT NULL REFERENCES acos(id) ON DELETE CASCADE,
    provider_identifier VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    provider_type provider_type NOT NULL,
    specialty VARCHAR(255),
    location VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    status contract_status DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(aco_id, provider_identifier)
);

-- Beneficiaries table (de-identified)
CREATE TABLE beneficiaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aco_id UUID NOT NULL REFERENCES acos(id) ON DELETE CASCADE,
    external_reference VARCHAR(100) NOT NULL,
    risk_level risk_level DEFAULT 'LOW',
    risk_score DECIMAL(5, 2) DEFAULT 0.00,
    age_band VARCHAR(20),
    gender VARCHAR(20),
    chronic_condition_count INTEGER DEFAULT 0,
    attribution_date DATE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(aco_id, external_reference)
);

-- Claims table
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    service_date DATE NOT NULL,
    service_category VARCHAR(100),
    diagnosis_category VARCHAR(100),
    procedure_code VARCHAR(50),
    allowed_amount DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) NOT NULL,
    claim_status VARCHAR(50) DEFAULT 'PAID',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality measures table
CREATE TABLE quality_measures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    measure_code VARCHAR(50) NOT NULL,
    measure_name VARCHAR(255) NOT NULL,
    measure_category VARCHAR(100),
    target_value DECIMAL(5, 2) NOT NULL,
    actual_value DECIMAL(5, 2),
    previous_value DECIMAL(5, 2),
    measurement_period VARCHAR(50),
    measurement_date DATE,
    status performance_status,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provider performance table
CREATE TABLE provider_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    period VARCHAR(50) NOT NULL,
    patient_count INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
    cost_per_patient DECIMAL(10, 2) NOT NULL DEFAULT 0,
    quality_score DECIMAL(5, 2),
    readmission_rate DECIMAL(5, 2),
    ed_utilization_rate DECIMAL(5, 2),
    hospitalization_rate DECIMAL(5, 2),
    risk_score DECIMAL(5, 2),
    performance_status performance_status,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider_id, contract_id, period)
);

-- Contract performance table
CREATE TABLE contract_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    period VARCHAR(50) NOT NULL,
    beneficiary_count INTEGER NOT NULL DEFAULT 0,
    benchmark DECIMAL(15, 2) NOT NULL,
    actual_expenditure DECIMAL(15, 2) NOT NULL,
    projected_expenditure DECIMAL(15, 2),
    variance DECIMAL(15, 2),
    variance_percentage DECIMAL(5, 2),
    potential_savings DECIMAL(15, 2),
    potential_losses DECIMAL(15, 2),
    quality_score DECIMAL(5, 2),
    risk_score DECIMAL(5, 2),
    performance_status performance_status,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contract_id, period)
);

-- Alerts table
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    aco_id UUID REFERENCES acos(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    alert_type alert_type NOT NULL,
    severity alert_severity NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status alert_status DEFAULT 'OPEN',
    metadata JSONB,
    acknowledged_by UUID REFERENCES profiles(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES profiles(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recommendations table
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aco_id UUID NOT NULL REFERENCES acos(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    beneficiary_group VARCHAR(100),
    recommendation_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    expected_impact TEXT,
    priority VARCHAR(50),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_organization_members_org ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user ON organization_members(user_id);
CREATE INDEX idx_acos_org ON acos(organization_id);
CREATE INDEX idx_contracts_aco ON contracts(aco_id);
CREATE INDEX idx_contracts_payer ON contracts(payer_organization_id);
CREATE INDEX idx_providers_aco ON providers(aco_id);
CREATE INDEX idx_beneficiaries_aco ON beneficiaries(aco_id);
CREATE INDEX idx_claims_beneficiary ON claims(beneficiary_id);
CREATE INDEX idx_claims_provider ON claims(provider_id);
CREATE INDEX idx_claims_service_date ON claims(service_date);
CREATE INDEX idx_quality_measures_contract ON quality_measures(contract_id);
CREATE INDEX idx_provider_performance_provider ON provider_performance(provider_id);
CREATE INDEX idx_provider_performance_contract ON provider_performance(contract_id);
CREATE INDEX idx_contract_performance_contract ON contract_performance(contract_id);
CREATE INDEX idx_alerts_org ON alerts(organization_id);
CREATE INDEX idx_alerts_aco ON alerts(aco_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_recommendations_aco ON recommendations(aco_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_acos_updated_at BEFORE UPDATE ON acos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_beneficiaries_updated_at BEFORE UPDATE ON beneficiaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quality_measures_updated_at BEFORE UPDATE ON quality_measures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_performance_updated_at BEFORE UPDATE ON provider_performance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_performance_updated_at BEFORE UPDATE ON contract_performance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
