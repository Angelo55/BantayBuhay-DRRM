# BantayBuhay Python Vision Servers Setup Guide

## Overview

BantayBuhay now uses **THREE separate Python servers** for different vision capabilities:

1. **Facial Recognition Server** (Port 5000) - Detects faces and shows green/red rectangles
2. **Gesture Recognition Server** (Port 5001) - Detects SOS hand gestures using MediaPipe
3. **Face Registration Server** (Port 5002) - Registers new faces to the system

## Installation

### Step 1: Install Python Dependencies

Open Command Prompt or PowerShell in your project directory:

\`\`\`bash
cd scripts
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
\`\`\`

**Note**: Installing `dlib` and `face-recognition` may take some time. If you encounter issues on Windows, you may need Visual Studio C++ Build Tools.

### Step 2: Run the Three Python Servers

You need **THREE separate terminal windows**, all with the virtual environment activated:

**Terminal 1 - Facial Recognition:**
\`\`\`bash
cd scripts
venv\Scripts\activate
python facial_recognition_server.py
\`\`\`
Server will run on: `http://localhost:5000`

**Terminal 2 - Gesture Recognition:**
\`\`\`bash
cd scripts
venv\Scripts\activate
python gesture_recognition_server.py
\`\`\`
Server will run on: `http://localhost:5001`

**Terminal 3 - Face Registration:**
\`\`\`bash
cd scripts
venv\Scripts\activate
python face_registration_server.py
\`\`\`
Server will run on: `http://localhost:5002`

### Step 3: Run Next.js Frontend

In a **fourth terminal** (without activating Python venv):

\`\`\`bash
npm run dev
\`\`\`

## Features

### 1. Facial Recognition (Port 5000)
- **Green rectangles** around registered faces
- **Red rectangles** around unknown faces
- Uses `face-recognition` library for accurate detection
- Displays person name and confidence score

### 2. Gesture Recognition (Port 5001)
- Detects SOS signal: 4 fingers up + thumb tucked
- Uses MediaPipe for hand tracking
- Sends automatic alerts when SOS detected
- Real-time hand landmark visualization

### 3. Face Registration (Port 5002)
- Captures 4 images from different angles (front/left/right/top/down)
- Creates (or reuses) a folder under `registered_faces/` named after the registrant
- Saves images to that folder (one file per capture)
- Does NOT store images in database
- Images stored as: `registered_faces/{name}/{name}_{timestamp}_{index}.jpg`

## Directory Structure

\`\`\`
bantaybuhay/
├── scripts/
│   ├── facial_recognition_server.py    # Port 5000
│   ├── gesture_recognition_server.py   # Port 5001
│   ├── face_registration_server.py     # Port 5002
│   ├── requirements.txt
│   └── venv/
├── registered_faces/                   # Facial images stored here
│   ├── John_Doe/
│   │   ├── John_Doe_1234567890.jpg
│   │   └── John_Doe_1234567891.jpg
│   └── Jane_Smith/
│       └── Jane_Smith_1234567892.jpg
└── ...
\`\`\`

## Usage in App

### For Responders:
1. **Face Registration**: Dashboard → Face Registration
   - Register your face to the system
   - Images saved to local folder, not database
   
2. **Facial Recognition**: Dashboard → Facial Recognition
   - Green box = You're registered
   - Red box = Unknown person detected

3. **Gesture Recognition**: Dashboard → Gesture Recognition
   - Make SOS signal (4 fingers up, thumb tucked)
   - System automatically alerts managers

### For Managers:
- All registered faces are loaded automatically
- Reload faces anytime by visiting: `http://localhost:5000/api/facial/reload`

## Troubleshooting

### Camera Not Working
- Close all other apps using the camera (Zoom, Teams, etc.)
- Grant camera permissions to your browser
- The servers try camera indices 0, 1, 2 automatically

### Server Won't Start
- Make sure the port isn't already in use
- Check virtual environment is activated
- Verify all dependencies installed: `pip list`

### Face Recognition Not Working
- Register at least one face first
- Ensure good lighting conditions
- Face should be clearly visible and unobstructed

### Gesture Recognition Not Detecting SOS
- Ensure all 4 fingers (except thumb) are fully extended
- Thumb must be tucked in (not extended)
- Hold gesture for 1-2 seconds
- Check hand is within camera view

## API Endpoints

### Facial Recognition Server (Port 5000)
- `GET /api/facial/stream` - Video stream with rectangles
- `GET /api/facial/detections` - Get detected faces JSON
- `GET /api/facial/reload` - Reload registered faces
- `GET /health` - Health check

### Gesture Recognition Server (Port 5001)
- `GET /api/gesture/stream` - Video stream with hand tracking
- `GET /api/gesture/detections` - Get detected gestures JSON
- `GET /health` - Health check

### Face Registration Server (Port 5002)
- `GET /api/registration/stream` - Video stream for capture
- `POST /api/registration/capture` - Capture and register a single image (legacy). Records registration in the database and creates a directory under `registered_faces/{name}` (does not save the image file by default).
- `POST /api/registration/register` - Register multiple images (expects 4 images). Validates images contain a face, records registration in the XAMPP/MySQL database, and creates an empty directory under `registered_faces/{name}`. The server returns the directory path in the response.
- `GET /api/registration/list` - List registered faces (reads from DB if available; otherwise falls back to filesystem directories)
- `GET /health` - Health check

## What to Run

**Use these THREE Python servers (NOT the old vision_server.py or vision_server_simple.py):**

1. `facial_recognition_server.py` (Port 5000)
2. `gesture_recognition_server.py` (Port 5001)
3. `face_registration_server.py` (Port 5002)

All three must be running simultaneously for full functionality.

Database configuration:
- Create a `.env` file next to `face_registration_server.py` (or set env vars in your system):
  - `DB_HOST` (default: `127.0.0.1`)
  - `DB_USER` (default: `root`)
  - `DB_PASS` (default: empty)
  - `DB_NAME` (default: `bantaybuhay`)

The registration endpoints will attempt to write to the `registered_faces` table in the MySQL database (XAMPP). If the DB connector or DB is unavailable, the server will still create the directory and return it in the API response.

Migration notes:
- Run `scripts/init-database.sql` first to create base schema. Then run `scripts/update-database-v2.sql` to add face-registration specific additions.
- If you already have an existing `bantaybuhay` database, import `init-database.sql` will now be safe (uses `CREATE TABLE IF NOT EXISTS`). The `update-database-v2.sql` file contains `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` clauses to bring an existing `registered_faces` table up to the newer schema (requires MySQL 8+).
- If your MySQL version is older or you see errors about adding constraints, run the manual ALTER statements suggested in `scripts/update-database-v2.sql` or drop/recreate the `registered_faces` table if it's safe to do so.
