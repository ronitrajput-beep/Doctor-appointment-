import { FormEvent, ReactNode, useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Stethoscope,
  FileSpreadsheet,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Plus,
  ArrowUpRight,
  Download,
  Upload,
  Check,
  Clock,
} from "lucide-react";
import { api, day, money, today, future } from "./api";
import {
  User,
  Doctor,
  Appointment,
  Slot,
  Notice,
  Stats,
  WorkbookResult,
} from "./types";
import { useAuth } from "./context";
import { useData } from "./hooks";
import {
  DoctorOverview,
  DoctorPatients,
  DoctorDownloads,
  DoctorTimeOff,
  DownloadButton,
  MedicalHistoryForm,
} from "./clinical";
import { ErrorBox, Loading, Empty, Modal } from "./components";

function Title({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="dashboard-title">
      <div>
        <div className="eyebrow">YOUR CARE, CONNECTED</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
function Guard({
  role,
  children,
}: {
  role: "doctor" | "admin" | "patient";
  children: ReactNode;
}) {
  const { user } = useAuth();
  return user?.role === role ? (
    <>{children}</>
  ) : (
    <Navigate to="/dashboard" replace />
  );
}
export function Dashboard() {
  const { user, loading, logout } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState("");
  const notices = useData<Notice[]>("/notifications", user ? 15000 : 0);
  const unread =
    notices.data?.filter((n) => n.notification_status === "unread").length || 0;
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  const links = [
    ["", "Overview", LayoutDashboard],
    ["appointments", "Appointments", CalendarDays],
    ...(user.role === "doctor"
      ? [
          ["patients", "My patients", Users],
          ["availability", "Availability", Clock],
          ["downloads", "Excel downloads", FileSpreadsheet],
        ]
      : []),
    ...(user.role === "admin"
      ? [
          ["doctors", "Doctors", Stethoscope],
          ["accounts", "Accounts", Users],
          ["excel", "Excel database", FileSpreadsheet],
          ["reports", "Reports", BarChart3],
        ]
      : []),
    ...(user.role === "patient"
      ? [["medical-history", "Medical history", Stethoscope]]
      : []),
    ["notifications", "Notifications", Bell],
    ["profile", "My profile", Settings],
  ] as [string, string, typeof LayoutDashboard][];
  return (
    <div
      className={
        "dashboard-shell " + (user.role === "doctor" ? "doctor-workspace" : "")
      }
    >
      <aside className="sidebar">
        <div className="account-card">
          <div className="avatar">
            {user.full_name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <strong>
            {user.role === "doctor" ? "Dr. " : ""}
            {user.full_name}
          </strong>
          <span>
            {user.role === "doctor"
              ? "Your private practice desk"
              : user.role + " account"}
          </span>
        </div>
        <nav aria-label="Dashboard">
          {links.map(([path, title, Icon]) => (
            <NavLink
              end
              to={"/dashboard" + (path ? "/" + path : "")}
              key={path}
            >
              <Icon size={18} />
              {title}
              {path === "notifications" && unread > 0 && (
                <span
                  className="unread-count"
                  aria-label={`${unread} unread notifications`}
                >
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <button
          className="sidebar-logout"
          onClick={async () => {
            try {
              await logout();
              nav("/login", { replace: true });
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <LogOut size={18} /> Sign out
        </button>
        <ErrorBox message={error} />
        <div className="sidebar-note">
          <HeartNote />
          {user.role === "doctor"
            ? "Your schedule. Your patients. Thoughtful care."
            : "A little time for your health goes a long way."}
        </div>
      </aside>
      <div className="dashboard-content">
        <Routes>
          <Route
            index
            element={user.role === "doctor" ? <DoctorOverview /> : <Overview />}
          />
          <Route
            path="patients"
            element={
              <Guard role="doctor">
                <DoctorPatients />
              </Guard>
            }
          />
          <Route
            path="downloads"
            element={
              <Guard role="doctor">
                <DoctorDownloads />
              </Guard>
            }
          />
          <Route
            path="medical-history"
            element={
              <Guard role="patient">
                <MedicalHistoryForm />
              </Guard>
            }
          />
          <Route path="appointments" element={<Appointments />} />
          <Route
            path="availability"
            element={
              <Guard role="doctor">
                <Availability />
              </Guard>
            }
          />
          <Route
            path="doctors"
            element={
              <Guard role="admin">
                <DoctorManagement />
              </Guard>
            }
          />
          <Route
            path="accounts"
            element={
              <Guard role="admin">
                <Accounts />
              </Guard>
            }
          />
          <Route
            path="excel"
            element={
              <Guard role="admin">
                <Excel />
              </Guard>
            }
          />
          <Route
            path="reports"
            element={
              <Guard role="admin">
                <Reports />
              </Guard>
            }
          />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}
function HeartNote() {
  return <span className="note-symbol">✧</span>;
}
function Overview() {
  const { user } = useAuth();
  const { data: appointments, error } = useData<Appointment[]>("/appointments");
  const { data: stats } = useData<Stats>(
    user?.role === "admin" ? "/admin/dashboard" : "/health",
  );
  if (!appointments)
    return (
      <>
        <ErrorBox message={error} />
        <Loading />
      </>
    );
  const upcoming = appointments
    .filter(
      (a) =>
        a.booking_status === "confirmed" &&
        future(a.appointment_date, a.appointment_time),
    )
    .sort((a, b) =>
      (a.appointment_date + a.appointment_time).localeCompare(
        b.appointment_date + b.appointment_time,
      ),
    );
  const shown =
    user?.role === "doctor"
      ? appointments.filter(
          (a) =>
            a.appointment_date === today() && a.booking_status === "confirmed",
        )
      : upcoming;
  const counts =
    user?.role === "admin" && stats?.counts
      ? stats.counts
      : {
          appointments: appointments.length,
          upcoming: upcoming.length,
          completed: appointments.filter(
            (a) => a.booking_status === "completed",
          ).length,
          cancelled: appointments.filter(
            (a) => a.booking_status === "cancelled",
          ).length,
        };
  return (
    <>
      <Title
        title={"Hello, " + user?.full_name.split(" ")[0] + "."}
        description="A little clarity for your day. Here’s your care at a glance."
      />
      <div className="dashboard-welcome">
        <div>
          <span className="eyebrow">MAKE YOUR WELLBEING A PRIORITY</span>
          <h2>
            {user?.role === "patient"
              ? "Your next step to feeling better."
              : "Thoughtful care starts with you."}
          </h2>
          <p>
            {user?.role === "patient"
              ? "Your specialist is just a few moments away."
              : "Manage your day and keep every appointment connected."}
          </p>
        </div>
        <Link
          className="button dark"
          to={user?.role === "patient" ? "/doctors" : "/dashboard/appointments"}
        >
          {user?.role === "patient" ? "Find a specialist" : "View appointments"}
          <ArrowUpRight size={16} />
        </Link>
      </div>
      {user?.role === "patient" && (
        <Link
          to="/dashboard/medical-history"
          className="patient-history-prompt"
        >
          <Stethoscope size={25} />
          <div>
            <strong>Help your doctor prepare for your visit</strong>
            <span>
              Add or update your medical history, allergies, and medications.
            </span>
          </div>
          <ArrowUpRight size={20} />
        </Link>
      )}
      <div className="stats-grid">
        {Object.entries(counts)
          .filter(([k]) => k !== "confirmed")
          .map(([k, v]) => (
            <div className="stat-card" key={k}>
              <span>{k}</span>
              <strong>{v}</strong>
              <span className="stat-icon">
                <CalendarDays size={20} />
              </span>
            </div>
          ))}
      </div>
      <div className="section-title">
        <h2>
          {user?.role === "doctor"
            ? "Today’s schedule"
            : "Upcoming appointments"}
        </h2>
        <Link className="text-link" to="/dashboard/appointments">
          View all <ArrowUpRight size={16} />
        </Link>
      </div>
      {shown.length ? (
        <div className="appointment-list">
          {shown.slice(0, 3).map((a) => (
            <AppointmentCard key={a.appointment_id} a={a} />
          ))}
        </div>
      ) : (
        <Empty>
          {user?.role === "doctor"
            ? "No consultations scheduled for today."
            : "No upcoming appointments yet."}
        </Empty>
      )}
    </>
  );
}
function AppointmentCard({
  a,
  children,
}: {
  a: Appointment;
  children?: ReactNode;
}) {
  const { user } = useAuth();
  return (
    <article className="appointment-card">
      <div className="date-tile">
        <strong>{a.appointment_date.slice(8)}</strong>
        <span>
          {new Date(a.appointment_date + "T12:00:00").toLocaleDateString(
            "en-IN",
            { month: "short" },
          )}
        </span>
      </div>
      <div className="appointment-info">
        <div className="appointment-heading">
          <h3>
            {user?.role === "patient" ? "Dr. " + a.doctor_name : a.patient_name}
          </h3>
          <span className={"badge " + a.booking_status}>
            {a.booking_status}
          </span>
        </div>
        <p>
          {user?.role === "patient"
            ? a.specialization
            : "Dr. " + a.doctor_name + " · " + a.specialization}
        </p>
        <p className="small-text">
          <CalendarDays size={14} />
          {day(a.appointment_date)} <Clock size={14} />
          {a.appointment_time} IST <span>· {money(a.amount)}</span>
        </p>
        {user?.role !== "patient" && (
          <details>
            <summary>Patient booking details</summary>
            <p>
              {a.patient_email} · {a.patient_phone}
            </p>
            <p>{a.profile_details || "No additional patient notes."}</p>
            {user?.role === "doctor" && a.booking_status !== "cancelled" && (
              <Link
                className="text-link"
                to={`/dashboard/patients?patient=${a.patient_id}`}
              >
                View medical history <ArrowUpRight size={15} />
              </Link>
            )}
          </details>
        )}
        <small className="reference">
          {a.appointment_id} · {a.payment_status.replaceAll("_", " ")}
        </small>
        {children && <div className="appointment-actions">{children}</div>}
      </div>
    </article>
  );
}
function Appointments() {
  const { user } = useAuth();
  const { data, error, reload } = useData<Appointment[]>(
    "/appointments",
    user?.role === "doctor" ? 15000 : 0,
  );
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [doc, setDoc] = useState("");
  const [target, setTarget] = useState<{
    a: Appointment;
    action: string;
  } | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [sid, setSid] = useState("");
  const [actionError, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function open(a: Appointment, action: string) {
    setError("");
    setSlots([]);
    setSid("");
    setTarget({ a, action });
    if (action === "reschedule") {
      try {
        const next = await api<Slot[]>(
          "/doctors/" + a.doctor_id + "/availability",
        );
        setSlots(next);
        setSid(next[0]?.slot_id || "");
      } catch (e) {
        setError((e as Error).message);
      }
    }
  }
  async function perform() {
    if (!target) return;
    setBusy(true);
    setError("");
    try {
      await api(
        "/appointments/" + target.a.appointment_id + "/" + target.action,
        "PATCH",
        target.action === "reschedule" ? { slot_id: sid } : undefined,
      );
      setTarget(null);
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Title
        title={
          user?.role === "doctor"
            ? "Your consultation schedule"
            : "Your appointments"
        }
        description="Every consultation, thoughtfully organized. All times are in IST."
      >
        {user?.role === "doctor" && (
          <DownloadButton kind="appointments">
            Download appointments Excel
          </DownloadButton>
        )}
      </Title>
      {user?.role === "patient" && (
        <Link to="/doctors" className="button dark">
          <Plus size={17} /> Book an appointment
        </Link>
      )}
      <div className="filter-bar compact">
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {["confirmed", "completed", "cancelled"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        {user?.role === "admin" && (
          <label>
            Doctor
            <select value={doc} onChange={(e) => setDoc(e.target.value)}>
              <option value="">All doctors</option>
              {[
                ...new Map(
                  data?.map((a) => [a.doctor_id, a.doctor_name]),
                ).entries(),
              ].map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          className="text-link"
          onClick={() => {
            setDate("");
            setStatus("");
            setDoc("");
          }}
        >
          Clear filters
        </button>
      </div>
      <ErrorBox message={error} />
      {data ? (
        <div className="appointment-list">
          {data
            .filter(
              (a) =>
                (!status || a.booking_status === status) &&
                (!date || a.appointment_date === date) &&
                (!doc || a.doctor_id === doc),
            )
            .map((a) => (
              <AppointmentCard key={a.appointment_id} a={a}>
                {a.booking_status === "confirmed" && (
                  <>
                    {user?.role !== "doctor" && (
                      <>
                        <button
                          className="button small outline"
                          onClick={() => open(a, "reschedule")}
                        >
                          Reschedule
                        </button>
                        <button
                          className="button small danger-outline"
                          onClick={() => open(a, "cancel")}
                        >
                          Cancel appointment
                        </button>
                      </>
                    )}
                    {user?.role !== "patient" && (
                      <button
                        className="button small outline"
                        onClick={() => open(a, "complete")}
                      >
                        Mark completed
                      </button>
                    )}
                  </>
                )}
              </AppointmentCard>
            ))}
          {!data.some(
            (a) =>
              (!status || a.booking_status === status) &&
              (!date || a.appointment_date === date) &&
              (!doc || a.doctor_id === doc),
          ) && <Empty>No appointments match your filters.</Empty>}
        </div>
      ) : (
        !error && <Loading />
      )}
      {target && (
        <Modal
          title={
            target.action === "reschedule"
              ? "Choose a new time"
              : target.action === "cancel"
                ? "Cancel this appointment?"
                : "Complete this consultation?"
          }
          onClose={() => {
            if (!busy) setTarget(null);
          }}
        >
          <p>
            Dr. {target.a.doctor_name} · {day(target.a.appointment_date)} ·{" "}
            {target.a.appointment_time} IST
          </p>
          {target.action === "reschedule" ? (
            <label>
              Available times
              <select value={sid} onChange={(e) => setSid(e.target.value)}>
                {slots.map((s) => (
                  <option value={s.slot_id} key={s.slot_id}>
                    {day(s.appointment_date)} · {s.start_time} IST
                  </option>
                ))}
              </select>
              {!slots.length && <small>No available replacement slots.</small>}
            </label>
          ) : (
            <p>
              {target.action === "cancel"
                ? "Your slot will become available and the simulated payment will be marked refunded."
                : "This will record the consultation as completed."}
            </p>
          )}
          <ErrorBox message={actionError} />
          <button
            className="button dark full"
            disabled={busy || (target.action === "reschedule" && !sid)}
            onClick={perform}
          >
            {busy ? "Saving…" : "Confirm " + target.action}
          </button>
        </Modal>
      )}
    </>
  );
}
function Availability() {
  const { data, error, reload } = useData<(Slot & { time_off?: boolean })[]>(
    "/doctor/availability",
    15000,
  );
  const [scheduleStatus, setScheduleStatus] = useState("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [actionError, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(
        "/doctor/availability",
        "POST",
        Object.fromEntries(new FormData(f)),
      );
      setMessage("Your time slot is now available for booking.");
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setError("");
    try {
      await api("/doctor/availability/" + id, "DELETE");
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <Title
        title="Make room for care"
        description="Publish available consultations and manage your schedule."
      />
      <form className="panel" onSubmit={add}>
        <h2>Add an appointment slot</h2>
        <div className="form-grid">
          <label>
            Date
            <input type="date" name="appointment_date" min={today()} required />
          </label>
          <label>
            Start time (IST)
            <input type="time" name="start_time" required />
          </label>
          <label>
            End time (IST)
            <input type="time" name="end_time" required />
          </label>
        </div>
        <button className="button dark" disabled={busy}>
          <Plus size={17} /> Publish slot
        </button>
        <ErrorBox message={actionError} />
        {message && (
          <p role="status" className="success-text">
            {message}
          </p>
        )}
      </form>
      <DoctorTimeOff onChanged={reload} />
      <div className="section-title schedule-heading">
        <h2>Your schedule</h2>
        <label>
          Slot status
          <select
            value={scheduleStatus}
            onChange={(e) => setScheduleStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="available">Available</option>
            <option value="booked">Booked</option>
            <option value="blocked">Blocked</option>
          </select>
        </label>
        <label>
          Filter date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <ErrorBox message={error} />
      {data ? (
        <div className="schedule-grid">
          {data
            .filter(
              (s) =>
                (!date || s.appointment_date === date) &&
                (!scheduleStatus || s.status === scheduleStatus),
            )
            .map((s) => (
              <div className="schedule-card" key={s.slot_id}>
                <span>{day(s.appointment_date)}</span>
                <strong>
                  {s.start_time} – {s.end_time} IST
                </strong>
                <span className={"badge " + s.status}>
                  {s.time_off && s.status === "available"
                    ? "Unavailable period"
                    : s.status}
                </span>
                {s.status === "blocked" && (
                  <button
                    className="text-link"
                    onClick={async () => {
                      setError("");
                      try {
                        await api("/doctor/availability", "POST", {
                          appointment_date: s.appointment_date,
                          start_time: s.start_time,
                          end_time: s.end_time,
                        });
                        reload();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Reopen slot
                  </button>
                )}
                {s.status === "available" && (
                  <button
                    className="text-link danger-text"
                    onClick={() => remove(s.slot_id)}
                  >
                    Remove slot
                  </button>
                )}
              </div>
            ))}
          {!data.some(
            (s) =>
              (!date || s.appointment_date === date) &&
              (!scheduleStatus || s.status === scheduleStatus),
          ) && <Empty>No published slots for this date.</Empty>}
        </div>
      ) : (
        <Loading />
      )}
    </>
  );
}

const doctorFields = [
  ["full_name", "Full name", "text"],
  ["phone", "Phone number", "tel"],
  ["qualification", "Qualifications", "text"],
  ["experience_years", "Years of experience", "number"],
  ["consultation_fee", "Consultation fee (₹)", "number"],
] as const;
function DoctorForm({
  value,
  onSaved,
  onCancel,
  own = false,
}: {
  value?: Doctor;
  onSaved: () => void;
  onCancel?: () => void;
  own?: boolean;
}) {
  const { data: specs, error: specError } =
    useData<string[]>("/specializations");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      await api(
        own
          ? "/doctor/profile"
          : value
            ? "/admin/doctors/" + value.doctor_id
            : "/admin/doctors",
        value ? "PATCH" : "POST",
        {
          ...data,
          experience_years: Number(data.experience_years),
          consultation_fee: Number(data.consultation_fee),
        },
      );
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        {doctorFields.map(([name, title, type]) => (
          <label key={name}>
            {title}
            <input
              name={name}
              type={type}
              min={0}
              max={
                name === "experience_years"
                  ? 70
                  : name === "consultation_fee"
                    ? 100000
                    : undefined
              }
              defaultValue={value?.[name] ?? ""}
              required
            />
          </label>
        ))}
        <label>
          Specialization
          <select
            name="specialization"
            defaultValue={value?.specialization || ""}
            required
          >
            <option value="" disabled>
              Choose specialty
            </option>
            {specs?.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        {!value && (
          <>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Initial password
              <input
                name="password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </label>
          </>
        )}
      </div>
      <label>
        Biography
        <textarea
          name="biography"
          minLength={10}
          maxLength={3000}
          rows={4}
          defaultValue={value?.biography || ""}
          required
        />
      </label>
      <ErrorBox message={error || specError} />
      <div className="button-row">
        <button className="button dark" disabled={busy}>
          {busy ? "Saving…" : "Save doctor"}
        </button>
        {onCancel && (
          <button type="button" className="button outline" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
function DoctorManagement() {
  const { data, error, reload } = useData<Doctor[]>("/admin/doctors");
  const { data: specs, reload: reloadSpecs } =
    useData<string[]>("/specializations");
  const [editing, setEditing] = useState<Doctor | null | undefined>(undefined);
  const [actionError, setError] = useState("");
  async function active(d: Doctor) {
    try {
      await api("/admin/users/" + d.user_id + "/active", "PATCH", {
        active: !d.active,
      });
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function spec(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget;
    setError("");
    try {
      await api("/admin/specializations", "POST", {
        name: new FormData(f).get("name"),
      });
      f.reset();
      reloadSpecs();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <Title
        title="Your care team"
        description="Manage clinicians, specialties, and account access."
      >
        <button className="button dark" onClick={() => setEditing(null)}>
          <Plus size={17} /> Add doctor
        </button>
      </Title>
      <ErrorBox message={error || actionError} />
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Doctor</th>
              <th>Specialization</th>
              <th>Fee</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((d) => (
              <tr key={d.doctor_id}>
                <td>
                  <strong>Dr. {d.full_name}</strong>
                  <small>{d.email}</small>
                </td>
                <td>{d.specialization}</td>
                <td>{money(d.consultation_fee)}</td>
                <td>
                  <span className="badge">
                    {d.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="button-row">
                    <button className="text-link" onClick={() => setEditing(d)}>
                      Edit
                    </button>
                    <button className="text-link" onClick={() => active(d)}>
                      {d.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data && !error && <Loading />}
      </div>
      <section className="panel">
        <h2>Specializations</h2>
        <form onSubmit={spec} className="inline-form">
          <label>
            New specialization
            <input name="name" minLength={2} maxLength={80} required />
          </label>
          <button className="button dark">Add specialty</button>
        </form>
        <p className="small-text">
          Specialties assigned to doctors cannot be removed.
        </p>
        <div className="specialty-tags">
          {specs?.map((name) => (
            <span className="badge" key={name}>
              {name}
              <button
                aria-label={"Remove " + name}
                onClick={async () => {
                  setError("");
                  try {
                    await api(
                      "/admin/specializations/" + encodeURIComponent(name),
                      "DELETE",
                    );
                    reloadSpecs();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </section>
      {editing !== undefined && (
        <Modal
          title={editing ? "Edit doctor" : "Add a doctor"}
          onClose={() => setEditing(undefined)}
        >
          <DoctorForm
            value={editing || undefined}
            onSaved={() => {
              setEditing(undefined);
              reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}
function Accounts() {
  const { data, error, reload } = useData<User[]>("/admin/users");
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<User | null>(null);
  const [actionError, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function reset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!target) return;
    setBusy(true);
    setError("");
    try {
      await api("/admin/users/" + target.user_id + "/password", "PATCH", {
        password: new FormData(e.currentTarget).get("password"),
      });
      setTarget(null);
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Title
        title="People & accounts"
        description="Manage patient and clinician access. Passwords are never displayed."
      />
      <label className="search-field">
        Search accounts
        <input
          placeholder="Name, email or role"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <ErrorBox message={error || (!target ? actionError : "")} />
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data
              ?.filter((u) =>
                (u.full_name + u.email + u.role)
                  .toLowerCase()
                  .includes(q.toLowerCase()),
              )
              .map((u) => (
                <tr key={u.user_id}>
                  <td>{u.full_name}</td>
                  <td>
                    {u.email}
                    <small>{u.phone}</small>
                  </td>
                  <td>{u.role}</td>
                  <td>{u.active ? "Active" : "Inactive"}</td>
                  <td>
                    {u.role !== "admin" && (
                      <div className="button-row">
                        <button
                          className="text-link"
                          onClick={async () => {
                            setError("");
                            try {
                              await api(
                                "/admin/users/" + u.user_id + "/active",
                                "PATCH",
                                { active: !u.active },
                              );
                              reload();
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        >
                          {u.active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          className="text-link"
                          onClick={() => {
                            setError("");
                            setTarget(u);
                          }}
                        >
                          Reset password
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!data && !error && <Loading />}
      </div>
      {target && (
        <Modal
          title="Reset account password"
          onClose={() => {
            if (!busy) setTarget(null);
          }}
        >
          <p>
            {target.full_name} · {target.email}
          </p>
          <p>This activates the account and signs out existing sessions.</p>
          <form onSubmit={reset}>
            <label>
              New password
              <input
                name="password"
                type="password"
                minLength={8}
                maxLength={128}
                required
                autoComplete="new-password"
              />
            </label>
            <ErrorBox message={actionError} />
            <button className="button dark" disabled={busy}>
              Reset password
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function Excel() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<WorkbookResult | null>(null);
  const [tab, setTab] = useState("Users");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function upload(apply = false) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      setResult(
        await api<WorkbookResult>(
          "/admin/excel/" + (apply ? "import" : "validate"),
          "POST",
          form,
        ),
      );
    } catch (e) {
      setResult(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Title
        title="Your Excel database"
        description="Inspect, update, and synchronize your records with confidence."
      />
      <div className="excel-grid">
        <section className="panel">
          <div className="feature-icon">
            <Download />
          </div>
          <h2>Take your records with you</h2>
          <p>
            Download the current database as a formatted workbook with seven
            worksheets. Passwords and session tokens are excluded.
          </p>
          <a href="/api/admin/excel/export" className="button dark">
            <Download size={17} /> Download workbook
          </a>
        </section>
        <section className="panel">
          <div className="feature-icon">
            <Upload />
          </div>
          <h2>Bring your updates back</h2>
          <p>
            Edit an exported workbook, then validate it here. Changes are
            applied together only when every record passes validation.
          </p>
          <label>
            Choose workbook (.xlsx, up to 5 MB)
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setResult(null);
                setError("");
              }}
            />
          </label>
          <button
            className="button outline"
            disabled={!file || busy}
            onClick={() => upload()}
          >
            {busy ? "Checking…" : "Validate & preview"}
          </button>
        </section>
      </div>
      <div className="note">
        <strong>How synchronization works:</strong> SQLite stores live
        application data. Export creates an up-to-date Excel copy; a validated
        import merges records by ID. Missing rows are not deleted. New accounts
        stay inactive until an administrator resets their password.
      </div>
      <ErrorBox message={error} />
      {result && (
        <section className="panel">
          <div className="section-title">
            <div>
              <h2>
                {result.applied
                  ? "Import completed"
                  : "Workbook is ready to import"}
              </h2>
              <p role="status" className="success-text">
                <Check size={17} />{" "}
                {result.applied
                  ? "Changes saved to the application."
                  : "All records passed validation. No changes saved yet."}
              </p>
            </div>
            {!result.applied && (
              <button
                className="button dark"
                disabled={busy}
                onClick={() => upload(true)}
              >
                Apply import
              </button>
            )}
          </div>
          <div className="sheet-tabs">
            {Object.entries(result.counts).map(([name, count]) => (
              <button
                className={tab === name ? "active" : ""}
                key={name}
                onClick={() => setTab(name)}
              >
                {name} <span>{count}</span>
              </button>
            ))}
          </div>
          <p className="small-text">Preview: first five records in {tab}.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {Object.keys(result.preview[tab][0] || {}).map((k) => (
                    <th key={k}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.preview[tab].map((r, i) => (
                  <tr key={i}>
                    {Object.values(r).map((v, j) => (
                      <td key={j}>{String(v ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!result.preview[tab].length && (
              <Empty>No records in this worksheet.</Empty>
            )}
          </div>
        </section>
      )}
    </>
  );
}
function Reports() {
  const { data, error } = useData<Stats>("/admin/dashboard");
  return (
    <>
      <Title
        title="Care, in perspective"
        description="Appointment activity calculated from your stored records."
      />
      <ErrorBox message={error} />
      {data ? (
        <>
          <div className="stats-grid">
            {Object.entries(data.counts).map(([k, v]) => (
              <div className="stat-card" key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
          <div className="excel-grid">
            <section className="panel">
              <h2>Appointments by doctor</h2>
              {data.by_doctor.map((d) => (
                <div className="report-row" key={d.full_name}>
                  <div>
                    <span>Dr. {d.full_name}</span>
                    <strong>{d.count}</strong>
                  </div>
                  <div className="bar-track">
                    <span
                      style={{
                        width: `${(d.count / Math.max(1, ...data.by_doctor.map((x) => x.count))) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </section>
            <section className="panel">
              <h2>Booking trend</h2>
              <p className="small-text">
                Appointments created per day, including later cancellations.
              </p>
              {data.trends.map((t) => (
                <div className="report-row" key={t.date}>
                  <div>
                    <span>{day(t.date)}</span>
                    <strong>{t.count}</strong>
                  </div>
                  <div className="bar-track">
                    <span
                      style={{
                        width: `${(t.count / Math.max(1, ...data.trends.map((x) => x.count))) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {!data.trends.length && <Empty>No booking activity yet.</Empty>}
            </section>
          </div>
        </>
      ) : (
        <Loading />
      )}
    </>
  );
}
function Notifications() {
  const { data, error, reload } = useData<Notice[]>("/notifications", 15000);
  const [actionError, setError] = useState("");
  return (
    <>
      <Title
        title="You’re in the loop"
        description="Appointment confirmations, changes, and reminders in one place. Updates refresh every 15 seconds."
      >
        <button
          className="button outline"
          disabled={!data?.some((n) => n.notification_status === "unread")}
          onClick={async () => {
            try {
              await api("/notifications/read-all", "PATCH");
              reload();
              window.dispatchEvent(new Event("focus"));
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Mark all as read
        </button>
      </Title>
      <ErrorBox message={error || actionError} />
      {data ? (
        data.length ? (
          <div className="notice-list">
            {data.map((n) => (
              <article
                className={"panel notice " + n.notification_status}
                key={n.notification_id}
              >
                <Bell size={22} />
                <div>
                  <p>{n.message}</p>
                  <small>
                    {new Date(n.created_at).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}{" "}
                    IST
                  </small>
                </div>
                {n.notification_status === "unread" && (
                  <button
                    className="text-link"
                    onClick={async () => {
                      try {
                        await api(
                          "/notifications/" + n.notification_id + "/read",
                          "PATCH",
                        );
                        reload();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Mark read
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <Empty>
            You’re all caught up. Appointment updates will appear here.
          </Empty>
        )
      ) : (
        <Loading />
      )}
    </>
  );
}
function Profile() {
  const { user, refresh } = useAuth();
  const { data: doctor } = useData<Doctor>(
    user?.role === "doctor" ? "/doctor/profile" : "/health",
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(
        "/auth/profile",
        "PATCH",
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      await refresh();
      setMessage("Your profile has been updated.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Title
        title="A little about you"
        description="Keep your contact information up to date."
      />
      <section className="panel profile-form">
        {user?.role === "doctor" ? (
          doctor && (
            <DoctorForm
              own
              value={doctor}
              onSaved={() => {
                refresh();
                setMessage("Your doctor profile has been updated.");
              }}
            />
          )
        ) : (
          <form onSubmit={submit}>
            <div className="form-grid">
              <label>
                Full name
                <input
                  name="full_name"
                  defaultValue={user?.full_name}
                  minLength={2}
                  maxLength={100}
                  required
                />
              </label>
              <label>
                Phone number
                <input name="phone" defaultValue={user?.phone} required />
              </label>
            </div>
            <label>
              Email address
              <input value={user?.email || ""} disabled />
            </label>
            {user?.role === "patient" && (
              <label>
                Notes for your doctor
                <textarea
                  name="profile_details"
                  rows={4}
                  maxLength={2000}
                  defaultValue={user.profile_details || ""}
                />
                <small>
                  Shared only with clinicians assigned to your appointments and
                  administrators.
                </small>
              </label>
            )}
            <ErrorBox message={error} />
            <button className="button dark" disabled={busy}>
              Save changes
            </button>
          </form>
        )}
        {message && (
          <p role="status" className="success-text">
            {message}
          </p>
        )}
      </section>
    </>
  );
}
