import os
import secrets
from datetime import timedelta
from . import database as db
from .security import hash_password, PRODUCTION

SPECIALTIES = [
    "Cardiology",
    "Dermatology",
    "Neurology",
    "Pediatrics",
    "Orthopedics",
    "General Medicine",
]
NAMES = [
    "Arjun Mehta",
    "Ananya Sharma",
    "Rohan Kapoor",
    "Priya Nair",
    "Vikram Rao",
    "Sara Khan",
]


def demo_slots():
    if PRODUCTION:
        raise RuntimeError("Demo seeding is disabled in production")
    with db.transaction() as c:
        for doctor in c.execute("SELECT doctor_id FROM doctors").fetchall():
            for offset in range(1, 15):
                day = (db.now().date() + timedelta(days=offset)).isoformat()
                for hour in [9, 10, 11, 14, 15, 16]:
                    start, end = f"{hour:02}:00", f"{hour:02}:30"
                    exists = c.execute(
                        "SELECT 1 FROM availability WHERE doctor_id=? AND appointment_date=? AND start_time<? AND end_time>?",
                        (doctor[0], day, end, start),
                    ).fetchone()
                    if not exists:
                        c.execute(
                            "INSERT INTO availability VALUES(?,?,?,?,?,?)",
                            (db.uid("S"), doctor[0], day, start, end, "available"),
                        )


def seed():
    if (
        PRODUCTION
        or os.getenv("SEED_DEMO", "1") != "1"
        or db.one("SELECT user_id FROM users LIMIT 1")
    ):
        return
    accounts = []
    with db.transaction() as c:

        def user(user_id, name, email, role):
            password = secrets.token_urlsafe(12)
            accounts.append(f"| {role} | {email} | {password} |")
            c.execute(
                "INSERT INTO users VALUES(?,?,?,?,?,?,?,1)",
                (
                    user_id,
                    name,
                    email,
                    "+91 98765 43210",
                    role,
                    db.stamp(),
                    hash_password(password),
                ),
            )

        user("user-patient", "Aarav Shah", "patient@example.com", "patient")
        user("user-patient2", "Diya Patel", "diya@example.com", "patient")
        user("user-admin", "Ronit Rajput", "admin@example.com", "admin")
        c.executemany(
            "INSERT INTO patients VALUES(?,?,?)",
            [("patient-1", "user-patient", ""), ("patient-2", "user-patient2", "")],
        )
        for i, (name, spec) in enumerate(zip(NAMES, SPECIALTIES)):
            user(
                f"user-doctor-{i+1}",
                name,
                "doctor@example.com" if i == 0 else f"doctor{i+1}@example.com",
                "doctor",
            )
            c.execute("INSERT INTO specializations VALUES(?)", (spec,))
            c.execute(
                "INSERT INTO doctors VALUES(?,?,?,?,?,?,?,?)",
                (
                    f"doctor-{i+1}",
                    f"user-doctor-{i+1}",
                    spec,
                    "MBBS, MD",
                    [14, 10, 12, 9, 16, 11][i],
                    [1200, 900, 1500, 800, 1100, 700][i],
                    f"Dr. {name} brings a thoughtful, patient-first approach to {spec.lower()}. With careful listening and clear guidance, every consultation focuses on helping you feel informed and supported.",
                    i,
                ),
            )
        for offset, status, doctor, patient in [
            (2, "confirmed", 1, 1),
            (-4, "completed", 2, 1),
            (5, "cancelled", 3, 1),
            (1, "confirmed", 1, 2),
        ]:
            day = (db.now().date() + timedelta(days=offset)).isoformat()
            sid, aid = db.uid("S"), db.uid("APT")
            c.execute(
                "INSERT INTO availability VALUES(?,?,?,?,?,?)",
                (
                    sid,
                    f"doctor-{doctor}",
                    day,
                    "12:00",
                    "12:30",
                    "available" if status == "cancelled" else "booked",
                ),
            )
            c.execute(
                "INSERT INTO appointments VALUES(?,?,?,?,?,?,?,?)",
                (
                    aid,
                    f"patient-{patient}",
                    f"doctor-{doctor}",
                    sid,
                    day,
                    "12:00",
                    status,
                    db.stamp(),
                ),
            )
            fee = c.execute(
                "SELECT consultation_fee FROM doctors WHERE doctor_id=?",
                (f"doctor-{doctor}",),
            ).fetchone()[0]
            c.execute(
                "INSERT INTO payments VALUES(?,?,?,?,?,?)",
                (
                    db.uid("P"),
                    aid,
                    fee,
                    "simulation",
                    "refunded" if status == "cancelled" else "simulated_paid",
                    db.uid("SIM"),
                ),
            )
            db.notify(
                c,
                "user-patient" if patient == 1 else "user-patient2",
                aid,
                f"Your sample appointment is {status}.",
            )
    credential_path = db.DB_PATH.parent.parent / "DEMO_ACCOUNTS.md"
    credential_path.write_text(
        "# Local demonstration accounts\n\nGenerated for this installation. Fictional data only. Never publish these passwords.\n\n| Role | Email | Password |\n|---|---|---|\n"
        + "\n".join(accounts)
        + "\n"
    )
    credential_path.chmod(0o600)
    demo_slots()
