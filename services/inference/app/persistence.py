"""Rules that stop one odd frame from raising an alarm."""

from collections import deque


class Persistence:
    """Fires only when a detection appears in enough of the most recent frames."""

    def __init__(self, window: int, required: int) -> None:
        self.required = required
        self.recent: deque[float | None] = deque(maxlen=window)

    def update(self, confidence: float | None) -> float | None:
        """Adds one frame's result. Returns the mean hit confidence once it persists."""
        self.recent.append(confidence)
        hits = [value for value in self.recent if value is not None]
        if len(hits) < self.required:
            return None
        return round(sum(hits) / len(hits), 6)


class Cooldown:
    """Stops the same camera reporting the same thing again for a while."""

    def __init__(self, seconds: float) -> None:
        self.seconds = seconds
        self.until = float("-inf")

    def ready(self, now: float) -> bool:
        return now >= self.until

    def start(self, now: float) -> None:
        self.until = now + self.seconds
