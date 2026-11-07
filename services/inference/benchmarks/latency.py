"""Measure CPU detector latency against the demo target of 4 cameras at 2 fps.

Run on the machine being evaluated, in a disposable environment:

    pip install numpy pillow onnxruntime
    python latency.py --out results.json

Frames are synthetic because detector latency barely depends on image content.
This measures speed only, not detection accuracy.
"""

import argparse
import json
import multiprocessing as mp
import os
import platform
import resource
import statistics
import time
import urllib.request
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image

HF = "https://huggingface.co/{repo}/resolve/main/onnx/{file}"
MODELS = {
    "dfine_n": ("onnx-community/dfine_n_coco-ONNX", "model.onnx", 640),
    "dfine_n_int8": ("onnx-community/dfine_n_coco-ONNX", "model_int8.onnx", 640),
    "dfine_s": ("onnx-community/dfine_s_coco-ONNX", "model.onnx", 640),
    "dfine_s_int8": ("onnx-community/dfine_s_coco-ONNX", "model_int8.onnx", 640),
    "rfdetr_nano": ("onnx-community/rfdetr_nano-ONNX", "model.onnx", 384),
    "rfdetr_small": ("onnx-community/rfdetr_small-ONNX", "model.onnx", 512),
}
LOADS = [(4, 2), (8, 1)]  # (cameras, threads per camera)
FPS = 2.0
SOURCE_FRAME = Image.fromarray(
    np.random.default_rng(0).integers(0, 255, (1080, 1920, 3), dtype=np.uint8)
)


def download(name: str, cache: Path) -> Path:
    repo, file, _ = MODELS[name]
    path = cache / f"{name}.onnx"
    if not path.exists():
        urllib.request.urlretrieve(HF.format(repo=repo, file=file), path)
    return path


def make_session(path: Path, threads: int) -> ort.InferenceSession:
    options = ort.SessionOptions()
    options.intra_op_num_threads = threads
    options.inter_op_num_threads = 1
    return ort.InferenceSession(str(path), options, providers=["CPUExecutionProvider"])


def prepare(size: int) -> np.ndarray:
    resized = SOURCE_FRAME.resize((size, size), Image.BILINEAR)
    array = np.asarray(resized, dtype=np.float32) / 255.0
    return array.transpose(2, 0, 1)[np.newaxis]


def infer(session: ort.InferenceSession, frame: np.ndarray) -> None:
    feed = {session.get_inputs()[0].name: frame}
    session.run(None, feed)


def percentile(values: list[float], pct: float) -> float:
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, int(len(ordered) * pct))]


def single_stream(path: Path, size: int, threads: int, frames: int = 60) -> dict:
    session = make_session(path, threads)
    frame = prepare(size)
    infer(session, frame)
    times = []
    for _ in range(frames):
        start = time.perf_counter()
        infer(session, frame)
        times.append((time.perf_counter() - start) * 1000)
    return {
        "threads": threads,
        "p50_ms": round(statistics.median(times), 1),
        "p95_ms": round(percentile(times, 0.95), 1),
        "max_fps": round(1000 / statistics.mean(times), 1),
    }


def camera(path, size, threads, duration, barrier, results) -> None:
    session = make_session(path, threads)
    infer(session, prepare(size))
    barrier.wait()
    interval = 1 / FPS
    start = time.perf_counter()
    latencies, dropped, tick = [], 0, 0
    while True:
        scheduled = start + tick * interval
        if scheduled - start >= duration:
            break
        now = time.perf_counter()
        if now < scheduled:
            time.sleep(scheduled - now)
        elif now - scheduled >= interval:
            # A real stream would have moved on, so a late frame is skipped.
            dropped += 1
            tick += 1
            continue
        infer(session, prepare(size))
        latencies.append((time.perf_counter() - scheduled) * 1000)
        tick += 1
    memory_mb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024
    results.put({"latencies": latencies, "dropped": dropped, "memory_mb": memory_mb})


def camera_load(path: Path, size: int, cameras: int, threads: int, duration: int) -> dict:
    barrier, results = mp.Barrier(cameras), mp.Queue()
    workers = [
        mp.Process(target=camera, args=(path, size, threads, duration, barrier, results))
        for _ in range(cameras)
    ]
    for worker in workers:
        worker.start()
    collected = [results.get(timeout=duration + 300) for _ in workers]
    for worker in workers:
        worker.join()
    latencies = [value for item in collected for value in item["latencies"]]
    dropped = sum(item["dropped"] for item in collected)
    total = len(latencies) + dropped
    return {
        "cameras": cameras,
        "threads_each": threads,
        "fps_each": FPS,
        "p50_ms": round(statistics.median(latencies), 1) if latencies else None,
        "p95_ms": round(percentile(latencies, 0.95), 1) if latencies else None,
        "dropped_pct": round(100 * dropped / total, 1) if total else None,
        "memory_mb_each": round(max(item["memory_mb"] for item in collected)),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="results.json")
    parser.add_argument("--duration", type=int, default=45)
    parser.add_argument("--cache", default="models")
    args = parser.parse_args()

    cache = Path(args.cache)
    cache.mkdir(exist_ok=True)
    report = {
        "cpus": os.cpu_count(),
        "platform": platform.platform(),
        "onnxruntime": ort.__version__,
        "models": {},
    }
    for name, (_, _, size) in MODELS.items():
        print(f"== {name}", flush=True)
        try:
            path = download(name, cache)
            entry = {
                "size": size,
                "file_mb": round(path.stat().st_size / 1e6, 1),
                "single_stream": single_stream(path, size, report["cpus"]),
                "camera_loads": [
                    camera_load(path, size, cameras, threads, args.duration)
                    for cameras, threads in LOADS
                ],
            }
        except Exception as error:  # noqa: BLE001 - one bad model shouldn't stop the others.
            entry = {"error": str(error)[:300]}
        report["models"][name] = entry
        print(json.dumps(entry), flush=True)
        Path(args.out).write_text(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
