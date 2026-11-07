"""Talks to the BantayBuhay API with the detector token."""

import base64

import httpx


class ApiClient:
    def __init__(self, base_url: str, token: str, transport: httpx.BaseTransport | None = None) -> None:
        self.http = httpx.Client(
            base_url=base_url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
            transport=transport,
        )

    def cameras(self) -> list[dict]:
        response = self.http.get("/api/internal/cameras")
        response.raise_for_status()
        return response.json()["cameras"]

    def heartbeat(self, camera_id: str) -> None:
        self.http.post(f"/api/cameras/{camera_id}/heartbeat").raise_for_status()

    def post_detection(
        self,
        camera_id: str,
        incident_type: str,
        confidence: float,
        model_version: str,
        captured_at: str,
        snapshot: bytes | None,
    ) -> str:
        payload = {
            "cameraId": camera_id,
            "incidentType": incident_type,
            "confidence": confidence,
            "modelVersion": model_version,
            "capturedAt": captured_at,
        }
        if snapshot:
            payload["snapshot"] = base64.b64encode(snapshot).decode("ascii")
        response = self.http.post("/api/detections", json=payload)
        response.raise_for_status()
        return response.json()["outcome"]
