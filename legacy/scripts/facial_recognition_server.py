import cv2
import numpy as np
import os
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import json
import time
import base64
import face_recognition

app = Flask(__name__)
CORS(app)

# Configuration
FACES_DIR = os.path.join(os.path.dirname(__file__), '..', 'registered_faces')
os.makedirs(FACES_DIR, exist_ok=True)

# Global state
camera = None
known_face_encodings = []
known_face_names = []
latest_detections = {"faces": [], "timestamp": time.time()}
no_face_counter = 0

def load_known_faces():
    """Load all registered faces from directory"""
    global known_face_encodings, known_face_names
    known_face_encodings = []
    known_face_names = []
    
    for person_name in os.listdir(FACES_DIR):
        person_dir = os.path.join(FACES_DIR, person_name)
        if os.path.isdir(person_dir):
            for filename in os.listdir(person_dir):
                if filename.endswith(('.jpg', '.jpeg', '.png')):
                    image_path = os.path.join(person_dir, filename)
                    try:
                        image = face_recognition.load_image_file(image_path)
                        encodings = face_recognition.face_encodings(image)
                        if encodings:
                            known_face_encodings.append(encodings[0])
                            known_face_names.append(person_name)
                            print(f"[Facial Recognition] Loaded face: {person_name}")
                    except Exception as e:
                        print(f"[Facial Recognition] Error loading {image_path}: {e}")

def init_camera():
    """Initialize camera with fallback to multiple indices"""
    global camera
    if camera is not None:
        return camera
    # Try multiple indices and backends and verify the frame isn't all-black
    max_indices = 6
    backends = [getattr(cv2, 'CAP_DSHOW', 0), getattr(cv2, 'CAP_MSMF', 0), 0]
    tried = []
    for i in range(max_indices):
        for backend in backends:
            try:
                cap = cv2.VideoCapture(i, backend)
            except Exception:
                cap = cv2.VideoCapture(i)

            tried.append((i, backend))
            print(f"[Facial Recognition] Trying camera index {i} backend {backend}")
            if cap.isOpened():
                # Read a few frames to allow camera auto-adjust and check brightness
                stats = None
                for attempt in range(3):
                    ret, frame = cap.read()
                    if not ret or frame is None:
                        continue
                    try:
                        import numpy as _np
                        mean_val = float(_np.mean(frame))
                        min_val = int(_np.min(frame))
                        max_val = int(_np.max(frame))
                        stats = (mean_val, min_val, max_val)
                        print(f"[Facial Recognition] Probe idx={i} backend={backend} attempt={attempt} stats mean={mean_val:.3f} min={min_val} max={max_val}")
                        # Consider non-black if average brightness exceeds threshold
                        if mean_val > 3.0 and max_val > 10:
                            print(f"[Facial Recognition] Camera initialized on index {i} backend {backend} (mean={mean_val:.2f})")
                            camera = cap
                            return camera
                        else:
                            print(f"[Facial Recognition] Camera at index {i} produced too-dark frame (mean={mean_val:.3f})")
                    except Exception as e:
                        print(f"[Facial Recognition] Frame check error: {e}")
                cap.release()
                if stats is not None:
                    print(f"[Facial Recognition] Final probe stats for idx={i} backend={backend}: mean={stats[0]:.3f} min={stats[1]} max={stats[2]}")

    print(f"[Facial Recognition] ERROR: No usable camera found! Tried: {tried}")
    return None

def generate_frames():
    """Generate video frames with face detection"""
    global latest_detections
    
    cap = init_camera()
    if cap is None:
        return
    
    while True:
        success, frame = cap.read()
        if not success:
            print("[Facial Recognition] Failed to read frame")
            break
        
        # Convert to RGB for face_recognition and make contiguous
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb_frame = np.ascontiguousarray(rgb_frame)

        # Detect faces
        try:
            face_locations = face_recognition.face_locations(rgb_frame)
            face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
        except Exception as e:
            print(f"[Facial Recognition] face_recognition error: {e}")
            face_locations = []
            face_encodings = []

        print(f"[Facial Recognition] Detected {len(face_locations)} face(s)")

        # Save a debug image every ~30 frames when no face detected to help diagnostics
        global no_face_counter
        if len(face_locations) == 0:
            no_face_counter += 1
            if no_face_counter % 30 == 0:
                dbg_path = os.path.join(FACES_DIR, f"debug_no_face_{int(time.time())}.jpg")
                try:
                    cv2.imwrite(dbg_path, frame)
                    print(f"[Facial Recognition] Saved debug image to {dbg_path}")
                except Exception as e:
                    print(f"[Facial Recognition] Failed to save debug image: {e}")
        else:
            no_face_counter = 0
        
        detections = []
        
        # Process each detected face
        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            name = "Unknown"
            color = (0, 0, 255)  # Red for unknown
            registered = False
            
            # Check if face matches any known face
            if known_face_encodings:
                matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.6)
                face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
                
                if len(face_distances) > 0:
                    best_match_index = np.argmin(face_distances)
                    if matches[best_match_index]:
                        name = known_face_names[best_match_index]
                        color = (0, 255, 0)  # Green for registered
                        registered = True
            
            # Draw rectangle
            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
            
            # Draw label
            label = name
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), color, cv2.FILLED)
            cv2.putText(frame, label, (left + 6, bottom - 6), 
                       cv2.FONT_HERSHEY_DUPLEX, 0.6, (255, 255, 255), 1)
            
            detections.append({
                "name": name,
                "registered": registered,
                "bbox": {"x": left, "y": top, "width": right - left, "height": bottom - top}
            })
        
        # Update latest detections
        latest_detections = {
            "faces": detections,
            "timestamp": time.time()
        }
        
        # Encode frame
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        time.sleep(0.033)  # ~30 FPS

@app.route('/api/facial/stream')
def video_feed():
    """Video streaming route"""
    cap = init_camera()
    if cap is None:
        return jsonify({"error": "Camera not available"}), 503

    return Response(generate_frames(),
                   mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/api/facial/test_frame')
def test_frame():
    """Return basic stats about a single frame for debugging"""
    cap = init_camera()
    if cap is None:
        return jsonify({"error": "Camera not available"}), 503

    ret, frame = cap.read()
    if not ret or frame is None:
        return jsonify({"error": "Failed to read frame"}), 500

    import numpy as _np
    stats = {
        "shape": frame.shape,
        "min": int(_np.min(frame)),
        "max": int(_np.max(frame)),
        "mean": float(_np.mean(frame))
    }

    # Save debug frame
    dbg_path = os.path.join(FACES_DIR, f"test_frame_{int(time.time())}.jpg")
    try:
        cv2.imwrite(dbg_path, frame)
        stats["saved_path"] = dbg_path
    except Exception as e:
        stats["save_error"] = str(e)

    return jsonify(stats)


@app.route('/api/facial/frame.jpg')
def frame_jpeg():
    """Return a single JPEG frame (for quick browser checks)"""
    cap = init_camera()
    if cap is None:
        return jsonify({"error": "Camera not available"}), 503

    ret, frame = cap.read()
    if not ret or frame is None:
        return jsonify({"error": "Failed to read frame"}), 500

    ret, buffer = cv2.imencode('.jpg', frame)
    if not ret:
        return jsonify({"error": "Failed to encode frame"}), 500

    return Response(buffer.tobytes(), mimetype='image/jpeg')

@app.route('/api/facial/detections')
def get_detections():
    """Get latest face detections"""
    return jsonify(latest_detections)


@app.route('/api/facial/reinit_camera', methods=['POST'])
def reinit_camera():
    """Force reinitialize the camera (useful for debugging or if device was locked)"""
    global camera
    try:
        if camera is not None:
            try:
                camera.release()
            except Exception:
                pass
            camera = None
        cap = init_camera()
        if cap is None:
            return jsonify({"success": False, "error": "No usable camera found"}), 503
        return jsonify({"success": True, "message": "Camera reinitialized"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/facial/detect_frame', methods=['POST'])
def detect_frame():

    """Accept a base64 image from client and return face detections for that frame"""
    data = request.json or {}
    image_data = data.get('image_data')
    if not image_data:
        return jsonify({"error": "image_data is required"}), 400

    try:
        header, encoded = image_data.split(',', 1)
        img_bytes = base64.b64decode(encoded)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Could not decode image")
    except Exception as e:
        return jsonify({"error": f"Invalid image_data: {e}"}), 400

    # Convert for face_recognition
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    rgb_frame = np.ascontiguousarray(rgb_frame)

    try:
        face_locations = face_recognition.face_locations(rgb_frame)
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
    except Exception as e:
        return jsonify({"error": f"face_recognition error: {e}"}), 500

    faces = []
    for (top, right, bottom, left), enc in zip(face_locations, face_encodings):
        name = "Unknown"
        registered = False
        confidence = 0.0

        if known_face_encodings:
            matches = face_recognition.compare_faces(known_face_encodings, enc, tolerance=0.6)
            distances = face_recognition.face_distance(known_face_encodings, enc)
            if len(distances) > 0:
                best_idx = int(np.argmin(distances))
                confidence = float(max(0.0, 1.0 - float(distances[best_idx])))
                if matches[best_idx]:
                    name = known_face_names[best_idx]
                    registered = True

        faces.append({
            "name": name,
            "is_registered": registered,
            "confidence": confidence,
            "bbox": {"x": int(left), "y": int(top), "width": int(right - left), "height": int(bottom - top)}
        })

    return jsonify({"faces": faces})

@app.route('/api/facial/reload')
def reload_faces():
    """Reload registered faces"""
    load_known_faces()
    return jsonify({
        "success": True,
        "loaded_faces": len(known_face_names),
        "unique_people": len(set(known_face_names))
    })

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "facial_recognition"})

if __name__ == '__main__':
    print("[BantayBuhay] Facial Recognition Server Starting...")
    load_known_faces()
    print(f"[Facial Recognition] Loaded {len(known_face_names)} registered faces")
    app.run(host='0.0.0.0', port=5000, threaded=True, debug=False)
