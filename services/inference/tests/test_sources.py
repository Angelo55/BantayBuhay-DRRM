import threading
import time
from itertools import pairwise
from pathlib import Path

import cv2
import numpy as np

from app.camera import SYNTHETIC, CameraWorker, pattern_frame, source_url


class NoSink:
    def post_detection(self, **payload) -> str:
        return "ignored"


def worker(url: str, fps: float) -> CameraWorker:
    return CameraWorker(camera_id="cam", url=url, detectors=[], api=NoSink(), fps=fps)


def test_a_stream_server_wins_when_set(tmp_path: Path) -> None:
    (tmp_path / "binicuil.mp4").write_bytes(b"clip")
    assert source_url("sim/binicuil", str(tmp_path), "rtsp://cameras:8554/") == "rtsp://cameras:8554/sim/binicuil"


def test_uses_the_clip_named_after_the_camera(tmp_path: Path) -> None:
    (tmp_path / "binicuil.mp4").write_bytes(b"clip")
    assert source_url("sim/binicuil", str(tmp_path)) == str(tmp_path / "binicuil.mp4")


def test_falls_back_to_the_test_pattern_without_a_clip(tmp_path: Path) -> None:
    assert source_url("sim/tagukon", str(tmp_path)) == SYNTHETIC


def test_the_test_pattern_moves() -> None:
    first, later = pattern_frame(0.0), pattern_frame(1.0)
    assert first.shape == (360, 640, 3)
    assert not np.array_equal(first, later)


def test_the_test_pattern_keeps_a_camera_online() -> None:
    camera = worker(SYNTHETIC, fps=20)
    threading.Thread(target=camera.read_stream, daemon=True).start()
    time.sleep(0.2)
    camera.stop()
    assert camera.stats["connected"] is True
    assert camera.latest is not None


def test_a_clip_plays_at_its_own_speed_and_loops(tmp_path: Path) -> None:
    # Ten frames at 20 fps is half a second of video. Read for 1.5 seconds: a paced reader loops
    # about three times; an unpaced one would race through it hundreds of times.
    clip = tmp_path / "clip.avi"
    writer = cv2.VideoWriter(str(clip), cv2.VideoWriter_fourcc(*"MJPG"), 20, (64, 48))
    for index in range(10):
        writer.write(np.full((48, 64, 3), index * 20, dtype=np.uint8))
    writer.release()

    camera = worker(str(clip), fps=20)
    seen: list[int] = []

    def watch() -> None:
        while not camera.stopping.is_set():
            with camera.lock:
                frame = camera.latest
                camera.latest = None
            if frame is not None:
                seen.append(int(frame[0, 0, 0]))
            time.sleep(0.01)

    threading.Thread(target=camera.read_stream, daemon=True).start()
    threading.Thread(target=watch, daemon=True).start()
    time.sleep(1.5)
    camera.stop()

    assert 15 <= len(seen) <= 45, f"read {len(seen)} frames"
    restarts = sum(1 for before, after in pairwise(seen) if after < before)
    assert restarts >= 1
