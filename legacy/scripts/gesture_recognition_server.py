import cv2
import mediapipe as mp
import numpy as np
from flask import Flask, Response, jsonify
from flask_cors import CORS
import time
import requests
import os
from flask import request

app = Flask(__name__)
CORS(app)

# MediaPipe setup
mp_hands = mp.solutions.hands
mp_draw = mp.solutions.drawing_utils

# Hand drawing colors (BGR for OpenCV)
HAND_CONNECTION_COLOR = (0, 255, 0)  # green lines
HAND_LANDMARK_COLOR = (0, 0, 255)    # red dots
HAND_CONNECTION_THICKNESS = 2
HAND_LANDMARK_RADIUS = 4

# Performance tuning
TARGET_FPS = 20  # desired frame rate to serve
PROCESS_EVERY_N_FRAMES = 2  # process every Nth frame with MediaPipe (reduce CPU)
PROCESS_WIDTH = 480  # width to resize frames for processing
# Global state
camera = None
latest_gesture = {"type": None, "confidence": 0, "timestamp": time.time()}
sos_detected = False
sos_count = 0
last_sos_time = 0
SOS_COOLDOWN = 30  # seconds between notifications
SOS_REQUIRED_FRAMES = 5  # how many consecutive frames to require before firing

def init_camera():
    """Initialize camera"""
    global camera
    if camera is not None:
        return camera
    # Try multiple indices/backends and verify frames are non-black
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
            print(f"[Gesture Recognition] Trying camera index {i} backend {backend}")
            if cap.isOpened():
                ret, frame = cap.read()
                if ret and frame is not None:
                    try:
                        import numpy as _np
                        if _np.any(frame != 0):
                            # set a lower default resolution for faster processing
                            try:
                                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                            except Exception:
                                pass
                            print(f"[Gesture Recognition] Camera initialized on index {i} backend {backend}")
                            camera = cap
                            return camera
                        else:
                            print(f"[Gesture Recognition] Camera at index {i} produced all-black frame")
                    except Exception as e:
                        print(f"[Gesture Recognition] Frame check error: {e}")
                cap.release()

    print(f"[Gesture Recognition] ERROR: No usable camera found! Tried: {tried}")
    return None

def is_sos_signal(hand_landmarks):
    """Detect SOS signal: 4 fingers up, thumb tucked"""
    landmarks = hand_landmarks.landmark
    
    # Check if fingers are up (except thumb)
    finger_tips = [8, 12, 16, 20]  # Index, middle, ring, pinky
    finger_pips = [6, 10, 14, 18]
    
    fingers_up = 0
    for tip, pip in zip(finger_tips, finger_pips):
        if landmarks[tip].y < landmarks[pip].y:
            fingers_up += 1
    
    # Check if thumb is tucked (not extended).
    # Heuristic: thumb tip is significantly closer to the wrist than index tip is when tucked.
    thumb_tip = landmarks[4]
    index_tip = landmarks[8]
    wrist = landmarks[0]

    def dist(a, b):
        return ((a.x - b.x) ** 2 + (a.y - b.y) ** 2) ** 0.5

    thumb_wrist = dist(thumb_tip, wrist)
    index_wrist = dist(index_tip, wrist)
    # If thumb is much closer to wrist than index (folded in), treat as tucked
    thumb_tucked = thumb_wrist < (0.75 * index_wrist)

    return fingers_up == 4 and thumb_tucked


def trigger_sos_event(message: str = "SOS Emergency detected"):
    """Centralized routine to record and notify about an SOS event with cooldown."""
    global latest_gesture, sos_detected, last_sos_time
    now = time.time()
    if now - last_sos_time < SOS_COOLDOWN:
        print("[Gesture Recognition] SOS event suppressed by cooldown")
        return

    last_sos_time = now
    sos_detected = True
    latest_gesture = {
        "type": "sos",
        "confidence": 0.95,
        "timestamp": now,
        "message": message,
    }

    print("[Gesture Recognition] Triggering SOS event: ", message)

    # Send alert to backend incidents API and notify responder (best-effort) -- reuse existing logic
    incident_payload = {
        "incident_type": "sos",
        "responder_id": int(os.environ.get('SOS_RESPOUNDER_ID', 2)),
        "severity": "critical",
        "status": "reported",
        "description": message,
        "location": "unknown",
    }
    try:
        resp = requests.post('http://localhost:3000/api/incidents', json=incident_payload, timeout=5)
        print(f"[Gesture Recognition] Incident POST status: {resp.status_code}")
    except Exception as e:
        print(f"[Gesture Recognition] Failed to send incident: {e}")

    try:
        notify_payload = {
            "responder_id": int(os.environ.get('SOS_RESPOUNDER_ID', 2)),
            "message": message,
            "source": "gesture_recognition",
        }
        resp2 = requests.post('http://localhost:3000/api/responders/notify', json=notify_payload, timeout=5)
        print(f"[Gesture Recognition] Notified responder: status={resp2.status_code}")
    except Exception as e:
        print(f"[Gesture Recognition] Failed to notify responder: {e}")

def generate_frames():
    """Generate video frames with gesture detection"""
    global latest_gesture, sos_detected, sos_count
    
    cap = init_camera()
    if cap is None:
        return
    # Run an outer loop which creates a fresh Hands graph per stream session.
    while True:
        # Create a per-stream MediaPipe instance to avoid graph/timestamp reuse across requests
        with mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        ) as hands:
            frame_idx = 0
            last_processed = None
            last_annotated_frame = None
            target_frame_time = 1.0 / TARGET_FPS
            perf_counter_start = time.perf_counter()
            perf_count = 0
            while True:
                start = time.perf_counter()
                success, frame = cap.read()
                if not success:
                    print("[Gesture Recognition] Failed to read frame")
                    return

                # Flip frame horizontally for mirror view
                frame = cv2.flip(frame, 1)

                # Resize a smaller copy for faster processing if large
                h, w, _ = frame.shape
                proc_frame = frame
                if w > PROCESS_WIDTH:
                    new_h = int(PROCESS_WIDTH * (h / w))
                    proc_frame = cv2.resize(frame, (PROCESS_WIDTH, new_h))

                # Convert to RGB and make contiguous (MediaPipe requirement)
                rgb_proc = cv2.cvtColor(proc_frame, cv2.COLOR_BGR2RGB)
                rgb_proc = np.ascontiguousarray(rgb_proc)

                results = None
                # Process only every Nth frame to reduce CPU
                if (frame_idx % PROCESS_EVERY_N_FRAMES) == 0:
                    try:
                        results = hands.process(rgb_proc)
                        last_processed = results
                    except ValueError as e:
                        print(f"[Gesture Recognition] MediaPipe error: {e}")
                        # Break inner loop to recreate the Hands instance
                        break
                else:
                    results = last_processed
                gesture_detected = False

                if results and results.multi_hand_landmarks:
                    for hand_landmarks in results.multi_hand_landmarks:
                        # Custom drawing: green connections and red landmark dots (more visible)
                        # Convert normalized landmarks to pixel coordinates
                        h, w, _ = frame.shape
                        pts = []
                        for lm in hand_landmarks.landmark:
                            x_px = int(lm.x * w)
                            y_px = int(lm.y * h)
                            pts.append((x_px, y_px))

                        # Draw connections
                        for (start_idx, end_idx) in mp_hands.HAND_CONNECTIONS:
                            if start_idx < len(pts) and end_idx < len(pts):
                                cv2.line(frame, pts[start_idx], pts[end_idx], HAND_CONNECTION_COLOR, HAND_CONNECTION_THICKNESS)

                        # Draw landmarks as filled circles
                        for i, (x_px, y_px) in enumerate(pts):
                            cv2.circle(frame, (x_px, y_px), HAND_LANDMARK_RADIUS, HAND_LANDMARK_COLOR, -1)
                            # small index label (white)
                            cv2.putText(frame, str(i), (x_px + 4, y_px + 4), cv2.FONT_HERSHEY_PLAIN, 0.8, (255, 255, 255), 1)

                        # Check for SOS signal
                        if is_sos_signal(hand_landmarks):
                            gesture_detected = True
                            sos_count += 1

                            # Trigger SOS if detected for a few consecutive frames and cooldown passed
                            if sos_count >= SOS_REQUIRED_FRAMES and (time.time() - last_sos_time) >= SOS_COOLDOWN:
                                trigger_sos_event("SOS Emergency detected")

                            # Draw SOS indicator (visual feedback when seen in frame)
                            cv2.rectangle(frame, (10, 10), (frame.shape[1] - 10, 60), (0, 0, 255), -1)
                            cv2.putText(frame, "SOS Emergency detected", (20, 42),
                                      cv2.FONT_HERSHEY_DUPLEX, 1, (255, 255, 255), 2)
                            cv2.rectangle(frame, (10, 10), (frame.shape[1] - 10, frame.shape[0] - 10),
                                        (0, 0, 255), 5)
        
        # Reset SOS count if gesture not detected
        if not gesture_detected:
            if sos_count > 0:
                sos_count = max(0, sos_count - 2)
            if sos_detected:
                sos_detected = False
                latest_gesture = {"type": None, "confidence": 0, "timestamp": time.time(), "message": None}
        
        # Draw status
        status_color = (0, 0, 255) if sos_detected else (0, 255, 0)
        status_text = "SOS ACTIVE" if sos_detected else "Monitoring..."
        cv2.putText(frame, status_text, (10, frame.shape[0] - 20),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)
        
        # Encode frame
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

        # Throttle to target FPS, accounting for processing time
        elapsed = time.perf_counter() - start
        to_sleep = max(0, target_frame_time - elapsed)
        if to_sleep > 0:
            time.sleep(to_sleep)

        frame_idx += 1
        perf_count += 1
        if perf_count >= 120:
            elapsed_total = time.perf_counter() - perf_counter_start
            avg_fps = perf_count / elapsed_total if elapsed_total > 0 else 0
            print(f"[Gesture Recognition] Avg FPS: {avg_fps:.1f}")
            perf_count = 0
            perf_counter_start = time.perf_counter()

@app.route('/api/gesture/stream')
def video_feed():
    """Video streaming route"""
    cap = init_camera()
    if cap is None:
        return jsonify({"error": "Camera not available"}), 503

    return Response(generate_frames(),
                   mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/api/gesture/test_frame')
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

    dbg_path = os.path.join(os.path.dirname(__file__), '..', 'registered_faces', f"gesture_test_frame_{int(time.time())}.jpg")
    try:
        cv2.imwrite(dbg_path, frame)
        stats["saved_path"] = dbg_path
    except Exception as e:
        stats["save_error"] = str(e)

    return jsonify(stats)


@app.route('/api/gesture/frame.jpg')
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

@app.route('/api/gesture/detections')
def get_detections():
    """Get latest gesture detections"""
    return jsonify(latest_gesture)


@app.route('/api/gesture/detect_frame', methods=['POST'])
def detect_frame():
    """Accept a base64 image from client and return gesture detections for that frame"""
    data = request.json or {}
    image_data = data.get('image_data')
    if not image_data:
        return jsonify({"error": "image_data is required"}), 400

    try:
        header, encoded = image_data.split(',', 1)
        import base64 as _base64, numpy as _np
        img_bytes = _base64.b64decode(encoded)
        nparr = _np.frombuffer(img_bytes, _np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Could not decode image")
    except Exception as e:
        return jsonify({"error": f"Invalid image_data: {e}"}), 400

    # Process with a fresh MediaPipe Hands instance
    try:
        # Downscale for faster processing if needed
        h, w, _ = frame.shape
        proc = frame
        if w > PROCESS_WIDTH:
            proc = cv2.resize(frame, (PROCESS_WIDTH, int(PROCESS_WIDTH * (h / w))))
        rgb_frame = cv2.cvtColor(proc, cv2.COLOR_BGR2RGB)
        rgb_frame = np.ascontiguousarray(rgb_frame)
        with mp_hands.Hands(static_image_mode=True, max_num_hands=2, min_detection_confidence=0.5) as hands:
            results = hands.process(rgb_frame)
    except Exception as e:
        return jsonify({"error": f"MediaPipe error: {e}"}), 500

    gestures = []
    if results and results.multi_hand_landmarks:
        print(f"[Gesture Recognition] detect_frame: found {len(results.multi_hand_landmarks)} hand(s)")
        sos_in_frame = False
        for hand_idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
            is_sos = is_sos_signal(hand_landmarks)
            if is_sos:
                sos_in_frame = True
            gestures.append({
                "type": "sos" if is_sos else "hand",
                "is_sos": bool(is_sos),
                "confidence": 0.95 if is_sos else 0.5
            })

        # If an SOS was detected in this single-frame request, trigger (respecting cooldown)
        if sos_in_frame:
            trigger_sos_event("SOS Emergency detected")

        # Optionally, return an annotated copy of the frame for debugging
        try:
            # Draw landmarks onto the frame similar to live stream
            h, w, _ = frame.shape
            for hand_landmarks in results.multi_hand_landmarks:
                pts = [(int(lm.x * w), int(lm.y * h)) for lm in hand_landmarks.landmark]
                for (s, e) in mp_hands.HAND_CONNECTIONS:
                    if s < len(pts) and e < len(pts):
                        cv2.line(frame, pts[s], pts[e], HAND_CONNECTION_COLOR, HAND_CONNECTION_THICKNESS)
                for i, (x_px, y_px) in enumerate(pts):
                    cv2.circle(frame, (x_px, y_px), HAND_LANDMARK_RADIUS, HAND_LANDMARK_COLOR, -1)

            import base64
            _, buf = cv2.imencode('.jpg', frame)
            annotated_b64 = base64.b64encode(buf.tobytes()).decode('ascii')
            annotated_dataurl = 'data:image/jpeg;base64,' + annotated_b64
        except Exception as _e:
            annotated_dataurl = None
            print(f"[Gesture Recognition] Failed to create annotated image: {_e}")

    resp = {"gestures": gestures}
    if 'annotated_dataurl' in locals() and annotated_dataurl:
        resp['annotated'] = annotated_dataurl
    # Surface the latest message so clients can display a persistent banner
    if latest_gesture.get('message'):
        resp['message'] = latest_gesture.get('message')
    return jsonify(resp)

@app.route('/api/gesture/trigger_sos', methods=['POST'])
def trigger_sos():
    """Manual trigger for SOS (useful for UI testing)."""
    data = request.json or {}
    msg = data.get('message', 'SOS Emergency detected')
    try:
        trigger_sos_event(msg)
        return jsonify({"status": "ok", "message": msg})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "gesture_recognition"})

if __name__ == '__main__':
    print("[BantayBuhay] Gesture Recognition Server Starting...")
    app.run(host='0.0.0.0', port=5001, threaded=True, debug=False)
