"""One worker per camera: read the stream, run detectors, and report what persists."""

import logging
import threading
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol

import cv2
import numpy as np

from app.detectors import Detector
from app.persistence import Cooldown, Persistence

log = logging.getLogger(__name__)
SNAPSHOT_MAX_WIDTH = 960
# A camera with no footage streams a generated test pattern instead, so it still shows online.
SYNTHETIC = "synthetic"
NETWORK_SCHEMES = ("rtsp://", "rtsps://", "http://", "https://")


def source_url(stream_path: str, video_dir: str, rtsp_base: str | None = None) -> str:
    """Where a camera's frames come from: a stream server when one is set (real cameras), else
    the clip named after the camera, else the test pattern."""
    if rtsp_base:
        return f"{rtsp_base.rstrip('/')}/{stream_path}"
    clip = Path(video_dir) / f"{stream_path.rsplit('/', 1)[-1]}.mp4"
    return str(clip) if clip.is_file() else SYNTHETIC


def pattern_frame(seconds: float, width: int = 640, height: int = 360) -> np.ndarray:
    """Colour bars with a band that moves over time, like the old simulator's test source."""
    colours = [(192, 192, 192), (0, 192, 192), (192, 192, 0), (0, 192, 0), (192, 0, 192), (0, 0, 192), (192, 0, 0)]
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    bar = width // len(colours) + 1
    for index, colour in enumerate(colours):
        frame[:, index * bar : (index + 1) * bar] = colour
    band = int((seconds * 60) % height)
    frame[band : band + 12, :] = 255
    return frame


class DetectionSink(Protocol):
    def post_detection(self, **payload) -> str: ...


def encode_snapshot(frame: np.ndarray) -> bytes:
    height, width = frame.shape[:2]
    if width > SNAPSHOT_MAX_WIDTH:
        frame = cv2.resize(frame, (SNAPSHOT_MAX_WIDTH, int(height * SNAPSHOT_MAX_WIDTH / width)))
    ok, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if not ok:
        raise ValueError("couldn't encode snapshot")
    return buffer.tobytes()


class CameraWorker:
    def __init__(
        self,
        camera_id: str,
        url: str,
        detectors: list[Detector],
        api: DetectionSink,
        window: int = 5,
        required: int = 3,
        cooldown_seconds: float = 60,
        fps: float = 2.0,
        heartbeat=None,
    ) -> None:
        self.camera_id = camera_id
        self.url = url
        self.detectors = detectors
        self.api = api
        self.fps = fps
        self.heartbeat = heartbeat
        self.gates = {d.incident_type: Persistence(window, required) for d in detectors}
        self.cooldowns = {d.incident_type: Cooldown(cooldown_seconds) for d in detectors}
        self.stats = {"frames": 0, "posted": 0, "errors": 0, "connected": False}
        self.stopping = threading.Event()
        self.lock = threading.Lock()
        self.latest: np.ndarray | None = None

    def process(self, frame: np.ndarray, now: float) -> None:
        """Runs every detector on one frame and reports any detection that has persisted."""
        self.stats["frames"] += 1
        for detector in self.detectors:
            confidence = detector.detect(frame)
            persisted = self.gates[detector.incident_type].update(confidence)
            cooldown = self.cooldowns[detector.incident_type]
            if persisted is None or not cooldown.ready(now):
                continue
            # Start the cooldown even if posting fails, so a down API isn't flooded on return.
            cooldown.start(now)
            try:
                outcome = self.api.post_detection(
                    camera_id=self.camera_id,
                    incident_type=detector.incident_type,
                    confidence=persisted,
                    model_version=detector.model_version,
                    captured_at=datetime.now(UTC).isoformat(),
                    snapshot=encode_snapshot(frame),
                )
                self.stats["posted"] += 1
                log.info("camera %s: %s %.2f, %s", self.camera_id, detector.incident_type, persisted, outcome)
            except Exception:  # One failed post must not stop the camera.
                self.stats["errors"] += 1
                log.exception("camera %s: couldn't post a detection", self.camera_id)

    def read_stream(self) -> None:
        """Reads frames and keeps only the newest one. Streams are read as fast as they arrive;
        clip files are read at their own speed and loop; the test pattern is generated."""
        if self.url == SYNTHETIC:
            self.stats["connected"] = True
            while not self.stopping.is_set():
                with self.lock:
                    self.latest = pattern_frame(time.monotonic())
                self.stopping.wait(1.0 / self.fps)
            return

        is_file = not self.url.startswith(NETWORK_SCHEMES)
        while not self.stopping.is_set():
            capture = cv2.VideoCapture(self.url, cv2.CAP_FFMPEG)
            if not capture.isOpened():
                self.stats["connected"] = False
                self.stopping.wait(5)
                continue
            self.stats["connected"] = True
            # A file would otherwise be read as fast as it decodes: skip to the analysis rate and
            # wait in real time, so a clip plays like a live camera without decoding every frame.
            source_fps = capture.get(cv2.CAP_PROP_FPS) or 25.0
            step = max(1, round(source_fps / self.fps)) if is_file else 1
            while not self.stopping.is_set():
                for _ in range(step - 1):
                    capture.grab()
                ok, frame = capture.read()
                if not ok:
                    break
                with self.lock:
                    self.latest = frame
                if is_file:
                    self.stopping.wait(step / source_fps)
            capture.release()
            # The end of a clip starts it again straight away; a dropped stream waits a moment.
            if not is_file:
                self.stats["connected"] = False
                with self.lock:
                    self.latest = None
            self.stopping.wait(0 if is_file else 2)

    def run(self) -> None:
        """Analyzes the newest frame at the target rate. Reading happens on its own thread, so
        slow analysis lowers the detection rate instead of stalling the stream."""
        threading.Thread(target=self.read_stream, name=f"read-{self.camera_id}", daemon=True).start()
        interval = 1.0 / self.fps
        last_heartbeat = float("-inf")
        while not self.stopping.wait(interval):
            with self.lock:
                frame, self.latest = self.latest, None
            now = time.monotonic()
            if frame is not None:
                self.process(frame, now)
            if self.heartbeat and self.stats["connected"] and now - last_heartbeat >= 10:
                last_heartbeat = now
                try:
                    self.heartbeat(self.camera_id)
                except Exception:  # A missed heartbeat only marks the camera offline.
                    log.warning("camera %s: heartbeat failed", self.camera_id, exc_info=True)

    def stop(self) -> None:
        self.stopping.set()
