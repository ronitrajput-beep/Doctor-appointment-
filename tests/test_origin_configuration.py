"""Regression checks for the launcher's configurable application port."""

import json
import os
from pathlib import Path
import subprocess
import sys
import pytest


@pytest.mark.parametrize(
    "port,override,origin,expected",
    [
        (None, None, "http://localhost:8000", 200),
        ("8010", None, "http://127.0.0.1:8010", 200),
        ("8010", None, "https://untrusted.example", 403),
        ("8010", "https://clinic.example", "http://127.0.0.1:8010", 403),
        ("8010", "https://clinic.example", "https://clinic.example", 200),
    ],
    ids=[
        "default-port",
        "custom-port",
        "untrusted-origin",
        "override-denies-local",
        "override-allows-site",
    ],
)
def test_configured_origin(tmp_path, port, override, origin, expected):
    root = Path(__file__).resolve().parents[1]
    env = os.environ.copy()
    for key in ["PORT", "ALLOWED_ORIGINS", "APP_ENV", "JWT_SECRET"]:
        env.pop(key, None)
    env.update(
        PYTHONPATH=str(root / "backend"),
        DB_PATH=str(tmp_path / "database" / "test.sqlite3"),
        SEED_DEMO="1",
        LAB_ORIGIN=origin,
    )
    if port is not None:
        env["PORT"] = port
    if override is not None:
        env["ALLOWED_ORIGINS"] = override
    program = """
import json, os
from fastapi.testclient import TestClient
from app.main import app
from app import database as db, security as auth
with TestClient(app) as client:
    with db.transaction() as c:
        c.execute("UPDATE users SET password_hash=? WHERE email='patient@example.com'", (auth.hash_password('TestingPass123!'),))
    r=client.post('/api/auth/login', headers={'origin':os.environ['LAB_ORIGIN']}, json={'email':'patient@example.com','password':'TestingPass123!'})
    print(json.dumps({'status':r.status_code,'allow_origin':r.headers.get('access-control-allow-origin'),'role':r.json().get('role')}))
"""
    run = subprocess.run(
        [sys.executable, "-c", program],
        env=env,
        capture_output=True,
        text=True,
        timeout=45,
    )
    assert run.returncode == 0, run.stderr
    result = json.loads(run.stdout.strip())
    assert result["status"] == expected, result
    if expected == 200:
        assert result["allow_origin"] == origin
        assert result["role"] == "patient"
