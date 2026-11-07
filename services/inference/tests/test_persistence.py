from app.persistence import Cooldown, Persistence


def test_needs_enough_hits_within_the_window() -> None:
    gate = Persistence(window=5, required=3)

    assert gate.update(0.9) is None
    assert gate.update(None) is None
    assert gate.update(0.8) is None
    assert gate.update(0.7) is not None


def test_reports_the_average_confidence_of_the_hits() -> None:
    gate = Persistence(window=5, required=3)
    for confidence in (0.9, None, 0.6):
        gate.update(confidence)

    assert gate.update(0.6) == 0.7


def test_forgets_hits_that_slide_out_of_the_window() -> None:
    gate = Persistence(window=3, required=2)
    gate.update(0.9)
    gate.update(None)
    gate.update(None)

    assert gate.update(0.9) is None


def test_a_single_bright_frame_never_fires() -> None:
    gate = Persistence(window=5, required=3)
    results = [gate.update(value) for value in (0.99, None, None, None, None, 0.99, None)]

    assert results == [None] * 7


def test_cooldown_blocks_repeats_until_it_expires() -> None:
    cooldown = Cooldown(seconds=60)

    assert cooldown.ready(now=0) is True
    cooldown.start(now=0)
    assert cooldown.ready(now=59) is False
    assert cooldown.ready(now=60) is True
