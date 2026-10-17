from datetime import datetime, timedelta
from fastapi import HTTPException
from . import database as db

SELECT = """SELECT a.*, du.full_name AS doctor_name,d.specialization,d.consultation_fee,pu.full_name AS patient_name,pu.email AS patient_email,pu.phone AS patient_phone,p.profile_details,pay.amount,pay.payment_status,pay.transaction_reference FROM appointments a JOIN doctors d ON d.doctor_id=a.doctor_id JOIN users du ON du.user_id=d.user_id JOIN patients p ON p.patient_id=a.patient_id JOIN users pu ON pu.user_id=p.user_id JOIN payments pay ON pay.appointment_id=a.appointment_id"""


def instant(day, time):
    return datetime.fromisoformat(f"{day}T{time}").replace(tzinfo=db.TZ)


def listing(user):
    if user["role"] == "patient":
        return db.rows(
            SELECT
            + " WHERE p.user_id=? ORDER BY a.appointment_date DESC,a.appointment_time",
            (user["user_id"],),
        )
    if user["role"] == "doctor":
        return db.rows(
            SELECT
            + " WHERE d.user_id=? ORDER BY a.appointment_date DESC,a.appointment_time",
            (user["user_id"],),
        )
    return db.rows(SELECT + " ORDER BY a.appointment_date DESC,a.appointment_time")


def access(c, aid, user):
    a = c.execute(
        "SELECT a.*,p.user_id AS patient_user,d.user_id AS doctor_user FROM appointments a JOIN patients p USING(patient_id) JOIN doctors d USING(doctor_id) WHERE appointment_id=?",
        (aid,),
    ).fetchone()
    if (
        not a
        or (user["role"] == "patient" and a["patient_user"] != user["user_id"])
        or (user["role"] == "doctor" and a["doctor_user"] != user["user_id"])
    ):
        raise HTTPException(404, "Appointment not found.")
    return a


def available(c, sid):
    s = c.execute(
        "SELECT s.*,d.consultation_fee,d.user_id AS doctor_user FROM availability s JOIN doctors d USING(doctor_id) JOIN users u ON u.user_id=d.user_id WHERE s.slot_id=? AND u.active=1",
        (sid,),
    ).fetchone()
    if not s:
        raise HTTPException(404, "Slot not found.")
    if s["status"] != "available":
        raise HTTPException(
            409, "This slot is no longer available. Please choose another."
        )
    if instant(s["appointment_date"], s["start_time"]) <= db.now():
        raise HTTPException(422, "Choose a future appointment.")
    return s


def book(user, body):
    with db.transaction() as c:
        slot = available(c, body.slot_id)
        if body.payment_result == "failure":
            raise HTTPException(
                402,
                "Simulated payment declined. No appointment was booked. Please retry.",
            )
        patient = c.execute(
            "SELECT patient_id FROM patients WHERE user_id=?", (user["user_id"],)
        ).fetchone()
        aid = db.uid("APT")
        c.execute(
            "INSERT INTO appointments VALUES(?,?,?,?,?,?,?,?)",
            (
                aid,
                patient[0],
                slot["doctor_id"],
                body.slot_id,
                slot["appointment_date"],
                slot["start_time"],
                "confirmed",
                db.stamp(),
            ),
        )
        c.execute(
            "UPDATE availability SET status='booked' WHERE slot_id=?", (body.slot_id,)
        )
        c.execute(
            "INSERT INTO payments VALUES(?,?,?,?,?,?)",
            (
                db.uid("P"),
                aid,
                slot["consultation_fee"],
                "simulation",
                "simulated_paid",
                db.uid("SIM"),
            ),
        )
        for target in [user["user_id"], slot["doctor_user"]]:
            db.notify(
                c,
                target,
                aid,
                f'Appointment confirmed for {slot["appointment_date"]} at {slot["start_time"]} IST. Payment is simulated.',
            )
    return db.one(SELECT + " WHERE a.appointment_id=?", (aid,))


def change(user, aid, action, sid=None):
    with db.transaction() as c:
        a = access(c, aid, user)
        if a["booking_status"] != "confirmed":
            raise HTTPException(409, "Only confirmed appointments can be changed.")
        when = instant(a["appointment_date"], a["appointment_time"])
        if action == "complete":
            if user["role"] not in ("doctor", "admin"):
                raise HTTPException(403, "Only your doctor can complete consultations.")
            if when > db.now():
                raise HTTPException(422, "Consultation has not started yet.")
            c.execute(
                "UPDATE appointments SET booking_status='completed' WHERE appointment_id=?",
                (aid,),
            )
        else:
            if user["role"] not in ("patient", "admin"):
                raise HTTPException(
                    403, "Only patients or administrators can change bookings."
                )
            if when - db.now() < timedelta(hours=2):
                raise HTTPException(
                    422, "Changes require at least 2 hours before the appointment."
                )
            if action == "cancel":
                c.execute(
                    "UPDATE appointments SET booking_status='cancelled' WHERE appointment_id=?",
                    (aid,),
                )
                c.execute(
                    "UPDATE payments SET payment_status='refunded' WHERE appointment_id=?",
                    (aid,),
                )
            else:
                s = available(c, sid)
                if s["doctor_id"] != a["doctor_id"]:
                    raise HTTPException(422, "Reschedule with the same doctor.")
                c.execute(
                    "UPDATE appointments SET slot_id=?,appointment_date=?,appointment_time=? WHERE appointment_id=?",
                    (sid, s["appointment_date"], s["start_time"], aid),
                )
                c.execute(
                    "UPDATE availability SET status='booked' WHERE slot_id=?", (sid,)
                )
            c.execute(
                "UPDATE availability SET status='available' WHERE slot_id=?",
                (a["slot_id"],),
            )
        for target in [a["patient_user"], a["doctor_user"]]:
            db.notify(
                c,
                target,
                aid,
                f"Appointment {aid} was "
                + {
                    "cancel": "cancelled; simulated payment refunded.",
                    "complete": "completed.",
                    "reschedule": "rescheduled. See your updated booking details.",
                }[action],
            )
    return db.one(SELECT + " WHERE a.appointment_id=?", (aid,))
