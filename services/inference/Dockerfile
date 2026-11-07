# Build context: services/inference.
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# D-FINE-N trained on COCO, Apache 2.0, from https://huggingface.co/ustc-community/dfine-nano-coco.
# The checksum pins the exact file, so a changed upload fails the build instead of running.
ADD --checksum=sha256:0f684f409618ee8a822410e754a29caa817d1aa16283ce89cad936d0a48e2f35 \
  https://huggingface.co/onnx-community/dfine_n_coco-ONNX/resolve/main/onnx/model.onnx \
  /models/dfine_n_coco.onnx

COPY app app
RUN useradd --system --no-create-home inference && chmod 0444 /models/dfine_n_coco.onnx
USER inference
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
