# BantayBuhay Vision Server Setup Guide

## Location: Where to Put Python Files

The Python vision server files should be placed in your project structure:

\`\`\`
bantaybuhay/
├── scripts/
│   ├── init-database.sql
│   └── vision_server.py  ← PUT HERE
├── app/
├── components/
└── ...
\`\`\`

## Prerequisites

- Python 3.8+
- Webcam/Camera
- Google Gemini API Key (free tier available)

## Installation Steps

### Step 1: Create Virtual Environment

\`\`\`bash
cd scripts
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
\`\`\`

### Step 2: Install Dependencies

\`\`\`bash
pip install opencv-python mediapipe google-generativeai flask flask-cors python-dotenv requests
\`\`\`

### Step 3: Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key (free tier available)
3. Copy the key

### Step 4: Create .env File in Root Project

Create a `.env` file in your project root (not in scripts folder):

\`\`\`env
# .env (in root project directory)
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=mysql://root:@localhost:3306/bantaybuhay
\`\`\`

### Step 5: Run the Vision Server

\`\`\`bash
# Make sure you're in the scripts directory with venv activated
python vision_server.py
\`\`\`

You should see:
\`\`\`
Starting BantayBuhay Vision Server...
Streaming at: http://localhost:5000/api/vision/stream
Detections at: http://localhost:5000/api/vision/detections
\`\`\`

## Features

### Face Detection with Rectangles
- **What**: MediaPipe detects faces and draws green bounding rectangles around them
- **Where**: Visible in the camera feed on the Camera page
- **Accuracy**: Shows confidence score (0-1)

### Gemini AI Verification
- **What**: Uses Google Gemini to analyze face quality and verify authenticity
- **Output**: Displays analysis in the "Facial Detections" panel
- **Accuracy**: Provides additional verification layer

### Hand Gesture Recognition (SOS Signal)
- **What**: Detects when responder shows emergency gesture (4 fingers up + thumb tucked)
- **Alert**: Creates incident report with "critical" severity
- **Display**: Red SOS warning overlay on video feed

### Real-time Streaming
- **Protocol**: MJPEG over HTTP
- **Endpoint**: `http://localhost:5000/api/vision/stream`
- **Detections API**: `http://localhost:5000/api/vision/detections`

## Running Both Services

You need TWO terminal windows:

### Terminal 1 - Next.js Frontend
\`\`\`bash
npm run dev
# Runs on http://localhost:3000
\`\`\`

### Terminal 2 - Python Vision Server
\`\`\`bash
cd scripts
source venv/bin/activate  # or venv\Scripts\activate on Windows
python vision_server.py
# Runs on http://localhost:5000
\`\`\`

## Testing

1. Navigate to `http://localhost:3000`
2. Login with responder account
3. Go to **Dashboard > Camera**
4. Click **"Start Camera"**
5. Face should appear with green rectangle
6. Show SOS gesture (4 fingers up) to trigger alert

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No module named mediapipe" | Run `pip install mediapipe` |
| Camera access denied | Grant browser camera permissions |
| Connection refused on port 5000 | Ensure vision_server.py is running |
| Gemini API errors | Check GEMINI_API_KEY in .env file |
| No faces detecting | Ensure good lighting, face is clear |

## API Endpoints

### Stream Video Feed
\`\`\`
GET http://localhost:5000/api/vision/stream
\`\`\`
Returns: MJPEG stream of camera with face rectangles

### Get Current Detections
\`\`\`
GET http://localhost:5000/api/vision/detections
\`\`\`
Returns JSON:
\`\`\`json
{
  "faces": [
    {
      "bbox": {"x_min": 100, "y_min": 50, "x_max": 300, "y_max": 350, "confidence": 0.95},
      "gemini_analysis": {"verified": true, "analysis": "...", "confidence": 0.9},
      "timestamp": "2025-01-12T10:30:45.123456"
    }
  ],
  "gestures": [{"type": "SOS Signal", "confidence": 0.95, "timestamp": "..."}],
  "sos_alert": false,
  "timestamp": "2025-01-12T10:30:45.123456"
}
\`\`\`

### Health Check
\`\`\`
GET http://localhost:5000/api/vision/health
\`\`\`
Returns: `{"status": "online", "timestamp": "..."}`

## Notes

- Faces are drawn as **green rectangles** in real-time
- Confidence scores show how sure the AI is
- Gemini API provides additional verification for accuracy
- Keep vision_server.py running while using Camera page
- Test SOS gesture: Hold up all 4 fingers with thumb tucked in

Enjoy real-time vision detection!
