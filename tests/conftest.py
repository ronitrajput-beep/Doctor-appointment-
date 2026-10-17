import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app import database as db
from app.main import app, attempts
from app.security import hash_password


@pytest.fixture
def env(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "database/test.sqlite3")
    attempts.clear()
    with TestClient(app) as client:
        with db.transaction() as c:
            c.execute(
                "UPDATE users SET password_hash=?", (hash_password("TestingPass123!"),)
            )

        def login(role="patient"):
            c = TestClient(app)
            email = {
                "patient": "patient@example.com",
                "patient2": "diya@example.com",
                "doctor": "doctor@example.com",
                "doctor2": "doctor2@example.com",
                "admin": "admin@example.com",
            }[role]
            result = c.post(
                "/api/auth/login", json={"email": email, "password": "TestingPass123!"}
            )
            assert result.status_code == 200, result.text
            return c

        yield client, login
