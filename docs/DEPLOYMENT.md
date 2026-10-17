# Deployment

The app has not been published as a live website. Use a Python-capable host with persistent disk (for example a Render paid persistent disk service or a small VPS). A frontend-only static host cannot run FastAPI or persist SQLite.

1. Publish the reviewed application source to your own GitHub repository.
2. Build: `python -m pip install -r backend/requirements.lock.txt`, then `cd frontend && npm ci && npm run build`.
3. Set `APP_ENV=production`, `SEED_DEMO=0`, `JWT_SECRET` to a newly generated random secret of at least 32 characters, `DB_PATH` to a persistent disk file, and `ALLOWED_ORIGINS` to the exact HTTPS site origin. Environment variables are read from the hosting environment; `.env.example` is documentation, not automatically loaded.
4. Start: `python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port "$PORT"`. Use one application process for this SQLite demonstration. HTTPS terminates at the host's reverse proxy. Secure cookies are enabled in production.
5. On the host, run `PYTHONPATH=backend python -m app.manage create-admin` interactively. Never deploy demo account passwords or upload a local demo database as real patient data.
6. Check `/api/health`, login, doctor setup, booking and Excel exchange. Add doctors through the administrator UI and publish their schedules through doctor accounts.

Back up SQLite using its backup API; do not copy a live database without WAL coordination. Keep backups private. The local `.jwt-secret` is development-only; production requires the environment secret. All services must share the same secret if later scaled. The in-memory auth rate limit is appropriate for a single development process; distributed deployments need a shared rate limiter and operational monitoring.

Email/SMS, real payment processing, production privacy workflows, high availability, load balancing and healthcare compliance are future integration work. Under-three-second response, 200 concurrent users and 99% availability in the lab documents are targets; no production SLA is claimed.
