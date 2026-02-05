-- Audit Logs Table
-- Tracks all user activities, changes, login events, IP addresses, and device information

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT,
  user_id TEXT,
  user_email TEXT,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  action_details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_info TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  is_deleted INTEGER DEFAULT 0
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_is_deleted ON audit_logs(is_deleted);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_timestamp ON audit_logs(organization_id, timestamp DESC);
