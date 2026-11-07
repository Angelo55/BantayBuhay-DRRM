import cv2
import os
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import json
import time
import base64
import numpy as np
import face_recognition
import requests
import traceback

app = Flask(__name__)
CORS(app)

# Configuration
FACES_DIR = os.path.join(os.path.dirname(__file__), '..', 'registered_faces')
os.makedirs(FACES_DIR, exist_ok=True)

# Global state
camera = None


def sanitize_name(name: str) -> str:
    import re
    safe = re.sub(r"[^A-Za-z0-9 _-]", "", (name or "")).strip().replace(" ", "_")
    if not safe:
        safe = f"person_{int(time.time())}"
    return safe

def init_camera():
    """Initialize camera"""
    global camera
    if camera is not None:
        return camera
    
    for i in range(3):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            ret, _ = cap.read()
            if ret:
                print(f"[Face Registration] Camera initialized on index {i}")
                camera = cap
                return camera
            cap.release()
    
    print("[Face Registration] ERROR: No camera found!")
    return None

def generate_frames():
    """Generate video frames with face detection"""
    cap = init_camera()
    if cap is None:
        return
    
    while True:
        success, frame = cap.read()
        if not success:
            print("[Face Registration] Failed to read frame")
            break
        
        # Convert to RGB for face_recognition
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Detect faces
        face_locations = face_recognition.face_locations(rgb_frame)
        
        # Draw rectangles around faces
        for (top, right, bottom, left) in face_locations:
            cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
            cv2.putText(frame, "Face Detected", (left, top - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        # Encode frame
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        time.sleep(0.033)  # ~30 FPS

@app.route('/api/registration/stream')
def video_feed():
    """Video streaming route"""
    return Response(generate_frames(),
                   mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/registration/capture', methods=['POST'])
def capture_face():
    """Capture and save face (single-image legacy endpoint)"""
    data = request.json
    name = data.get('name')
    responder_id = data.get('responder_id')
    image_data = data.get('image_data')
    
    if not name:
        return jsonify({"success": False, "error": "Name is required"}), 400
    
    cap = init_camera()
    if cap is None:
        return jsonify({"success": False, "error": "Camera not available"}), 500
    
    # If client supplied an image (base64 data URL), use it instead of server camera
    if image_data:
        try:
            header, encoded = image_data.split(",", 1)
            img_bytes = base64.b64decode(encoded)
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is None:
                return jsonify({"success": False, "error": "Invalid image data"}), 400
        except Exception as e:
            print(f"[Face Registration] Error decoding image data: {e}")
            return jsonify({"success": False, "error": "Invalid image data"}), 400
    else:
        # Capture frame from server camera
        ret, frame = cap.read()
        if not ret:
            return jsonify({"success": False, "error": "Failed to capture frame"}), 500

    # Detect faces
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    face_locations = face_recognition.face_locations(rgb_frame)
    print(f"[Face Registration] Detected {len(face_locations)} face(s)")
    
    if not face_locations:
        # Save debug image for inspection
        dbg_path = os.path.join(FACES_DIR, "debug_no_face.jpg")
        try:
            cv2.imwrite(dbg_path, frame)
            print(f"[Face Registration] Saved debug image to {dbg_path}")
        except Exception as e:
            print(f"[Face Registration] Failed to save debug image: {e}")
        return jsonify({"success": False, "error": "No face detected"}), 400
    
    # Sanitize name and create directory for person (ensure a folder exists)
    safe_name = sanitize_name(name)
    person_dir = os.path.join(FACES_DIR, safe_name)
    os.makedirs(person_dir, exist_ok=True)

    # Do not save the captured image to disk; create directory and record registration in DB
    db_result = None
    try:
        from dotenv import load_dotenv
        load_dotenv()
        import mysql.connector

        DB_HOST = os.environ.get('DB_HOST', '127.0.0.1')
        DB_USER = os.environ.get('DB_USER', 'root')
        DB_PASS = os.environ.get('DB_PASS', '')
        DB_NAME = os.environ.get('DB_NAME', 'bantaybuhay')

        print(f"[Face Registration] Attempting DB insert to {DB_HOST}/{DB_NAME} as {DB_USER}")
        conn = mysql.connector.connect(host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME)
        cur = conn.cursor()
        # Validate responder_id exists; if not, insert as NULL to avoid FK errors
        valid_responder = None
        try:
            if responder_id is not None:
                cur.execute("SELECT id FROM responders WHERE id = %s", (responder_id,))
                if cur.fetchone():
                    valid_responder = responder_id
                else:
                    print(f"[Face Registration] responder_id {responder_id} not found; inserting NULL")
        except Exception as _e:
            print(f"[Face Registration] Could not validate responder_id: {_e}")

        insert_sql = "INSERT INTO registered_faces (name, responder_id, directory, images_count) VALUES (%s, %s, %s, %s)"
        cur.execute(insert_sql, (safe_name, valid_responder, person_dir, 1))
        conn.commit()
        db_id = cur.lastrowid
        cur.close()
        conn.close()
        db_result = {"id": db_id}
        print(f"[Face Registration] Registered entry in DB with id {db_id}")
    except Exception as e:
        traceback.print_exc()
        db_error = str(e)
        print(f"[Face Registration] DB registration failed or connector missing: {e}")

    response = {"success": True, "message": f"Face registered for {safe_name}", "directory": person_dir}
    if db_result:
        response['db'] = db_result

    return jsonify(response)


@app.route('/api/registration/register', methods=['POST'])
def register_faces():
    """Register multiple face images (expects 4 images)"""
    try:
        data = request.json or {}
        name = data.get('name')
        responder_id = data.get('responder_id')
        images = data.get('images', [])

        print(f"[Face Registration] register_faces called for name={name} images={len(images)} responder_id={responder_id}")

        # Extra debug: log short summary of each image payload to help diagnose client issues
        try:
            for idx, img in enumerate(images):
                if isinstance(img, str):
                    prefix = img[:80]
                    print(f"[Face Registration] image[{idx}] len={len(img)} prefix={prefix[:60]}...")
                else:
                    print(f"[Face Registration] image[{idx}] is not a string (type={type(img)})")
        except Exception as _e:
            print(f"[Face Registration] Failed to inspect images list: {_e}")

        if not name:
            return jsonify({"success": False, "error": "Name is required"}), 400
        if not images or not isinstance(images, list) or len(images) < 4:
            return jsonify({"success": False, "error": "At least 4 images are required"}), 400

        safe_name = sanitize_name(name)
        person_dir = os.path.join(FACES_DIR, safe_name)
        # Ensure directory exists early so we can write debug artifacts if validation fails
        try:
            os.makedirs(person_dir, exist_ok=True)
        except Exception as e:
            print(f"[Face Registration] Failed to create person directory {person_dir}: {e}")

        # Validate images and decode them into frames; will save to disk after validation
        valid_count = 0
        frames = []
        for idx, image_data in enumerate(images):
            try:
                header, encoded = image_data.split(",", 1)
                print(f"[Face Registration] Decoding image index {idx}: header={header}")
                
                # Show how big the encoded payload is after decoding
                img_bytes = base64.b64decode(encoded)
                print(f"[Face Registration] Decoded image index {idx}: {len(img_bytes)} bytes")
                nparr = np.frombuffer(img_bytes, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if frame is None:
                    # Save the raw data for debugging
                    debug_fn = os.path.join(person_dir, f"invalid_image_{int(time.time())}_{idx}.b64.txt")
                    try:
                        with open(debug_fn, 'w', encoding='utf-8') as f:
                            f.write((image_data or '')[:10000])
                        print(f"[Face Registration] Wrote invalid image payload to {debug_fn}")
                    except Exception as _w:
                        print(f"[Face Registration] Failed to write invalid image payload: {_w}")
                    return jsonify({"success": False, "error": f"Invalid image at index {idx}"}), 400

                # Verify face present in the image
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                face_locations = face_recognition.face_locations(rgb_frame)
                if not face_locations:
                    # Save debug frame showing no face to disk for inspection
                    dbg_path = os.path.join(person_dir, f"no_face_{int(time.time())}_{idx}.jpg")
                    try:
                        cv2.imwrite(dbg_path, frame)
                        print(f"[Face Registration] Saved no-face debug image to {dbg_path}")
                    except Exception as _e:
                        print(f"[Face Registration] Failed to save no-face debug image: {_e}")
                    return jsonify({"success": False, "error": f"No face detected in image index {idx}"}), 400

                frames.append(frame)
                valid_count += 1
            except Exception as e:
                print(f"[Face Registration] Failed to process image index {idx}: {e}")
                return jsonify({"success": False, "error": f"Failed to process image index {idx}: {e}"}), 400

        # Create directory for person (ensure a folder exists)
        os.makedirs(person_dir, exist_ok=True)

        saved_files = []
        # Save validated frames to disk
        try:
            for idx, frame in enumerate(frames):
                timestamp = int(time.time())
                filename = f"{safe_name}_{timestamp}_{idx}.jpg"
                filepath = os.path.join(person_dir, filename)
                cv2.imwrite(filepath, frame)
                saved_files.append(filepath)
                print(f"[Face Registration] Saved face: {filepath}")
        except Exception as e:
            print(f"[Face Registration] Failed to save images: {e}")
            return jsonify({"success": False, "error": f"Failed to save images: {e}"}), 500

        db_result = None
        db_error = None
        # Attempt to register into MySQL (XAMPP) and record directory path
        try:
            from dotenv import load_dotenv
            load_dotenv()
            import mysql.connector

            DB_HOST = os.environ.get('DB_HOST', '127.0.0.1')
            DB_USER = os.environ.get('DB_USER', 'root')
            DB_PASS = os.environ.get('DB_PASS', '')
            DB_NAME = os.environ.get('DB_NAME', 'bantaybuhay')

            conn = mysql.connector.connect(host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME)
            cur = conn.cursor()
            # Validate responder_id exists; if not, insert as NULL to avoid FK errors
            valid_responder = None
            try:
                if responder_id is not None:
                    cur.execute("SELECT id FROM responders WHERE id = %s", (responder_id,))
                    if cur.fetchone():
                        valid_responder = responder_id
                    else:
                        print(f"[Face Registration] responder_id {responder_id} not found; inserting NULL")
            except Exception as _e:
                print(f"[Face Registration] Could not validate responder_id: {_e}")

            insert_sql = "INSERT INTO registered_faces (name, responder_id, directory, images_count) VALUES (%s, %s, %s, %s)"
            cur.execute(insert_sql, (safe_name, valid_responder, person_dir, valid_count))
            conn.commit()
            db_id = cur.lastrowid
            cur.close()
            conn.close()
            db_result = {"id": db_id}
            print(f"[Face Registration] Registered entry in DB with id {db_id}")
        except Exception as e:
            traceback.print_exc()
            db_error = str(e)
            print(f"[Face Registration] DB registration failed or connector missing: {e}")

        # Tell the facial recognition server to reload known faces (best-effort)
        try:
            requests.get('http://localhost:5000/api/facial/reload', timeout=2)
            print(f"[Face Registration] Requested facial server to reload known faces")
        except Exception as e:
            print(f"[Face Registration] Failed to notify facial server to reload: {e}")

        result = {"success": True, "message": f"Registered {valid_count} images for {safe_name}", "directory": person_dir, "files": saved_files}
        if db_result:
            result['db'] = db_result
        if db_error:
            result['db_error'] = db_error

        return jsonify(result)
    except Exception as e:
        print(f"[Face Registration] Unexpected error in register_faces: {e}")
        return jsonify({"success": False, "error": "Internal server error"}), 500

@app.route('/api/registration/list')
def list_registered():
    """List all registered faces. Prefer database-backed list if available."""
    # Try DB first (if connector available)
    try:
        from dotenv import load_dotenv
        load_dotenv()
        import mysql.connector

        DB_HOST = os.environ.get('DB_HOST', '127.0.0.1')
        DB_USER = os.environ.get('DB_USER', 'root')
        DB_PASS = os.environ.get('DB_PASS', '')
        DB_NAME = os.environ.get('DB_NAME', 'bantaybuhay')

        conn = mysql.connector.connect(host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME)
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id, name, responder_id, directory, images_count, created_at FROM registered_faces ORDER BY created_at DESC")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(rows)
    except Exception as e:
        print(f"[Face Registration] DB list failed or connector missing: {e}")

    # Fallback to filesystem-based listing
    registered = []
    for person_name in os.listdir(FACES_DIR):
        person_dir = os.path.join(FACES_DIR, person_name)
        if os.path.isdir(person_dir):
            images = [f for f in os.listdir(person_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
            registered.append({
                "name": person_name,
                "images_count": len(images),
                "directory": person_dir
            })
    return jsonify(registered)


@app.route('/api/registration/debug', methods=['POST'])
def registration_debug():
    """Lightweight debug endpoint for testing client-server connectivity."""
    try:
        data = request.json or {}
        name = data.get('name')
        images = data.get('images', [])
        print(f"[Face Registration] DEBUG called name={name} images={len(images)}")
        first_info = None
        if images and isinstance(images, list) and images[0]:
            first = images[0]
            first_info = {
                'len': len(first),
                'prefix': first[:64]
            }
        return jsonify({
            'success': True,
            'received': True,
            'name': name,
            'images_count': len(images),
            'first': first_info
        })
    except Exception as e:
        traceback.print_exc()
        print(f"[Face Registration] DEBUG error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/registration/db_status')
def registration_db_status():
    """Check DB connectivity and registered_faces table status"""
    try:
        from dotenv import load_dotenv
        load_dotenv()
        import mysql.connector

        DB_HOST = os.environ.get('DB_HOST', '127.0.0.1')
        DB_USER = os.environ.get('DB_USER', 'root')
        DB_PASS = os.environ.get('DB_PASS', '')
        DB_NAME = os.environ.get('DB_NAME', 'bantaybuhay')

        print(f"[Face Registration] DB status check on {DB_HOST}/{DB_NAME} as {DB_USER}")
        conn = mysql.connector.connect(host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME)
        cur = conn.cursor()
        # Check if table exists and count rows
        cur.execute("SHOW TABLES LIKE 'registered_faces'")
        table_exists = cur.fetchone() is not None
        rows_count = None
        if table_exists:
            cur.execute("SELECT COUNT(*) FROM registered_faces")
            rows_count = cur.fetchone()[0]
        cur.close()
        conn.close()
        return jsonify({"success": True, "connected": True, "table_exists": table_exists, "rows": rows_count})
    except Exception as e:
        traceback.print_exc()
        print(f"[Face Registration] DB status check failed: {e}")
        return jsonify({"success": False, "connected": False, "error": str(e)}), 500


@app.route('/api/registration/ping')
def registration_ping():
    """Lightweight ping to verify server is reachable from the client (no DB operations)."""
    print("[Face Registration] Ping received")
    return jsonify({"success": True, "ping": True})

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "face_registration"})

if __name__ == '__main__':
    print("[BantayBuhay] Face Registration Server Starting...")
    app.run(host='0.0.0.0', port=5002, threaded=True, debug=False)
