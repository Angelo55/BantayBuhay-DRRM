"""Simple test script to POST 4 dummy images to the registration server.

Run with:
    python scripts/test_registration.py --name Test_User

It will create 4 small images in memory, send them as data URLs and print server responses.
"""

import argparse
import io
import base64
import json
import requests
from PIL import Image, ImageDraw

REG_URL = "http://localhost:5002/api/registration/register"


def make_dummy_image(seed=0):
    img = Image.new('RGB', (160, 160), (50 + seed * 10 % 200, 80, 120))
    d = ImageDraw.Draw(img)
    # simple face-like circles for quick visual
    d.ellipse((50, 40, 70, 60), fill=(255, 255, 255))
    d.ellipse((90, 40, 110, 60), fill=(255, 255, 255))
    d.ellipse((70, 80, 90, 100), fill=(200, 100, 100))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    b = buf.getvalue()
    return 'data:image/jpeg;base64,' + base64.b64encode(b).decode('ascii')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--name', default='Test_User')
    parser.add_argument('--host', default='http://localhost:5002')
    args = parser.parse_args()

    images = [make_dummy_image(i) for i in range(4)]
    payload = {
        'name': args.name,
        'responder_id': None,
        'images': images
    }
    try:
        resp = requests.post(args.host + '/api/registration/register', json=payload, timeout=15)
        try:
            data = resp.json()
        except Exception:
            data = resp.text
        print('Status:', resp.status_code)
        print('Response:', json.dumps(data, indent=2) if isinstance(data, dict) else data)
    except Exception as e:
        print('Error sending request:', e)


if __name__ == '__main__':
    main()
