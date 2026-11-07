import logging
import os
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.camera import CameraWorker, source_url
from app.client import ApiClient
from app.detectors import PersonDownDetector

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logging.getLogger("httpx").setLevel(logging.WARNING)  # Heartbeats would flood the log.
log = logging.getLogger("inference")
workers: list[CameraWorker] = []


def start_workers() -> None:
    """Starts one worker per camera. Without a detector token, the service only serves health."""
    token = os.environ.get("DETECTOR_TOKEN")
    if not token:
        log.warning("DETECTOR_TOKEN isn't set, so detection is off")
        return
    api = ApiClient(os.environ.get("API_URL", "http://127.0.0.1:3000"), token)
    # Real cameras come through a stream server (RTSP_BASE); simulated ones from clip files.
    rtsp_base = os.environ.get("RTSP_BASE") or None
    video_dir = os.environ.get("VIDEO_DIR", "../../media/sim")
    detector = PersonDownDetector(os.environ.get("MODEL_PATH", "models/dfine_n_coco.onnx"))
    cameras = api.cameras()
    # Detection is CPU-heavy, so a laptop can watch fewer cameras than the server.
    limit = int(os.environ.get("CAMERA_LIMIT", "0"))
    if limit > 0:
        cameras = cameras[:limit]
    for camera in cameras:
        url = source_url(camera["streamPath"], video_dir, rtsp_base)
        log.info("camera %s reads %s", camera["name"], "a test pattern" if url == "synthetic" else url)
        worker = CameraWorker(
            camera_id=camera["id"],
            url=url,
            detectors=[detector],
            api=api,
            fps=float(os.environ.get("FRAMES_PER_SECOND", "2")),
            heartbeat=api.heartbeat,
        )
        threading.Thread(target=worker.run, name=f"camera-{camera['id']}", daemon=True).start()
        workers.append(worker)
    log.info("watching %d cameras", len(workers))


def start_in_background() -> None:
    # The API may still be starting, so keep trying without blocking health checks.
    def attempt() -> None:
        stop = threading.Event()
        while not workers and not stop.wait(5):
            try:
                start_workers()
                if workers:
                    return
                log.info("no cameras yet, checking again")
            except Exception:  # Retried until the API answers.
                log.warning("couldn't load cameras yet, retrying", exc_info=True)

    threading.Thread(target=attempt, name="start-workers", daemon=True).start()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if os.environ.get("WORKERS_ENABLED", "true") == "true":
        start_in_background()
    yield
    for worker in workers:
        worker.stop()


app = FastAPI(title="BantayBuhay inference service", lifespan=lifespan)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/status")
def status() -> dict:
    return {"cameras": [{"id": w.camera_id, **w.stats} for w in workers]}
