import os
import sqlite3
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
DB_PATH = Path(os.getenv("DB_PATH", ROOT / "database/appointments.sqlite3"))
TZ = ZoneInfo("Asia/Kolkata")


def now():
    return datetime.now(TZ)


def stamp():
    return now().isoformat(timespec="seconds")


def uid(prefix):
    return prefix + "-" + uuid4().hex[:16]


def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(DB_PATH, timeout=20, isolation_level=None)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys=ON")
    c.execute("PRAGMA journal_mode=WAL")
    return c


@contextmanager
def transaction():
    c = connect()
    try:
        c.execute("BEGIN IMMEDIATE")
        yield c
        c.commit()
    except Exception:
        c.rollback()
        raise
    finally:
        c.close()


def rows(sql, args=()):
    c = connect()
    try:
        return [dict(r) for r in c.execute(sql, args)]
    finally:
        c.close()


def one(sql, args=()):
    result = rows(sql, args)
    return result[0] if result else None


def initialize():
    c = connect()
    c.executescript(
        """
    CREATE TABLE IF NOT EXISTS users(user_id TEXT PRIMARY KEY,full_name TEXT NOT NULL,email TEXT UNIQUE COLLATE NOCASE NOT NULL,phone TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('patient','doctor','admin')),created_at TEXT NOT NULL,password_hash TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)));
    CREATE TABLE IF NOT EXISTS patients(patient_id TEXT PRIMARY KEY,user_id TEXT NOT NULL UNIQUE REFERENCES users(user_id),profile_details TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS specializations(name TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS doctors(doctor_id TEXT PRIMARY KEY,user_id TEXT NOT NULL UNIQUE REFERENCES users(user_id),specialization TEXT NOT NULL REFERENCES specializations(name),qualification TEXT NOT NULL,experience_years INTEGER NOT NULL CHECK(experience_years BETWEEN 0 AND 70),consultation_fee REAL NOT NULL CHECK(consultation_fee BETWEEN 0 AND 100000),biography TEXT NOT NULL,image INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS availability(slot_id TEXT PRIMARY KEY,doctor_id TEXT NOT NULL REFERENCES doctors(doctor_id),appointment_date TEXT NOT NULL,start_time TEXT NOT NULL,end_time TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('available','booked','blocked')),UNIQUE(doctor_id,appointment_date,start_time),CHECK(start_time<end_time));
    CREATE TABLE IF NOT EXISTS appointments(appointment_id TEXT PRIMARY KEY,patient_id TEXT NOT NULL REFERENCES patients(patient_id),doctor_id TEXT NOT NULL REFERENCES doctors(doctor_id),slot_id TEXT NOT NULL REFERENCES availability(slot_id),appointment_date TEXT NOT NULL,appointment_time TEXT NOT NULL,booking_status TEXT NOT NULL CHECK(booking_status IN ('confirmed','cancelled','completed')),created_at TEXT NOT NULL);
    CREATE UNIQUE INDEX IF NOT EXISTS one_booking ON appointments(slot_id) WHERE booking_status!='cancelled';
    CREATE TABLE IF NOT EXISTS payments(payment_id TEXT PRIMARY KEY,appointment_id TEXT NOT NULL UNIQUE REFERENCES appointments(appointment_id),amount REAL NOT NULL CHECK(amount>=0),payment_method TEXT NOT NULL CHECK(payment_method='simulation'),payment_status TEXT NOT NULL CHECK(payment_status IN ('simulated_paid','refunded')),transaction_reference TEXT NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS notifications(notification_id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(user_id),appointment_id TEXT REFERENCES appointments(appointment_id),message TEXT NOT NULL,notification_status TEXT NOT NULL CHECK(notification_status IN ('unread','read')),created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(jti TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(user_id),expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS medical_histories(patient_id TEXT PRIMARY KEY REFERENCES patients(patient_id),date_of_birth TEXT NOT NULL DEFAULT '',blood_group TEXT NOT NULL DEFAULT '',allergies TEXT NOT NULL DEFAULT '',conditions TEXT NOT NULL DEFAULT '',medications TEXT NOT NULL DEFAULT '',surgeries TEXT NOT NULL DEFAULT '',family_history TEXT NOT NULL DEFAULT '',other_notes TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS doctor_time_off(leave_id TEXT PRIMARY KEY,doctor_id TEXT NOT NULL REFERENCES doctors(doctor_id),starts_at TEXT NOT NULL,ends_at TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('leave','unavailable')),note TEXT NOT NULL DEFAULT '',CHECK(starts_at<ends_at));
    CREATE INDEX IF NOT EXISTS doctor_time_off_range ON doctor_time_off(doctor_id,starts_at,ends_at);
    CREATE INDEX IF NOT EXISTS appointments_patient ON appointments(patient_id);
    CREATE INDEX IF NOT EXISTS appointments_doctor ON appointments(doctor_id,appointment_date);
    """
    )
    c.close()


def notify(c, user_id, appointment_id, message):
    c.execute(
        "INSERT INTO notifications VALUES(?,?,?,?,?,?)",
        (uid("N"), user_id, appointment_id, message, "unread", stamp()),
    )
