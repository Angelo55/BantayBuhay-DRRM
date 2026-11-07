ALTER TABLE cameras
  ADD COLUMN last_seen_at timestamptz,
  DROP COLUMN status;

ALTER TABLE incidents
  ADD COLUMN source text NOT NULL DEFAULT 'report' CHECK (source IN ('report', 'detection')),
  ADD COLUMN camera_id uuid REFERENCES cameras (id);

CREATE TABLE detections (
  id uuid PRIMARY KEY,
  camera_id uuid NOT NULL REFERENCES cameras (id),
  incident_type text NOT NULL
    CHECK (incident_type IN ('fire_smoke', 'person_down', 'flood', 'sos_gesture')),
  confidence real NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  model_version text NOT NULL,
  snapshot_path text,
  captured_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  review_status text NOT NULL
    CHECK (review_status IN ('alerted', 'attached', 'pending', 'confirmed', 'rejected')),
  incident_id uuid REFERENCES incidents (id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES users (id),
  reviewed_at timestamptz
);
CREATE INDEX detections_pending ON detections (received_at) WHERE review_status = 'pending';
CREATE INDEX detections_incident ON detections (incident_id);
