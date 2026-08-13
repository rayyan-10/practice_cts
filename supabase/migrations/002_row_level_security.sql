-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE acos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization IDs
CREATE OR REPLACE FUNCTION get_user_organization_ids(user_uuid UUID)
RETURNS TABLE(organization_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT om.organization_id
    FROM organization_members om
    WHERE om.user_id = user_uuid AND om.status = 'APPROVED';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is payer admin
CREATE OR REPLACE FUNCTION is_payer_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM organization_members om
        JOIN organizations o ON o.id = om.organization_id
        WHERE om.user_id = user_uuid
        AND om.role IN ('PAYER_ADMIN', 'PAYER_ANALYST')
        AND o.organization_type = 'PAYER'
        AND om.status = 'APPROVED'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's ACO IDs
CREATE OR REPLACE FUNCTION get_user_aco_ids(user_uuid UUID)
RETURNS TABLE(aco_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT a.id
    FROM organization_members om
    JOIN acos a ON a.organization_id = om.organization_id
    WHERE om.user_id = user_uuid AND om.status = 'APPROVED';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Organizations policies
CREATE POLICY "Users can view their own organizations"
    ON organizations FOR SELECT
    USING (
        id IN (SELECT organization_id FROM get_user_organization_ids(auth.uid()))
        OR is_payer_admin(auth.uid())
    );

CREATE POLICY "Payer admins can insert organizations"
    ON organizations FOR INSERT
    WITH CHECK (is_payer_admin(auth.uid()));

CREATE POLICY "Payer admins can update organizations"
    ON organizations FOR UPDATE
    USING (is_payer_admin(auth.uid()));

-- Organization members policies
CREATE POLICY "Users can view members of their organizations"
    ON organization_members FOR SELECT
    USING (
        organization_id IN (SELECT organization_id FROM get_user_organization_ids(auth.uid()))
        OR is_payer_admin(auth.uid())
    );

CREATE POLICY "Organization admins can manage members"
    ON organization_members FOR ALL
    USING (
        organization_id IN (SELECT organization_id FROM get_user_organization_ids(auth.uid()))
        OR is_payer_admin(auth.uid())
    );

-- ACOs policies
CREATE POLICY "Payer admins can view all ACOs"
    ON acos FOR SELECT
    USING (is_payer_admin(auth.uid()));

CREATE POLICY "ACO users can view their own ACO"
    ON acos FOR SELECT
    USING (
        organization_id IN (SELECT organization_id FROM get_user_organization_ids(auth.uid()))
    );

CREATE POLICY "Payer admins can manage ACOs"
    ON acos FOR ALL
    USING (is_payer_admin(auth.uid()));

-- Contracts policies
CREATE POLICY "Payer admins can view all contracts"
    ON contracts FOR SELECT
    USING (is_payer_admin(auth.uid()));

CREATE POLICY "ACO users can view their contracts"
    ON contracts FOR SELECT
    USING (
        aco_id IN (SELECT aco_id FROM get_user_aco_ids(auth.uid()))
    );

CREATE POLICY "Payer admins can manage contracts"
    ON contracts FOR ALL
    USING (is_payer_admin(auth.uid()));

-- Contract versions policies
CREATE POLICY "Users can view contract versions for accessible contracts"
    ON contract_versions FOR SELECT
    USING (
        contract_id IN (
            SELECT id FROM contracts
            WHERE is_payer_admin(auth.uid())
            OR aco_id IN (SELECT aco_id FROM get_user_aco_ids(auth.uid()))
        )
    );

-- Providers policies
CREATE POLICY "Payer admins can view all providers"
    ON providers FOR SELECT
    USING (is_payer_admin(auth.uid()));

CREATE POLICY "ACO users can view their providers"
    ON providers FOR SELECT
    USING (
        aco_id IN (SELECT aco_id FROM get_user_aco_ids(auth.uid()))
    );

CREATE POLICY "ACO admins can manage their providers"
    ON providers FOR ALL
    USING (
        aco_id IN (SELECT aco_id FROM get_user_aco_ids(auth.uid()))
    );

-- Beneficiaries policies
CREATE POLICY "Payer admins can view all beneficiaries"
    ON beneficiaries FOR SELECT
    USING (is_payer_admin(auth.uid()));

CREATE POLICY "ACO users can view their beneficiaries"
    ON beneficiaries FOR SELECT
    USING (
        aco_id IN (SELECT aco_id FROM get_user_aco_ids(auth.uid()))
    );

-- Claims policies
CREATE POLICY "Payer admins can view all claims"
    ON claims FOR SELECT
    USING (is_payer_admin(auth.uid()));

CREATE POLICY "ACO users can view claims for their beneficiaries"
    ON claims FOR SELECT
    USING (
        beneficiary_id IN (
            SELECT id FROM beneficiaries
            WHERE aco_id IN (SELECT aco_id FROM get_user_aco_ids(auth.uid()))
        )
    );

-- Quality measures policies
CREATE POLICY "Users can view quality measures for accessible contracts"
    ON quality_measures FOR SELECT
    USING (
        contract_id IN (
            SELECT id FROM contracts
            WHERE is_payer_admin(auth.uid())
            OR aco_id IN (SELECT aco_id FROM get_user_aco_ids(auth.uid()))
        )
    );

CREATE POLICY "Payer admins can manage quality measures"
    ON quality_measures FOR ALL
    USING (is_payer_admin(auth.uid()));

-- Provider performance policies
CREATE POLICY "Payer admins can view all provider performance"
    ON provider_performance FOR SELECT
    USING (is_payer_admin(auth.uid()));

CREATE POLICY "ACO users can view their provider performance"
    ON provider_performance FOR SELECT
    USING (
        provider_id IN (
            SELECT id FROM providers
            WHERE aco_id IN (SELECT aco_id FROM get_user_aco_ids(auth.uid()))
        )
    );

-- Contract performance policies
CREATE POLICY "Payer admins can view all contract performance"
    ON contract_performance FOR SELECT
    USING (is_payer_admin(auth.uid()));

CREATE POLICY "ACO users can view their contract performance"
    ON contract_performance FOR SELECT
    USING (
        contract_id IN (
            SELECT id FROM contracts
            WHERE aco_id IN (SELECT aco_id FROM get_user_aco_ids(auth.uid()))
        )
    );

-- Alerts policies
CREATE POLICY "Users can view alerts for their organizations"
    ON alerts FOR SELECT
    USING (
        organization_id IN (SELECT organization_id FROM get_user_organization_ids(auth.uid()))
        OR aco_id IN (SELECT aco_id FROM get_user_aco_ids(auth.uid()))
        OR is_payer_admin(auth.uid())
    );

CREATE POLICY "Users can update alerts for their organizations"
    ON alerts FOR UPDATE
    USING (
        organization_id IN (SELECT organization_id FROM get_user_organization_ids(auth.uid()))
        OR aco_id IN (SELECT aco_id FROM get_user_aco_ids(auth.uid()))
        OR is_payer_admin(auth.uid())
    );

-- Recommendations policies
CREATE POLICY "ACO users can view their recommendations"
    ON recommendations FOR SELECT
    USING (
        aco_id IN (SELECT aco_id FROM get_user_aco_ids(auth.uid()))
        OR is_payer_admin(auth.uid())
    );

CREATE POLICY "ACO users can manage their recommendations"
    ON recommendations FOR ALL
    USING (
        aco_id IN (SELECT aco_id FROM get_user_aco_ids(auth.uid()))
    );

-- Audit logs policies
CREATE POLICY "Users can view audit logs for their organizations"
    ON audit_logs FOR SELECT
    USING (
        organization_id IN (SELECT organization_id FROM get_user_organization_ids(auth.uid()))
        OR is_payer_admin(auth.uid())
    );

CREATE POLICY "System can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (true);
