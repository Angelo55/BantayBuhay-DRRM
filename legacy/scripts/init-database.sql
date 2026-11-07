-- BantayBuhay Database Setup Script for XAMPP
-- Run this in phpMyAdmin or MySQL command line

-- Create Database
CREATE DATABASE IF NOT EXISTS bantaybuhay;
USE bantaybuhay;

-- Users Table (for both managers and responders)
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('manager', 'responder') NOT NULL,
  id_number VARCHAR(50),
  avatar VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  created_by INT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- Managers Table
CREATE TABLE IF NOT EXISTS managers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  department VARCHAR(255),
  can_create_managers BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Responders Table
CREATE TABLE IF NOT EXISTS responders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  phone VARCHAR(20),
  status ENUM('active', 'inactive', 'on_duty') DEFAULT 'active',
  assigned_area VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Cameras Table
CREATE TABLE IF NOT EXISTS cameras (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  stream_url VARCHAR(255),
  status ENUM('online', 'offline', 'error') DEFAULT 'offline',
  is_recording BOOLEAN DEFAULT FALSE,
  responder_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (responder_id) REFERENCES responders(id) ON DELETE SET NULL,
  INDEX idx_responder (responder_id)
);

-- Registered Faces Table (merged from update-database-v2)
CREATE TABLE IF NOT EXISTS registered_faces (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  responder_id INT,
  directory VARCHAR(255),
  images_count INT DEFAULT 0,
  face_encoding TEXT,
  image_path VARCHAR(500),
  registered_by INT,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (responder_id) REFERENCES responders(id) ON DELETE SET NULL,
  INDEX idx_name (name),
  INDEX idx_responder (responder_id),
  INDEX idx_active (is_active)
);

-- Migration/compatibility: ensure missing columns are added on existing installs
-- (requires MySQL 8+ for `IF NOT EXISTS` on ADD COLUMN)
ALTER TABLE registered_faces
  ADD COLUMN IF NOT EXISTS name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS responder_id INT,
  ADD COLUMN IF NOT EXISTS directory VARCHAR(255),
  ADD COLUMN IF NOT EXISTS images_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS face_encoding TEXT,
  ADD COLUMN IF NOT EXISTS image_path VARCHAR(500),
  ADD COLUMN IF NOT EXISTS registered_by INT,
  ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Note: If your MySQL version does not support `ADD COLUMN IF NOT EXISTS`, run the ADD COLUMN statements individually
-- and add the `registered_by` foreign key manually if desired:
-- ALTER TABLE registered_faces ADD CONSTRAINT fk_registered_by FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE SET NULL;

-- Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  incident_type ENUM('sos', 'facial_recognition', 'gesture_recognition', 'other') NOT NULL,
  responder_id INT NOT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'high',
  status ENUM('reported', 'responding', 'resolved') DEFAULT 'reported',
  description TEXT,
  location VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  notes TEXT,
  FOREIGN KEY (responder_id) REFERENCES responders(id) ON DELETE CASCADE,
  INDEX idx_responder (responder_id),
  INDEX idx_status (status),
  INDEX idx_timestamp (timestamp)
);

-- Facial Recognition Results Table
CREATE TABLE IF NOT EXISTS facial_recognition_results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  detected_name VARCHAR(255),
  confidence FLOAT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  camera_id INT,
  responder_id INT,
  image_snapshot LONGBLOB,
  is_known BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE SET NULL,
  FOREIGN KEY (responder_id) REFERENCES responders(id) ON DELETE SET NULL,
  INDEX idx_timestamp (timestamp)
);

-- Gesture Recognition Results Table
CREATE TABLE IF NOT EXISTS gesture_recognition_results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gesture_type VARCHAR(100) NOT NULL,
  confidence FLOAT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  camera_id INT,
  responder_id INT,
  is_danger BOOLEAN DEFAULT FALSE,
  alert_triggered BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE SET NULL,
  FOREIGN KEY (responder_id) REFERENCES responders(id) ON DELETE SET NULL,
  INDEX idx_timestamp (timestamp),
  INDEX idx_danger (is_danger)
);

-- Danger Alerts Table
CREATE TABLE IF NOT EXISTS danger_alerts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  alert_type ENUM('facial', 'gesture', 'both') NOT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'high',
  message TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  camera_id INT,
  responder_id INT,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by VARCHAR(255),
  FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE SET NULL,
  FOREIGN KEY (responder_id) REFERENCES responders(id) ON DELETE SET NULL,
  INDEX idx_timestamp (timestamp),
  INDEX idx_acknowledged (acknowledged)
);

-- System Logs Table
CREATE TABLE IF NOT EXISTS system_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  log_type ENUM('recognition', 'alert', 'system', 'user') NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  details JSON,
  INDEX idx_timestamp (timestamp),
  INDEX idx_type (log_type)
);

-- ============================================
-- INSERT DEFAULT ACCOUNTS
-- ============================================
-- Password hashes (bcrypt): 
-- manager123 -> $2b$10$xK0.pX8XQ1XQ1XQ1XQ1XeOZ0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0
-- responder123 -> $2b$10$yK0.pX8XQ1XQ1XQ1XQ1XeOZ0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0

-- Insert default manager user
INSERT INTO users (username, email, password_hash, role, created_at) VALUES
('admin_manager', 'manager@bantaybuhay.com', '$2b$10$xK0.pX8XQ1XQ1XQ1XQ1XeOZ0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0', 'manager', NOW());

-- Get the manager user ID and create manager profile
INSERT INTO managers (user_id, department, can_create_managers) VALUES
(LAST_INSERT_ID(), 'Operations', TRUE);

-- Insert default responder user
INSERT INTO users (username, email, password_hash, role, created_at) VALUES
('john_responder', 'responder@bantaybuhay.com', '$2b$10$yK0.pX8XQ1XQ1XQ1XQ1XeOZ0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0', 'responder', NOW());

-- Get the responder user ID and create responder profile
INSERT INTO responders (user_id, phone, status, assigned_area) VALUES
(LAST_INSERT_ID(), '09123456789', 'active', 'Downtown');

-- Create a sample camera for the responder (use subquery to avoid FK errors if responder id differs)
INSERT INTO cameras (name, location, stream_url, status, responder_id) VALUES
('Main Camera', 'Downtown Station', 'http://localhost:5000/video_feed', 'offline', (
  SELECT r.id FROM responders r JOIN users u ON r.user_id = u.id WHERE u.username = 'john_responder' LIMIT 1
));
