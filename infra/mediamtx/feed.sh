#!/bin/sh
# Publishes one simulated camera stream to MediaMTX. Called with the path, such as sim/binicuil.
set -eu
path="$1"
clip="/media/${path#sim/}.mp4"
target="rtsp://localhost:8554/$path"

if [ -f "$clip" ]; then
  exec ffmpeg -hide_banner -loglevel error -re -stream_loop -1 -i "$clip" \
    -vf "scale=1280:-2" -r 10 -c:v libx264 -preset ultrafast -tune zerolatency -g 20 -an \
    -f rtsp "$target"
fi

# No clip: a labelled test pattern keeps the pipeline exercised without real footage.
exec ffmpeg -hide_banner -loglevel error -re -f lavfi -i "testsrc2=size=640x360:rate=5" \
  -c:v libx264 -preset ultrafast -tune zerolatency -g 10 -an -f rtsp "$target"
