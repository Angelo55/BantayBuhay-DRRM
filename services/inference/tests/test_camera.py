import numpy as np

from app.camera import CameraWorker

FRAME = np.zeros((360, 640, 3), dtype=np.uint8)


class FakeDetector:
    incident_type = "person_down"
    model_version = "fake-v1"

    def __init__(self, confidences: list[float | None]) -> None:
        self.confidences = iter(confidences)

    def detect(self, frame: np.ndarray) -> float | None:
        return next(self.confidences)


class FakeApi:
    def __init__(self) -> None:
        self.detections: list[dict] = []

    def post_detection(self, **payload) -> str:
        self.detections.append(payload)
        return "alerted"


def worker(confidences: list[float | None], api: FakeApi, cooldown: int = 60) -> CameraWorker:
    return CameraWorker(
        camera_id="cam-1",
        url="rtsp://unused",
        detectors=[FakeDetector(confidences)],
        api=api,
        window=3,
        required=2,
        cooldown_seconds=cooldown,
    )


def test_posts_once_the_detection_persists() -> None:
    api = FakeApi()
    cam = worker([0.9, None, 0.8], api)

    for second in range(3):
        cam.process(FRAME, now=float(second))

    assert len(api.detections) == 1
    sent = api.detections[0]
    assert sent["camera_id"] == "cam-1"
    assert sent["incident_type"] == "person_down"
    assert sent["model_version"] == "fake-v1"
    assert abs(sent["confidence"] - 0.85) < 1e-6
    assert sent["snapshot"][:3] == b"\xff\xd8\xff"


def test_does_not_post_again_during_the_cooldown() -> None:
    api = FakeApi()
    cam = worker([0.9] * 10, api, cooldown=60)

    for second in range(10):
        cam.process(FRAME, now=float(second))

    assert len(api.detections) == 1


def test_posts_again_after_the_cooldown() -> None:
    api = FakeApi()
    cam = worker([0.9] * 4, api, cooldown=5)

    for second in (0, 1, 10, 11):
        cam.process(FRAME, now=float(second))

    assert len(api.detections) == 2


def test_keeps_running_when_the_api_is_down() -> None:
    class FailingApi(FakeApi):
        def post_detection(self, **payload) -> str:
            raise ConnectionError("api unreachable")

    cam = worker([0.9, 0.9, 0.9], FailingApi())
    for second in range(3):
        cam.process(FRAME, now=float(second))

    assert cam.stats["errors"] >= 1
