import base64
import json

import httpx

from app.client import ApiClient


def test_sends_the_token_and_the_api_field_names() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(201, json={"outcome": "queued"})

    client = ApiClient("http://api", "secret-token", transport=httpx.MockTransport(handler))
    outcome = client.post_detection(
        camera_id="cam-1",
        incident_type="person_down",
        confidence=0.5,
        model_version="m1",
        captured_at="2026-11-07T08:00:00+00:00",
        snapshot=b"\xff\xd8\xff",
    )

    assert outcome == "queued"
    request = seen[0]
    assert request.headers["authorization"] == "Bearer secret-token"
    body = json.loads(request.content)
    assert body["cameraId"] == "cam-1"
    assert body["incidentType"] == "person_down"
    assert base64.b64decode(body["snapshot"]) == b"\xff\xd8\xff"


def test_raises_when_the_api_refuses() -> None:
    client = ApiClient(
        "http://api", "bad", transport=httpx.MockTransport(lambda request: httpx.Response(401))
    )
    try:
        client.cameras()
    except httpx.HTTPStatusError:
        return
    raise AssertionError("expected an error for a 401")
