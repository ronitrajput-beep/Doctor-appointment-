"""Build a local-only submission ZIP without leaking tokens or dependencies."""

import os
import sys
import sqlite3
import tempfile
import subprocess
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app import database as db
from app.excel import export_workbook

destination = ROOT / "E052_RonitRajput_DoctorAppointmentSystem.zip"
exclude = {
    ".git",
    ".venv",
    "node_modules",
    "dist",
    "__pycache__",
    ".pytest_cache",
    "test-results",
    "playwright-report",
    "database",
}
with tempfile.TemporaryDirectory() as temp:
    temporary = Path(temp)
    snapshot = temporary / "appointments.sqlite3"
    source = db.connect()
    backup = sqlite3.connect(snapshot)
    source.backup(backup)
    source.close()
    backup.execute("DELETE FROM sessions")
    backup.commit()
    assert backup.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    backup.close()
    original = db.DB_PATH
    try:
        db.DB_PATH = snapshot
        export_workbook()
    finally:
        db.DB_PATH = original
    with ZipFile(destination, "w", ZIP_DEFLATED) as archive:
        for p in sorted(ROOT.rglob("*")):
            relative = p.relative_to(ROOT)
            if not p.is_file() or any(x in exclude for x in relative.parts):
                continue
            if p.suffix in (".zip", ".log", ".pyc", ".tsbuildinfo") or p.name in (
                ".env",
                ".jwt-secret",
                "DEMO_ACCOUNTS.md",
            ):
                continue
            archive.write(p, Path("Doctor-Appointment-System") / relative)
        # These credentials describe fictional, local-only accounts and are excluded from Git.
        credentials = ROOT / "DEMO_ACCOUNTS.md"
        if not credentials.exists():
            raise RuntimeError("Initialize the demonstration before packaging.")
        archive.write(credentials, "Doctor-Appointment-System/DEMO_ACCOUNTS.md")
        archive.write(
            snapshot, "Doctor-Appointment-System/database/appointments.sqlite3"
        )
        archive.write(
            temporary / "Doctor_Appointment_Database.xlsx",
            "Doctor-Appointment-System/database/Doctor_Appointment_Database.xlsx",
        )
    with ZipFile(destination) as archive:
        assert archive.testzip() is None
        assert not any(
            "/node_modules/" in n or "/.venv/" in n or ".jwt-secret" in n
            for n in archive.namelist()
        )
        print(
            f"Created {destination.name}: {len(archive.namelist())} files, {destination.stat().st_size:,} bytes. Integrity verified."
        )
        print(
            "Local submission archive includes generated demo credentials. Do not publish it as a production artifact."
        )
