# CPU detector latency, 2026-11-07

**Result: a `c7i.2xlarge` meets the demo target on CPU, so no GPU is needed for the demo.** D-FINE-N handled 8 cameras at 2 fps with no dropped frames, double the target of 4 cameras.

**Machine:** AWS `c7i.2xlarge` in Singapore (8 vCPU, Intel Xeon Platinum 8488C), ONNX Runtime 1.31.1, CPU only.

**Method:** [`latency.py`](../../services/inference/benchmarks/latency.py) ran each model for 45 seconds per camera load. Each camera is its own process, asking for a frame every 500 ms. Latency runs from the frame's scheduled time to the end of inference, including resize. A frame still waiting when the next is due is dropped. Raw data: [cpu-latency-2026-11-07.json](cpu-latency-2026-11-07.json).

| Model | Input | 4 cameras: p95 | 4 cameras: dropped | 8 cameras: p95 | 8 cameras: dropped | Fastest single stream |
|---|---|---|---|---|---|---|
| **D-FINE-N** | 640 | **124 ms** | **0%** | **234 ms** | **0%** | 22.6 fps |
| RF-DETR-N | 384 | 300 ms | 0% | 1,067 ms | 13.6% | 11.5 fps |
| D-FINE-S | 640 | 321 ms | 0% | 1,093 ms | 18.1% | 10.2 fps |
| D-FINE-N, int8 | 640 | 386 ms | 0% | 1,211 ms | 31.1% | 6.6 fps |
| RF-DETR-S | 512 | 1,013 ms | 8.1% | 1,574 ms | 53.9% | 6.5 fps |
| D-FINE-S, int8 | 640 | 1,405 ms | 45.8% | 2,313 ms | 72.2% | 3.2 fps |

With 4 cameras, each process used 2 threads. With 8 cameras, each used 1.

The int8 versions were about three times slower than the standard ones, so quantizing these exports doesn't help on this CPU.

## What this doesn't measure

- **Accuracy.** These are speed results only. Fire, flood and person-down accuracy need fine-tuned models and their own evaluation. The published COCO figures favor D-FINE-S and RF-DETR-N over D-FINE-N, so the fastest model may not be the final choice.
- **The full pipeline.** Frames were synthetic and already in memory. Video decoding, tracking and pose estimation for person-down detection will add load.
- **Sharing the machine.** Nothing else was running. The API, database and other services would take CPU if they shared this instance.
- **Smaller instances.** Only `c7i.2xlarge` was tested.

## Cost

The two test runs lasted about 26 minutes in total, which is about $0.18 of compute at $0.4116 an hour, against the $5 approved. AWS's bill is the final figure.
