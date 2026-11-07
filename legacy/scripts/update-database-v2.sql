-- BantayBuhay Database Update v2 - Add Face Registration Support
-- NOTE: This file has been merged into `init-database.sql` and is kept for historical/reference purposes.
-- Preferred action: run `scripts/init-database.sql` (it includes both initial schema and v2 additions/migrations).

USE bantaybuhay;

-- (The merged `registered_faces` creation and safe ALTER statements are included in `init-database.sql`)

-- For existing installations, the following safe ALTER statements are kept for reference (MySQL 8+):
ALTER TABLE registered_faces
  ADD COLUMN IF NOT EXISTS face_encoding TEXT,
  ADD COLUMN IF NOT EXISTS image_path VARCHAR(500),
  ADD COLUMN IF NOT EXISTS registered_by INT,
  ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Note: adding foreign key constraints unconditionally may fail if a constraint already exists.
-- If you need to add the `registered_by` foreign key, run the following manually if not present:
-- ALTER TABLE registered_faces ADD CONSTRAINT fk_registered_by FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE SET NULL;


-- Add locations table for map functionality
CREATE TABLE IF NOT EXISTS locations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  city VARCHAR(255) NOT NULL,
  province VARCHAR(255) DEFAULT 'Negros Occidental',
  barangay VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  responder_id INT,
  incident_id INT,
  marker_type ENUM('responder', 'incident', 'camera', 'station') DEFAULT 'station',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (responder_id) REFERENCES responders(id) ON DELETE SET NULL,
  FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE SET NULL,
  INDEX idx_city (city),
  INDEX idx_barangay (barangay)
);

-- Insert sample Negros Occidental locations (Kabankalan City and nearby areas)
INSERT INTO locations (city, province, barangay, latitude, longitude, marker_type) VALUES
('Kabankalan City', 'Negros Occidental', 'Poblacion', 9.9864, 122.8161, 'station'),
('Kabankalan City', 'Negros Occidental', 'Binicuil', 9.9920, 122.8240, 'station'),
('Kabankalan City', 'Negros Occidental', 'Camingawan', 9.9750, 122.8100, 'station'),
('Kabankalan City', 'Negros Occidental', 'Bantayan', 9.9800, 122.8200, 'station'),
('Ilog', 'Negros Occidental', 'Poblacion', 10.0472, 122.7453, 'station'),
('Cauayan', 'Negros Occidental', 'Poblacion', 9.9342, 123.1747, 'station'),
('Hinigaran', 'Negros Occidental', 'Poblacion', 10.2669, 122.8519, 'station'),
('Himamaylan', 'Negros Occidental', 'Poblacion', 10.1000, 122.8667, 'station'),
('Binalbagan', 'Negros Occidental', 'Poblacion', 10.1914, 122.8589, 'station');
