import os
import sqlite3
import time
import threading
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from datetime import timedelta
from fastapi import FastAPI, Depends, HTTPException, Request, Response, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from . import database as db, schemas as s, security as auth, appointments as ap, excel
from .seed import seed
from . import clinical


@asynccontextmanager
async def lifespan(app):
    db.initialize()
    auth.secret()
    seed()
    excel.export_workbook()
    yield


app = FastAPI(title="Aurelia Care", version="1.0.0", lifespan=lifespan)
app_port = os.getenv("PORT", "8000")
origins = [
    x.strip()
    for x in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,"
        f"http://localhost:{app_port},http://127.0.0.1:{app_port}",
    ).split(",")
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)
attempts = defaultdict(deque)
rate_lock = threading.Lock()


@app.middleware("http")
async def safeguards(request, call_next):
    origin = request.headers.get("origin")
    if (
        request.method in ("POST", "PATCH", "DELETE", "PUT")
        and origin
        and origin not in origins
    ):
        return JSONResponse({"detail": "This origin is not allowed."}, status_code=403)
    if request.method == "POST" and request.url.path in (
        "/api/auth/login",
        "/api/auth/register",
    ):
        key = (request.client.host, request.url.path)
        with rate_lock:
            current = time.monotonic()
            for oldkey in list(attempts):
                while attempts[oldkey] and attempts[oldkey][0] < current - 60:
                    attempts[oldkey].popleft()
                if not attempts[oldkey]:
                    del attempts[oldkey]
            if len(attempts[key]) >= 20:
                return JSONResponse(
                    {"detail": "Too many attempts. Please wait one minute."},
                    status_code=429,
                )
            attempts[key].append(current)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "same-origin"
    if request.url.path.startswith("/api"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(sqlite3.IntegrityError)
async def integrity(request, exc):
    return JSONResponse(
        {"detail": "That record conflicts with existing data. Refresh and try again."},
        status_code=409,
    )


patient = auth.roles("patient")
doctor = auth.roles("doctor")
admin = auth.roles("admin")


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "database": db.one("SELECT 1 AS value")["value"],
        "timezone": "Asia/Kolkata",
        "local_time": db.stamp(),
        "payments": "simulation",
    }


@app.post("/api/auth/register", status_code=201)
def register(body: s.Register, response: Response):
    user_id = db.uid("U")
    with db.transaction() as c:
        c.execute(
            "INSERT INTO users VALUES(?,?,?,?,?,?,?,1)",
            (
                user_id,
                body.full_name,
                str(body.email).lower(),
                body.phone,
                "patient",
                db.stamp(),
                auth.hash_password(body.password),
            ),
        )
        c.execute("INSERT INTO patients VALUES(?,?,?)", (db.uid("PAT"), user_id, ""))
    auth.login_session(response, user_id)
    return auth.public(db.one("SELECT * FROM users WHERE user_id=?", (user_id,)))


@app.post("/api/auth/login")
def login(body: s.Login, response: Response):
    user = db.one("SELECT * FROM users WHERE email=?", (str(body.email).lower(),))
    valid = auth.verify(body.password, user["password_hash"] if user else auth.DUMMY)
    if not valid or not user or not user["active"]:
        raise HTTPException(
            401, "Email or password is incorrect, or the account is inactive."
        )
    auth.login_session(response, user["user_id"])
    return auth.public(user)


@app.get("/api/auth/me")
def me(user=Depends(auth.current)):
    profile = db.one(
        "SELECT profile_details FROM patients WHERE user_id=?", (user["user_id"],)
    )
    return {**user, **(profile or {})}


@app.post("/api/auth/logout")
def logout(request: Request, response: Response, user=Depends(auth.current)):
    with db.transaction() as c:
        c.execute("DELETE FROM sessions WHERE jti=?", (request.state.jti,))
    response.delete_cookie(auth.COOKIE)
    return {"message": "Signed out."}


@app.patch("/api/auth/profile")
def profile(body: s.Profile, user=Depends(auth.current)):
    with db.transaction() as c:
        c.execute(
            "UPDATE users SET full_name=?,phone=? WHERE user_id=?",
            (body.full_name, body.phone, user["user_id"]),
        )
        if user["role"] == "patient":
            c.execute(
                "UPDATE patients SET profile_details=? WHERE user_id=?",
                (body.profile_details, user["user_id"]),
            )
    return me(
        auth.public(db.one("SELECT * FROM users WHERE user_id=?", (user["user_id"],)))
    )


DOCTORS = "SELECT d.*,u.full_name,u.email,u.phone,u.active FROM doctors d JOIN users u USING(user_id)"


@app.get("/api/specializations")
def specializations():
    return [
        r["name"] for r in db.rows("SELECT name FROM specializations ORDER BY name")
    ]


@app.get("/api/doctors")
def doctors(q: str = "", specialization: str = "", date: str = "", sort: str = "name"):
    result = db.rows(
        DOCTORS
        + " WHERE u.active=1 AND u.full_name LIKE ? AND (?='' OR d.specialization=?)",
        ("%" + q[:100] + "%", specialization, specialization),
    )
    for d in result:
        slots = availability(d["doctor_id"])
        if date:
            slots = [x for x in slots if x["appointment_date"] == date]
        d["next_available"] = slots[0] if slots else None
    if date:
        result = [d for d in result if d["next_available"]]
    key = {
        "name": "full_name",
        "fee": "consultation_fee",
        "experience": "experience_years",
    }.get(sort, "full_name")
    return sorted(result, key=lambda x: x[key], reverse=sort == "experience")


@app.get("/api/doctors/{id}")
def doctor_detail(id: str):
    result = db.one(DOCTORS + " WHERE doctor_id=? AND active=1", (id,))
    if not result:
        raise HTTPException(404, "Doctor not found.")
    return result


@app.get("/api/doctors/{id}/availability")
def availability(id: str):
    return [
        r
        for r in db.rows(
            "SELECT s.* FROM availability s JOIN doctors d USING(doctor_id) JOIN users u USING(user_id) WHERE doctor_id=? AND u.active=1 AND status='available' AND NOT EXISTS (SELECT 1 FROM doctor_time_off t WHERE t.doctor_id=s.doctor_id AND t.starts_at<s.appointment_date||'T'||s.end_time AND t.ends_at>s.appointment_date||'T'||s.start_time) ORDER BY appointment_date,start_time",
            (id,),
        )
        if ap.instant(r["appointment_date"], r["start_time"]) > db.now()
    ]


@app.post("/api/appointments", status_code=201)
def book(body: s.Booking, user=Depends(patient)):
    return ap.book(user, body)


@app.get("/api/appointments")
def appointments(user=Depends(auth.current)):
    return ap.listing(user)


@app.get("/api/appointments/{id}")
def appointment(id: str, user=Depends(auth.current)):
    with db.transaction() as c:
        ap.access(c, id, user)
    return db.one(ap.SELECT + " WHERE a.appointment_id=?", (id,))


@app.patch("/api/appointments/{id}/cancel")
def cancel(id: str, user=Depends(auth.current)):
    return ap.change(user, id, "cancel")


@app.patch("/api/appointments/{id}/reschedule")
def reschedule(id: str, body: s.Reschedule, user=Depends(auth.current)):
    return ap.change(user, id, "reschedule", body.slot_id)


@app.patch("/api/appointments/{id}/complete")
def complete(id: str, user=Depends(auth.current)):
    return ap.change(user, id, "complete")


def doctor_for(user):
    return db.one("SELECT * FROM doctors WHERE user_id=?", (user["user_id"],))


@app.get("/api/doctor/appointments")
def doctor_appointments(user=Depends(doctor)):
    return ap.listing(user)


@app.get("/api/doctor/profile")
def own_doctor(user=Depends(doctor)):
    return db.one(DOCTORS + " WHERE user_id=?", (user["user_id"],))


def update_doctor(id, body):
    with db.transaction() as c:
        d = c.execute("SELECT user_id FROM doctors WHERE doctor_id=?", (id,)).fetchone()
        if not d:
            raise HTTPException(404, "Doctor not found.")
        c.execute(
            "UPDATE users SET full_name=?,phone=? WHERE user_id=?",
            (body.full_name, body.phone, d[0]),
        )
        c.execute(
            "UPDATE doctors SET specialization=?,qualification=?,experience_years=?,consultation_fee=?,biography=? WHERE doctor_id=?",
            (
                body.specialization,
                body.qualification,
                body.experience_years,
                body.consultation_fee,
                body.biography,
                id,
            ),
        )
    return db.one(DOCTORS + " WHERE doctor_id=?", (id,))


@app.patch("/api/doctor/profile")
def own_doctor_update(body: s.Doctor, user=Depends(doctor)):
    return update_doctor(doctor_for(user)["doctor_id"], body)


@app.get("/api/doctor/availability")
def own_availability(user=Depends(doctor)):
    with db.transaction() as c:
        rows = [
            dict(row)
            for row in c.execute(
                "SELECT * FROM availability WHERE doctor_id=? AND appointment_date>=? ORDER BY appointment_date,start_time",
                (doctor_for(user)["doctor_id"], db.now().date().isoformat()),
            ).fetchall()
        ]
        for row in rows:
            row["time_off"] = ap.on_time_off(c, row)
    return rows


@app.post("/api/doctor/availability", status_code=201)
def add_slot(body: s.Slot, user=Depends(doctor)):
    did = doctor_for(user)["doctor_id"]
    day, start, end = (
        body.appointment_date.isoformat(),
        body.start_time.isoformat(timespec="minutes"),
        body.end_time.isoformat(timespec="minutes"),
    )
    if start >= end or ap.instant(day, start) <= db.now():
        raise HTTPException(
            422, "Choose a future slot with an end time after its start."
        )
    with db.transaction() as c:
        if ap.on_time_off(
            c,
            {
                "doctor_id": did,
                "appointment_date": day,
                "start_time": start,
                "end_time": end,
            },
        ):
            raise HTTPException(
                409, "This time is covered by leave or an unavailable period."
            )
        existing = c.execute(
            "SELECT * FROM availability WHERE doctor_id=? AND appointment_date=? AND start_time<? AND end_time>?",
            (did, day, end, start),
        ).fetchall()
        if existing:
            if (
                len(existing) == 1
                and existing[0]["status"] == "blocked"
                and existing[0]["start_time"] == start
                and existing[0]["end_time"] == end
            ):
                sid = existing[0]["slot_id"]
                c.execute(
                    "UPDATE availability SET status='available' WHERE slot_id=?", (sid,)
                )
            else:
                raise HTTPException(409, "That time overlaps an existing slot.")
        else:
            sid = db.uid("S")
            c.execute(
                "INSERT INTO availability VALUES(?,?,?,?,?,?)",
                (sid, did, day, start, end, "available"),
            )
    return db.one("SELECT * FROM availability WHERE slot_id=?", (sid,))


@app.delete("/api/doctor/availability/{id}")
def remove_slot(id: str, user=Depends(doctor)):
    with db.transaction() as c:
        slot = c.execute(
            "SELECT * FROM availability WHERE slot_id=? AND doctor_id=?",
            (id, doctor_for(user)["doctor_id"]),
        ).fetchone()
        if not slot:
            raise HTTPException(404, "Slot not found.")
        if slot["status"] == "booked":
            raise HTTPException(409, "A booked slot cannot be removed.")
        c.execute("UPDATE availability SET status='blocked' WHERE slot_id=?", (id,))
    return {"message": "Slot removed from public availability."}


@app.get("/api/patient/medical-history")
def medical_history(user=Depends(patient)):
    return clinical.history_for_user(user)


@app.patch("/api/patient/medical-history")
def save_medical_history(body: s.MedicalHistory, user=Depends(patient)):
    return clinical.save_history(user, body)


@app.get("/api/doctor/patients")
def doctor_patients(user=Depends(doctor)):
    return clinical.patients(user)


@app.get("/api/doctor/patients/{id}")
def doctor_patient(id: str, user=Depends(doctor)):
    return clinical.patient_detail(user, id)


@app.get("/api/doctor/time-off")
def time_off(user=Depends(doctor)):
    return clinical.time_off(user)


@app.post("/api/doctor/time-off", status_code=201)
def add_time_off(body: s.TimeOff, user=Depends(doctor)):
    return clinical.add_time_off(user, body)


@app.delete("/api/doctor/time-off/{id}")
def remove_time_off(id: str, user=Depends(doctor)):
    return clinical.remove_time_off(user, id)


@app.get("/api/doctor/export/{kind}")
def doctor_export(kind: str, user=Depends(doctor)):
    if kind not in ("patients", "appointments", "workspace"):
        raise HTTPException(404, "Export not found.")
    return Response(
        clinical.export(user, kind),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="My_{kind.title()}_Doctor.xlsx"'
        },
    )


@app.patch("/api/notifications/read-all")
def read_all_notices(user=Depends(auth.current)):
    with db.transaction() as c:
        c.execute(
            "UPDATE notifications SET notification_status='read' WHERE user_id=?",
            (user["user_id"],),
        )
    return {"message": "All notifications marked as read."}


@app.get("/api/notifications")
def notifications(user=Depends(auth.current)):
    if user["role"] in ("patient", "doctor"):
        with db.transaction() as c:
            for a in ap.listing(user):
                if a["booking_status"] == "confirmed" and db.now() < ap.instant(
                    a["appointment_date"], a["appointment_time"]
                ) <= db.now() + timedelta(hours=24):
                    message = f'Reminder: your appointment is on {a["appointment_date"]} at {a["appointment_time"]} IST.'
                    if not c.execute(
                        "SELECT 1 FROM notifications WHERE user_id=? AND appointment_id=? AND message=?",
                        (user["user_id"], a["appointment_id"], message),
                    ).fetchone():
                        db.notify(c, user["user_id"], a["appointment_id"], message)
    return db.rows(
        "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC",
        (user["user_id"],),
    )


@app.patch("/api/notifications/{id}/read")
def read_notice(id: str, user=Depends(auth.current)):
    with db.transaction() as c:
        if not c.execute(
            "UPDATE notifications SET notification_status='read' WHERE notification_id=? AND user_id=?",
            (id, user["user_id"]),
        ).rowcount:
            raise HTTPException(404, "Notification not found.")
    return {"message": "Marked as read."}


@app.get("/api/admin/dashboard")
def stats(user=Depends(admin)):
    counts = {
        k: db.one(f"SELECT count(*) AS n FROM {k}")["n"]
        for k in ("doctors", "patients", "appointments")
    }
    records = ap.listing(user)
    counts.update(
        {
            status: sum(a["booking_status"] == status for a in records)
            for status in ("confirmed", "completed", "cancelled")
        }
    )
    counts["upcoming"] = sum(
        a["booking_status"] == "confirmed"
        and ap.instant(a["appointment_date"], a["appointment_time"]) > db.now()
        for a in records
    )
    return {
        "counts": counts,
        "by_doctor": db.rows(
            "SELECT u.full_name,count(a.appointment_id) AS count FROM doctors d JOIN users u USING(user_id) LEFT JOIN appointments a USING(doctor_id) GROUP BY d.doctor_id ORDER BY count DESC"
        ),
        "trends": db.rows(
            "SELECT substr(created_at,1,10) AS date,count(*) AS count FROM appointments GROUP BY substr(created_at,1,10) ORDER BY date"
        ),
    }


@app.get("/api/admin/users")
def users(user=Depends(admin)):
    return [
        auth.public(r) for r in db.rows("SELECT * FROM users ORDER BY created_at DESC")
    ]


@app.patch("/api/admin/users/{id}/active")
def activate(id: str, body: s.Active, user=Depends(admin)):
    with db.transaction() as c:
        target = c.execute("SELECT role FROM users WHERE user_id=?", (id,)).fetchone()
        if not target:
            raise HTTPException(404, "Account not found.")
        if target[0] == "admin":
            raise HTTPException(
                422, "Administrator accounts cannot be deactivated here."
            )
        c.execute("UPDATE users SET active=? WHERE user_id=?", (body.active, id))
        c.execute("DELETE FROM sessions WHERE user_id=?", (id,))
    return {"message": "Account updated."}


@app.patch("/api/admin/users/{id}/password")
def reset_password(id: str, body: s.Password, user=Depends(admin)):
    with db.transaction() as c:
        if not c.execute(
            "UPDATE users SET password_hash=?,active=1 WHERE user_id=? AND role!='admin'",
            (auth.hash_password(body.password), id),
        ).rowcount:
            raise HTTPException(404, "Non-administrator account not found.")
        c.execute("DELETE FROM sessions WHERE user_id=?", (id,))
    return {"message": "Password reset and account activated."}


@app.get("/api/admin/appointments")
def admin_appointments(user=Depends(admin)):
    return ap.listing(user)


@app.get("/api/admin/doctors")
def admin_doctors(user=Depends(admin)):
    return db.rows(DOCTORS + " ORDER BY full_name")


@app.post("/api/admin/doctors", status_code=201)
def create_doctor(body: s.NewDoctor, user=Depends(admin)):
    user_id, did = db.uid("U"), db.uid("D")
    with db.transaction() as c:
        c.execute(
            "INSERT INTO users VALUES(?,?,?,?,?,?,?,1)",
            (
                user_id,
                body.full_name,
                str(body.email).lower(),
                body.phone,
                "doctor",
                db.stamp(),
                auth.hash_password(body.password),
            ),
        )
        c.execute(
            "INSERT INTO doctors VALUES(?,?,?,?,?,?,?,?)",
            (
                did,
                user_id,
                body.specialization,
                body.qualification,
                body.experience_years,
                body.consultation_fee,
                body.biography,
                0,
            ),
        )
    return db.one(DOCTORS + " WHERE doctor_id=?", (did,))


@app.patch("/api/admin/doctors/{id}")
def edit_doctor(id: str, body: s.Doctor, user=Depends(admin)):
    return update_doctor(id, body)


@app.post("/api/admin/specializations", status_code=201)
def add_specialization(body: s.Specialization, user=Depends(admin)):
    with db.transaction() as c:
        c.execute("INSERT INTO specializations VALUES(?)", (body.name,))
    return {"name": body.name}


@app.delete("/api/admin/specializations/{name}")
def delete_specialization(name: str, user=Depends(admin)):
    with db.transaction() as c:
        c.execute("DELETE FROM specializations WHERE name=?", (name,))
    return {"message": "Specialization removed."}


@app.get("/api/admin/excel/export")
def export(user=Depends(admin)):
    return Response(
        excel.export_workbook(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="Doctor_Appointment_Database.xlsx"'
        },
    )


async def workbook(file, dry):
    data = await file.read(5 * 1024 * 1024 + 1)
    return excel.import_workbook(data, file.filename, dry)


@app.post("/api/admin/excel/validate")
async def validate(file: UploadFile = File(...), user=Depends(admin)):
    return await workbook(file, True)


@app.post("/api/admin/excel/import")
async def import_excel(file: UploadFile = File(...), user=Depends(admin)):
    return await workbook(file, False)


DIST = db.ROOT / "frontend/dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")
    app.mount("/images", StaticFiles(directory=DIST / "images"), name="images")

    @app.get("/{path:path}")
    def frontend(path: str):
        if path.startswith(("api/", "docs/")):
            raise HTTPException(404, "Not found.")
        return FileResponse(DIST / "index.html")
