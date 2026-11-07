"""Detectors turn one video frame into a confidence for one incident type, or None."""

from typing import Protocol

import cv2
import numpy as np
import onnxruntime as ort

# Camera frames never leave this network, and neither should usage data.
ort.disable_telemetry_events()

PERSON = 0  # COCO class index
MIN_PERSON_SCORE = 0.35
# A box this much wider than tall suggests someone lying on the ground. This is a baseline
# rule, not a trained classifier: overhead camera angles and sitting people can fool it.
LYING_ASPECT_RATIO = 1.3


class Detector(Protocol):
    incident_type: str
    model_version: str

    def detect(self, frame: np.ndarray) -> float | None: ...


def lying_person_confidence(
    logits: np.ndarray, boxes: np.ndarray, frame_width: int, frame_height: int
) -> float | None:
    """The highest score among people whose box is wide like a person lying down."""
    scores = 1 / (1 + np.exp(-logits[0, :, PERSON]))
    widths = boxes[0, :, 2] * frame_width
    heights = boxes[0, :, 3] * frame_height
    lying = (scores >= MIN_PERSON_SCORE) & (widths >= heights * LYING_ASPECT_RATIO)
    if not lying.any():
        return None
    return float(scores[lying].max())


class PersonDownDetector:
    """D-FINE-N (Apache 2.0, COCO) person detections, filtered by the lying-down rule."""

    incident_type = "person_down"
    model_version = "dfine-n-coco/person-down-v1"
    input_size = 640

    def __init__(self, model_path: str, threads: int = 2) -> None:
        options = ort.SessionOptions()
        options.intra_op_num_threads = threads
        options.inter_op_num_threads = 1
        self.session = ort.InferenceSession(model_path, options, providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name

    def detect(self, frame: np.ndarray) -> float | None:
        height, width = frame.shape[:2]
        # The model expects RGB, resized without padding and scaled to 0 to 1.
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        resized = cv2.resize(rgb, (self.input_size, self.input_size), interpolation=cv2.INTER_LINEAR)
        pixels = (resized.astype(np.float32) / 255.0).transpose(2, 0, 1)[np.newaxis]
        logits, boxes = self.session.run(None, {self.input_name: pixels})
        return lying_person_confidence(logits, boxes, width, height)
