import numpy as np

from app.detectors import PERSON, lying_person_confidence

CLASSES = 80


def outputs(*people: tuple[float, float, float]) -> tuple[np.ndarray, np.ndarray]:
    """Builds model outputs: one query per (score, box width, box height), in 0 to 1 units."""
    logits = np.full((1, 300, CLASSES), -10.0, dtype=np.float32)
    boxes = np.zeros((1, 300, 4), dtype=np.float32)
    for index, (score, width, height) in enumerate(people):
        logits[0, index, PERSON] = np.log(score / (1 - score))
        boxes[0, index] = [0.5, 0.5, width, height]
    return logits, boxes


def test_a_wide_person_box_counts_as_lying_down() -> None:
    logits, boxes = outputs((0.8, 0.30, 0.10))
    assert lying_person_confidence(logits, boxes, frame_width=640, frame_height=640) == np.float32(0.8)


def test_a_standing_person_does_not_count() -> None:
    logits, boxes = outputs((0.95, 0.10, 0.40))
    assert lying_person_confidence(logits, boxes, frame_width=640, frame_height=640) is None


def test_the_frame_shape_is_taken_into_account() -> None:
    # Equal in model units, but a 16:9 frame makes this box twice as wide as it is tall.
    logits, boxes = outputs((0.9, 0.20, 0.20))
    assert lying_person_confidence(logits, boxes, frame_width=1280, frame_height=720) is not None
    assert lying_person_confidence(logits, boxes, frame_width=720, frame_height=1280) is None


def test_weak_detections_are_ignored() -> None:
    logits, boxes = outputs((0.2, 0.40, 0.10))
    assert lying_person_confidence(logits, boxes, frame_width=640, frame_height=640) is None


def test_the_most_confident_lying_person_wins() -> None:
    logits, boxes = outputs((0.6, 0.30, 0.10), (0.85, 0.40, 0.12), (0.99, 0.10, 0.40))
    confidence = lying_person_confidence(logits, boxes, frame_width=640, frame_height=640)
    assert confidence is not None and abs(confidence - 0.85) < 1e-5
