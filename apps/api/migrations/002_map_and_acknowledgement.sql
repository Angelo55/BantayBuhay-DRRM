CREATE TABLE barangays (
  psgc text PRIMARY KEY,
  name text NOT NULL,
  boundary geometry (MultiPolygon, 4326) NOT NULL
);
CREATE INDEX barangays_boundary ON barangays USING gist (boundary);

CREATE TABLE cameras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  barangay_psgc text REFERENCES barangays (psgc),
  location geometry (Point, 4326) NOT NULL,
  stream_path text NOT NULL UNIQUE,
  is_simulated boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline'))
);

ALTER TABLE incidents
  ADD COLUMN acknowledged_at timestamptz,
  ADD COLUMN acknowledged_by uuid REFERENCES users (id),
  ADD CONSTRAINT incidents_barangay FOREIGN KEY (barangay_psgc) REFERENCES barangays (psgc);

ALTER TABLE civilian_profiles
  ADD CONSTRAINT civilian_profiles_barangay FOREIGN KEY (barangay_psgc) REFERENCES barangays (psgc);
