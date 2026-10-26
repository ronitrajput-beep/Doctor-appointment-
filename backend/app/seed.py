import os
from hashlib import sha256
import secrets
from datetime import timedelta
from . import database as db
from .security import hash_password, verify, PRODUCTION

SPECIALTIES = [
    "Cardiology",
    "Dermatology",
    "Neurology",
    "Pediatrics",
    "Orthopedics",
    "General Medicine",
]
LEGACY_NAMES = [
    "Arjun Mehta",
    "Ananya Sharma",
    "Rohan Kapoor",
    "Priya Nair",
    "Vikram Rao",
    "Sara Khan",
]
CAST = [
    {
        "name": "Jhatka",
        "qualification": "MBBS, MD",
        "biography": "Dr. Jhatka brings a thoughtful, patient-first approach to cardiology. With careful listening and clear guidance, every consultation focuses on helping you feel informed and supported.",
    },
    {
        "name": "Jagdish Asthana",
        "qualification": "MBBS, MD",
        "biography": "Dr. Jagdish Asthana brings a thoughtful, patient-first approach to dermatology. With careful listening and clear guidance, every consultation focuses on helping you feel informed and supported.",
    },
    {
        "name": "Emmett Brown",
        "qualification": "MBBS, MD",
        "biography": "Dr. Emmett Brown brings a thoughtful, patient-first approach to neurology. With careful listening and clear guidance, every consultation focuses on helping you feel informed and supported.",
    },
    {
        "name": "Tsunade",
        "qualification": "MBBS, MD",
        "biography": "Dr. Tsunade brings a thoughtful, patient-first approach to pediatrics. With careful listening and clear guidance, every consultation focuses on helping you feel informed and supported.",
    },
    {
        "name": "Tony Tony Chopper",
        "qualification": "MBBS, MD",
        "biography": "Dr. Tony Tony Chopper brings a thoughtful, patient-first approach to orthopedics. With careful listening and clear guidance, every consultation focuses on helping you feel informed and supported.",
    },
    {
        "name": "John Zoidberg",
        "qualification": "MBBS, MD",
        "biography": "Dr. John Zoidberg brings a thoughtful, patient-first approach to general medicine. With careful listening and clear guidance, every consultation focuses on helping you feel informed and supported.",
    },
]

# Exact fingerprints of the previous generated defaults; preserve custom edits.
_PREVIOUS_DEFAULTS = [
    {
        "qualification": "1a1ee07d6597cde698b89200dcc4830a476a01ad342d35cdbac75dd431e041ed",
        "biography": "da6ce0e7489ee22786edd3debc2b40c9907c9bf515042f622513df0511e58af0",
    },
    {
        "qualification": "c0235892736ee047436d4c28398a39af71535a0147187bfe15f33aae11629047",
        "biography": "eb54f48484045515ebf27fdeb3ed9f23bff17a00b15f068df4517f38cd7e1e76",
    },
    {
        "qualification": "891157c70dee5d2e4e83b0b722b15b401a9fdd3ecafbf54655eb0ae5017879c0",
        "biography": "dbf94c1f45ed920eb68f5bcd21631867be159a9dea6a9cfff6524e5eeaddc714",
    },
    {
        "qualification": "25167ffc2e3bc3717fd43bc3902b2baa200427130ef773039c644486db7767c6",
        "biography": "ec4188d7bdc918e7341ad169cb37bc9f7de3e256cb4463de34b71ee7b0924025",
    },
    {
        "qualification": "11227aaf2d06b7489848da7550d95adf73c792edffb8a462c0ad489cb83ae3e8",
        "biography": "7855839fe986ca7464d51fc53cd080cdfc9f6afbe2d5a9d3f8e5b01c4d62f11f",
    },
    {
        "qualification": "e91e207fc44065967435b464ec6709e9f8643492fdb730aae9c3e876b677e8d9",
        "biography": "273393128ebe2910fa9b35655b06a84e7f3a87d7d2d710cc9d6c3bed60cc6ed1",
    },
]
_PREVIOUS_SPECIALTIES = [
    "General Medicine",
    "Dermatology",
    "Neurology",
    "Cardiology",
    "Pediatrics",
    "Orthopedics",
]


def refresh_demo_cast():
    """Update seeded identities and remove superseded generated profile text.

    Existing character profiles are changed field by field only when the value
    matches a previous generated default. Accounts and booking data stay intact.
    """
    if PRODUCTION or os.getenv("SEED_DEMO", "1") != "1":
        return
    with db.transaction() as c:
        for i, (legacy, character, spec) in enumerate(
            zip(LEGACY_NAMES, CAST, SPECIALTIES)
        ):
            did, user_id = f"doctor-{i+1}", f"user-doctor-{i+1}"
            original = c.execute(
                "SELECT 1 FROM doctors d JOIN users u USING(user_id) WHERE d.doctor_id=? AND d.user_id=? AND u.full_name=? AND u.role='doctor'",
                (did, user_id, legacy),
            ).fetchone()
            if not original:
                record = c.execute(
                    "SELECT d.* FROM doctors d JOIN users u USING(user_id) WHERE d.doctor_id=? AND d.user_id=? AND u.full_name=? AND u.role='doctor'",
                    (did, user_id, character["name"]),
                ).fetchone()
                if not record:
                    continue
                updates = {
                    field: character[field]
                    for field, fingerprint in _PREVIOUS_DEFAULTS[i].items()
                    if sha256(record[field].encode()).hexdigest() == fingerprint
                }
                if updates and record["specialization"] == _PREVIOUS_SPECIALTIES[i]:
                    updates["specialization"] = spec
                if updates:
                    c.execute(
                        "INSERT OR IGNORE INTO specializations VALUES(?)", (spec,)
                    )
                    assignments = ",".join(f"{field}=?" for field in updates)
                    c.execute(
                        f"UPDATE doctors SET {assignments} WHERE doctor_id=?",
                        (*updates.values(), did),
                    )
                continue
            c.execute("INSERT OR IGNORE INTO specializations VALUES(?)", (spec,))
            c.execute(
                "UPDATE users SET full_name=? WHERE user_id=?",
                (character["name"], user_id),
            )
            c.execute(
                "UPDATE doctors SET specialization=?,qualification=?,biography=?,image=? WHERE doctor_id=?",
                (spec, character["qualification"], character["biography"], i, did),
            )


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
    if PRODUCTION or os.getenv("SEED_DEMO", "1") != "1":
        return
    if db.one("SELECT user_id FROM users LIMIT 1"):
        refresh_demo_cast()
        write_doctor_logins()
        return
    accounts = []
    with db.transaction() as c:

        def user(user_id, name, email, role):
            password = secrets.token_urlsafe(12)
            accounts.append(f"| {role} | {email} | {password} | {name} |")
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
        for i, (character, spec) in enumerate(zip(CAST, SPECIALTIES)):
            user(
                f"user-doctor-{i+1}",
                character["name"],
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
                    character["qualification"],
                    [14, 10, 12, 9, 16, 11][i],
                    [1200, 900, 1500, 800, 1100, 700][i],
                    character["biography"],
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
        "# Local demonstration accounts\n\nGenerated for this installation. Fictional data only. Never publish these passwords.\n\n| Role | Email | Password | Name |\n|---|---|---|---|\n"
        + "\n".join(accounts)
        + "\n"
    )
    credential_path.chmod(0o600)
    write_doctor_logins()
    demo_slots()


def write_doctor_logins():
    """Create a local-only name-to-login guide without changing any password."""
    if PRODUCTION or os.getenv("SEED_DEMO", "1") != "1":
        return
    root = db.DB_PATH.parent.parent
    source = root / "DEMO_ACCOUNTS.md"
    if not source.exists():
        return
    passwords = {}
    for line in source.read_text().splitlines():
        columns = [p.strip() for p in line.split("|")]
        if len(columns) >= 5 and columns[1] == "doctor":
            passwords[columns[2]] = columns[3]
    rows = []
    for doctor in db.rows(
        "SELECT u.full_name,u.email,u.password_hash FROM users u JOIN doctors d USING(user_id) WHERE role='doctor' ORDER BY d.image,u.full_name"
    ):
        password = passwords.get(doctor["email"], "")
        value = (
            password
            if password and verify(password, doctor["password_hash"])
            else "Ask the administrator to reset this password."
        )
        rows.append(f"| Dr. {doctor['full_name']} | {doctor['email']} | {value} |")
    target = root / "DOCTOR_LOGINS.md"
    target.write_text(
        "# Doctor demonstration logins\n\nPrivate: generated for this installation only. Never upload this file to GitHub.\n\nSign in using the Doctor sign in page. These accounts cannot book appointments.\n\n| Doctor | Email | Password |\n|---|---|---|\n"
        + "\n".join(rows)
        + "\n"
    )
    target.chmod(0o600)
