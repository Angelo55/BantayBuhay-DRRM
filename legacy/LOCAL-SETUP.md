# BantayBuhay - Complete Local Setup Guide (XAMPP + Python + Next.js)

This guide will walk you through setting up the **entire BantayBuhay system** on your local machine using XAMPP.

---

## Prerequisites

Download and install these before starting:

| Software | Download Link | Purpose |
|----------|---------------|---------|
| **XAMPP** | https://www.apachefriends.org/ | MySQL Database |
| **Node.js 18+** | https://nodejs.org/ | Next.js Frontend |
| **Python 3.9+** | https://www.python.org/downloads/ | FastAPI Backend |
| **VS Code** (optional) | https://code.visualstudio.com/ | Code Editor |

---

## Folder Structure

Create this folder structure on your computer:

\`\`\`
C:\bantaybuhay\
├── frontend\          ← Next.js app (download from v0)
├── backend\           ← Python FastAPI (create manually)
│   ├── main.py
│   ├── requirements.txt
│   └── .env
└── database\          ← SQL scripts
    └── schema.sql
\`\`\`

---

## STEP 1: Set Up MySQL Database (XAMPP)

### 1.1 Start XAMPP
1. Open **XAMPP Control Panel**
2. Click **Start** next to **MySQL**
3. Click **Start** next to **Apache** (for phpMyAdmin)

### 1.2 Create Database
1. Open browser: **http://localhost/phpmyadmin**
2. Click **"New"** in the left sidebar
3. Enter database name: `bantaybuhay`
4. Click **Create**

### 1.3 Run This SQL Script
Click on your `bantaybuhay` database, then go to **SQL** tab and paste:

\`\`\`sql
-- =============================================
-- BANTAYBUHAY DATABASE SCHEMA
-- Run this in phpMyAdmin SQL tab
-- =============================================

-- Users Table (for login)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'responder') DEFAULT 'responder',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- Cameras Table
CREATE TABLE cameras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    stream_url VARCHAR(500),
    status ENUM('online', 'offline', 'error') DEFAULT 'offline',
    is_recording BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Facial Recognition Results
CREATE TABLE facial_recognition (
    id INT AUTO_INCREMENT PRIMARY KEY,
    detected_name VARCHAR(100),
    confidence DECIMAL(5,2),
    camera_id INT,
    is_known BOOLEAN DEFAULT FALSE,
    image_snapshot VARCHAR(500),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE SET NULL
);

-- Gesture Recognition Results
CREATE TABLE gesture_recognition (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gesture_type VARCHAR(50) NOT NULL,
    confidence DECIMAL(5,2),
    camera_id INT,
    is_danger BOOLEAN DEFAULT FALSE,
    alert_triggered BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE SET NULL
);

-- Danger Alerts
CREATE TABLE alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alert_type ENUM('facial', 'gesture', 'both') NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    message TEXT,
    camera_id INT,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE SET NULL
);

-- System Activity Logs
CREATE TABLE system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    log_type ENUM('recognition', 'alert', 'system', 'user') NOT NULL,
    message TEXT,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INSERT SAMPLE DATA
-- =============================================

-- Default responder account (password: responder123)
INSERT INTO users (username, email, password_hash, role) VALUES
('responder1', 'responder@bantaybuhay.com', 'responder123', 'responder');

-- Sample cameras
INSERT INTO cameras (name, location, stream_url, status, is_recording) VALUES
('Camera 1', 'Main Entrance', 'http://localhost:8000/video/cam1', 'online', TRUE),
('Camera 2', 'Parking Lot', 'http://localhost:8000/video/cam2', 'online', TRUE),
('Camera 3', 'Lobby', 'http://localhost:8000/video/cam3', 'online', TRUE),
('Camera 4', 'Back Exit', 'http://localhost:8000/video/cam4', 'offline', FALSE);

-- Sample facial recognition data
INSERT INTO facial_recognition (detected_name, confidence, camera_id, is_known, timestamp) VALUES
('John Doe', 95.50, 1, TRUE, NOW()),
('Unknown Person', 67.30, 2, FALSE, NOW()),
('Jane Smith', 89.20, 1, TRUE, DATE_SUB(NOW(), INTERVAL 5 MINUTE));

-- Sample gesture recognition data
INSERT INTO gesture_recognition (gesture_type, confidence, camera_id, is_danger, alert_triggered, timestamp) VALUES
('Wave', 92.10, 1, FALSE, FALSE, NOW()),
('Help Signal', 88.50, 2, TRUE, TRUE, NOW()),
('Thumbs Up', 95.00, 3, FALSE, FALSE, DATE_SUB(NOW(), INTERVAL 10 MINUTE));

-- Sample alerts
INSERT INTO alerts (alert_type, severity, message, camera_id, acknowledged, timestamp) VALUES
('gesture', 'high', 'Help signal detected at Parking Lot', 2, FALSE, NOW()),
('facial', 'medium', 'Unknown person detected at Main Entrance', 1, FALSE, DATE_SUB(NOW(), INTERVAL 2 MINUTE));

-- Sample system logs
INSERT INTO system_logs (log_type, message, details, timestamp) VALUES
('system', 'System started', 'BantayBuhay surveillance system initialized', NOW()),
('recognition', 'Face detected', 'John Doe identified with 95.5% confidence', NOW()),
('alert', 'Danger alert triggered', 'Help signal detected at Camera 2', NOW());
\`\`\`

Click **Go** to execute.

---

## STEP 2: Set Up Python Backend

### 2.1 Create Backend Folder
\`\`\`bash
cd C:\bantaybuhay
mkdir backend
cd backend
\`\`\`

### 2.2 Create `requirements.txt`
Create a file named `requirements.txt` with:

\`\`\`
fastapi==0.104.1
uvicorn==0.24.0
mysql-connector-python==8.2.0
python-multipart==0.0.6
python-dotenv==1.0.0
\`\`\`

### 2.3 Create `.env` File
Create a file named `.env` with:

\`\`\`
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=bantaybuhay
\`\`\`

> **Note:** XAMPP's default MySQL has no password. If you set one, update `DB_PASSWORD`.

### 2.4 Create `main.py`
Create a file named `main.py` with:

\`\`\`python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import mysql.connector
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="BantayBuhay API", version="1.0.0")

# CORS - Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    """Create database connection"""
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "bantaybuhay")
    )

# ==================== AUTH ====================

class LoginRequest(BaseModel):
    email: str
    password: str

@app.get("/")
def root():
    return {"message": "BantayBuhay API is running", "status": "ok"}

@app.get("/api/health")
def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/auth/login")
def login(request: LoginRequest):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        "SELECT id, username, email, role FROM users WHERE email = %s AND password_hash = %s",
        (request.email, request.password)
    )
    user = cursor.fetchone()
    db.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user

# ==================== CAMERAS ====================

@app.get("/api/cameras")
def get_cameras():
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM cameras ORDER BY id")
    cameras = cursor.fetchall()
    db.close()
    return cameras

@app.get("/api/cameras/stats")
def get_camera_stats():
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online,
            SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline,
            SUM(CASE WHEN is_recording = 1 THEN 1 ELSE 0 END) as recording
        FROM cameras
    """)
    stats = cursor.fetchone()
    db.close()
    return stats

# ==================== FACIAL RECOGNITION ====================

@app.get("/api/recognition/facial")
def get_facial_results(limit: int = 50, is_known: Optional[bool] = None):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    query = """
        SELECT fr.*, c.name as camera_name, c.location as camera_location 
        FROM facial_recognition fr
        LEFT JOIN cameras c ON fr.camera_id = c.id
    """
    
    if is_known is not None:
        query += f" WHERE fr.is_known = {1 if is_known else 0}"
    
    query += f" ORDER BY fr.timestamp DESC LIMIT {limit}"
    
    cursor.execute(query)
    results = cursor.fetchall()
    db.close()
    
    # Convert datetime to string
    for r in results:
        if r.get('timestamp'):
            r['timestamp'] = r['timestamp'].isoformat()
    
    return results

# ==================== GESTURE RECOGNITION ====================

@app.get("/api/recognition/gesture")
def get_gesture_results(limit: int = 50, is_danger: Optional[bool] = None):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    query = """
        SELECT gr.*, c.name as camera_name, c.location as camera_location 
        FROM gesture_recognition gr
        LEFT JOIN cameras c ON gr.camera_id = c.id
    """
    
    if is_danger is not None:
        query += f" WHERE gr.is_danger = {1 if is_danger else 0}"
    
    query += f" ORDER BY gr.timestamp DESC LIMIT {limit}"
    
    cursor.execute(query)
    results = cursor.fetchall()
    db.close()
    
    for r in results:
        if r.get('timestamp'):
            r['timestamp'] = r['timestamp'].isoformat()
    
    return results

# ==================== ALERTS ====================

@app.get("/api/alerts")
def get_alerts(acknowledged: Optional[bool] = None):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    query = """
        SELECT a.*, c.name as camera_name, c.location as camera_location 
        FROM alerts a
        LEFT JOIN cameras c ON a.camera_id = c.id
    """
    
    if acknowledged is not None:
        query += f" WHERE a.acknowledged = {1 if acknowledged else 0}"
    
    query += " ORDER BY a.timestamp DESC"
    
    cursor.execute(query)
    alerts = cursor.fetchall()
    db.close()
    
    for a in alerts:
        if a.get('timestamp'):
            a['timestamp'] = a['timestamp'].isoformat()
    
    return alerts

@app.get("/api/alerts/active")
def get_active_alerts():
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT a.*, c.name as camera_name, c.location as camera_location 
        FROM alerts a
        LEFT JOIN cameras c ON a.camera_id = c.id
        WHERE a.acknowledged = 0
        ORDER BY 
            CASE a.severity 
                WHEN 'critical' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'medium' THEN 3 
                ELSE 4 
            END,
            a.timestamp DESC
    """)
    alerts = cursor.fetchall()
    db.close()
    
    for a in alerts:
        if a.get('timestamp'):
            a['timestamp'] = a['timestamp'].isoformat()
    
    return alerts

@app.post("/api/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, username: str = "responder"):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "UPDATE alerts SET acknowledged = TRUE, acknowledged_by = %s WHERE id = %s",
        (username, alert_id)
    )
    db.commit()
    
    # Log the action
    cursor.execute(
        "INSERT INTO system_logs (log_type, message, details) VALUES (%s, %s, %s)",
        ('alert', f'Alert #{alert_id} acknowledged', f'Acknowledged by {username}')
    )
    db.commit()
    db.close()
    
    return {"success": True, "message": "Alert acknowledged"}

# ==================== SYSTEM LOGS ====================

@app.get("/api/logs")
def get_logs(limit: int = 100, log_type: Optional[str] = None):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    query = "SELECT * FROM system_logs"
    
    if log_type:
        query += f" WHERE log_type = '{log_type}'"
    
    query += f" ORDER BY timestamp DESC LIMIT {limit}"
    
    cursor.execute(query)
    logs = cursor.fetchall()
    db.close()
    
    for l in logs:
        if l.get('timestamp'):
            l['timestamp'] = l['timestamp'].isoformat()
    
    return logs

# ==================== DASHBOARD STATS ====================

@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Get various counts
    cursor.execute("SELECT COUNT(*) as count FROM cameras WHERE status = 'online'")
    cameras_online = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM facial_recognition WHERE DATE(timestamp) = CURDATE()")
    faces_today = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM gesture_recognition WHERE DATE(timestamp) = CURDATE()")
    gestures_today = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM alerts WHERE acknowledged = 0")
    active_alerts = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM alerts WHERE severity IN ('high', 'critical') AND acknowledged = 0")
    critical_alerts = cursor.fetchone()['count']
    
    db.close()
    
    return {
        "cameras_online": cameras_online,
        "faces_detected_today": faces_today,
        "gestures_detected_today": gestures_today,
        "active_alerts": active_alerts,
        "critical_alerts": critical_alerts
    }

# ==================== RUN SERVER ====================

if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("BantayBuhay API Server")
    print("=" * 50)
    print("Starting server at http://localhost:8000")
    print("API Docs: http://localhost:8000/docs")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)
\`\`\`

### 2.5 Install Python Dependencies
Open Command Prompt in the backend folder:

\`\`\`bash
cd C:\bantaybuhay\backend
pip install -r requirements.txt
\`\`\`

### 2.6 Test the Backend
\`\`\`bash
python main.py
\`\`\`

You should see:
\`\`\`
BantayBuhay API Server
Starting server at http://localhost:8000
\`\`\`

Open http://localhost:8000/docs to see API documentation.

---

## STEP 3: Set Up Next.js Frontend

### 3.1 Download from v0
1. In v0, click the **three dots (...)** in the top right
2. Select **"Download ZIP"** or use the shadcn CLI
3. Extract to `C:\bantaybuhay\frontend\`

### 3.2 Install Dependencies
Open Command Prompt:

\`\`\`bash
cd C:\bantaybuhay\frontend
npm install
\`\`\`

### 3.3 Create `.env.local`
Create a file named `.env.local` in the frontend folder:

\`\`\`
NEXT_PUBLIC_API_URL=http://localhost:8000
\`\`\`

### 3.4 Run the Frontend
\`\`\`bash
npm run dev
\`\`\`

Open http://localhost:3000

---

## STEP 4: Running Everything Together

### Start Order (IMPORTANT!)

1. **Start MySQL** (XAMPP Control Panel → Start MySQL)
2. **Start Python Backend**:
   \`\`\`bash
   cd C:\bantaybuhay\backend
   python main.py
   \`\`\`
3. **Start Next.js Frontend** (in a new terminal):
   \`\`\`bash
   cd C:\bantaybuhay\frontend
   npm run dev
   \`\`\`

### Quick Start Script (Optional)
Create `start-all.bat` in `C:\bantaybuhay\`:

```batch
@echo off
echo Starting BantayBuhay System...
echo.

echo [1/2] Starting Python Backend...
start cmd /k "cd /d C:\bantaybuhay\backend && python main.py"

timeout /t 3

echo [2/2] Starting Next.js Frontend...
start cmd /k "cd /d C:\bantaybuhay\frontend && npm run dev"

echo.
echo All services starting!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
pause
