Quick Docker Compose deployment (local or VPS)

This sets up the Gesture Recognition server with a MySQL database and Adminer (web DB UI).

Prereqs:
- Docker & Docker Compose installed
- Copy `.env.example` → `.env` and set strong passwords

Commands:

- Build and start services:

```bash
docker compose up -d --build
```

- Check logs:

```bash
docker compose logs -f gesture
```

- Import: the MySQL container auto-runs `scripts/init-database.sql` on first startup via `/docker-entrypoint-initdb.d/`.
  Use Adminer at http://localhost:8080 (login: host `mysql`, use credentials from `.env`).

Notes and tips:
- MediaPipe and OpenCV are CPU-heavy; for production, use a machine with multiple cores.
- If you want the app accessible from the internet, deploy this `docker-compose` stack on a VPS or a cloud VM and configure a reverse proxy (nginx) + TLS.
- For a managed/cloud option, you can instead build the `gesture` image and deploy it to Cloud Run or similar and connect it to a managed MySQL instance (Cloud SQL, RDS, etc.).
- Security: don't expose MySQL to the public internet in production; use a private network or managed DB.

If you want, I can:
- Add a `Makefile` for convenience
- Add a `Dockerfile` for the Next.js frontend and a full-stack compose file
- Add CI to build and push the `gesture` image to Docker Hub/GCR
