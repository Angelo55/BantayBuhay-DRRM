CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'operator', 'responder', 'civilian')),
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id ON sessions (user_id);

CREATE TABLE responder_profiles (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  unit text NOT NULL,
  duty_status text NOT NULL DEFAULT 'available'
    CHECK (duty_status IN ('available', 'on_call', 'off_duty'))
);

CREATE TABLE civilian_profiles (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  birth_date date NOT NULL,
  barangay_psgc text,
  medical_id_token text NOT NULL UNIQUE
);

CREATE TABLE incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type text NOT NULL
    CHECK (incident_type IN ('fire_smoke', 'person_down', 'flood', 'sos_gesture')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'detected'
    CHECK (status IN ('detected', 'verified', 'dispatched', 'on_scene', 'resolved', 'dismissed')),
  description text,
  location geometry (Point, 4326) NOT NULL,
  barangay_psgc text,
  created_by uuid REFERENCES users (id),
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX incidents_status ON incidents (status);
CREATE INDEX incidents_location ON incidents USING gist (location);

CREATE TABLE incident_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents (id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users (id),
  from_status text,
  to_status text NOT NULL,
  note text,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX incident_events_incident ON incident_events (incident_id, at);

CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents (id) ON DELETE CASCADE,
  responder_id uuid NOT NULL REFERENCES users (id),
  assigned_by uuid NOT NULL REFERENCES users (id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz
);
CREATE UNIQUE INDEX assignments_active ON assignments (incident_id, responder_id)
  WHERE released_at IS NULL;

CREATE TABLE audit_logs (
  id bigserial PRIMARY KEY,
  actor_id uuid,
  action text NOT NULL,
  entity text,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}',
  at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION reject_audit_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION reject_audit_change();
