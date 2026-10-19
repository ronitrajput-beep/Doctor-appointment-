import os
import secrets
from datetime import timedelta
from . import database as db
from .security import hash_password, PRODUCTION

SPECIALTIES = [
    "General Medicine",
    "Dermatology",
    "Neurology",
    "Cardiology",
    "Pediatrics",
    "Orthopedics",
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
        "qualification": "Motu Patlu · PhD in accidental inventions",
        "biography": "Furfuri Nagar's most enthusiastic inventor has opened a clinic. Dr. Jhatka promises a consultation without explosions, although the waiting-room toaster has other plans. His latest invention is the Appointment-O-Matic: it works almost as well as this website. Please keep Motu away from the complimentary samosas.",
    },
    {
        "name": "Jagdish Asthana",
        "qualification": "Munna Bhai M.B.B.S. · Dean of extremely serious laughter",
        "biography": "Dr. Asthana runs a very serious clinic. You can tell because he laughs aggressively whenever things go wrong. His skincare routine is strict discipline, a spotless white coat and absolutely no surprise jaadu ki jhappis from Munna. Please arrive on time: the dean has already checked the attendance register twice.",
    },
    {
        "name": "Emmett Brown",
        "qualification": "Back to the Future · PhD in flux capacitor repairs",
        "biography": "Great Scott! Doc Brown has converted his lab into a fictional clinic, and the waiting-room clock is now deeply confused. He specializes in overthinking, spectacular bed hair and appointments that require 1.21 gigawatts of enthusiasm. Please use the calendar: the booking system still refuses appointments in 1985, even if your DeLorean does not.",
    },
    {
        "name": "Tsunade",
        "qualification": "Naruto · Legendary medical ninja & Fifth Hokage",
        "biography": "Konoha's legendary medical ninja is taking a break from Hokage paperwork to run this fictional clinic. Expect a no-nonsense consultation, legendary healing energy and zero patience for patients who say they Googled it. Please do not challenge her to an arm-wrestling match while you wait.",
    },
    {
        "name": "Tony Tony Chopper",
        "qualification": "One Piece · Straw Hat doctor, definitely not a pet",
        "biography": "The Straw Hat Pirates' doctor accepts patients of all ages, species and bounty levels. Tell Chopper he is a great doctor and he will insist that compliments do not make him happy while visibly dancing. Cotton candy is his favorite thank-you gift. The pirate ship may move; your booking stays right here.",
    },
    {
        "name": "John Zoidberg",
        "qualification": "Futurama · Decapodian doctor with excellent claws",
        "biography": "Why not Zoidberg? Planet Express's resident doctor is delighted that someone voluntarily booked an appointment. His bedside manner is enthusiastic, his claws are enormous, and his understanding of humans is a work in progress. Please specify your species before he asks whether your shell is molting.",
    },
]


def refresh_demo_cast():
    """Upgrade only the six original demo identities, without reseeding any data.

    Matching both stable IDs and legacy names keeps new/admin-edited profiles
    untouched. Once renamed, a profile no longer matches, so subsequent starts
    preserve edits to the character's biography, fee and availability as well.
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
        "# Local demonstration accounts\n\nGenerated for this installation. Fictional data only. Never publish these passwords.\n\n| Role | Email | Password |\n|---|---|---|\n"
        + "\n".join(accounts)
        + "\n"
    )
    credential_path.chmod(0o600)
    demo_slots()
