"""Test script to call the registration server's DB status and ping endpoints.

Run with:
    python scripts/test_db_status.py
"""

import requests

BASE = 'http://localhost:5002'


def main():
    try:
        r = requests.get(BASE + '/api/registration/ping', timeout=5)
        print('PING status', r.status_code, r.text)
    except Exception as e:
        print('PING failed:', e)

    try:
        r = requests.get(BASE + '/api/registration/db_status', timeout=10)
        print('DB_STATUS status', r.status_code)
        try:
            print('DB_STATUS json:', r.json())
        except Exception as e:
            print('DB_STATUS body:', r.text)
    except Exception as e:
        print('DB_STATUS failed:', e)

if __name__ == '__main__':
    main()
