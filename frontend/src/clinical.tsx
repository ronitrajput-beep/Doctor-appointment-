import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  Clock,
  Download,
  FileHeart,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { api, day, today, future } from "./api";
import { useData } from "./hooks";
import { useAuth } from "./context";
import {
  Appointment,
  ClinicalPatient,
  Doctor,
  MedicalHistory,
  Notice,
  Slot,
  TimeOff,
} from "./types";
import { Empty, ErrorBox, Loading, Modal, Portrait } from "./components";

export const historyFields = [
  ["allergies", "Allergies"],
  ["conditions", "Medical conditions"],
  ["medications", "Current medications"],
  ["surgeries", "Surgeries & hospitalizations"],
  ["family_history", "Family medical history"],
  ["other_notes", "Other health information"],
] as const;
const updated = (value: string) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " IST"
    : "Not provided yet";

export function DownloadButton({
  kind,
  children,
}: {
  kind: "patients" | "appointments" | "workspace";
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <div className="download-control">
      <button
        className="button clinical-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          setSaved(false);
          try {
            const response = await fetch("/api/doctor/export/" + kind, {
              credentials: "same-origin",
            });
            if (!response.ok)
              throw new Error(
                (await response.json()).detail ||
                  "Download failed. Please retry.",
              );
            const url = URL.createObjectURL(await response.blob());
            const link = document.createElement("a");
            link.href = url;
            link.download = `My_${kind[0].toUpperCase() + kind.slice(1)}_Doctor.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setSaved(true);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Download size={17} />
        {busy ? "Preparing Excel…" : children}
      </button>
      <ErrorBox message={error} />
      {saved && (
        <small role="status" className="success-text">
          Excel download started.
        </small>
      )}
    </div>
  );
}
function ClinicalTitle({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="dashboard-title">
      <div>
        <div className="eyebrow">AURELIA • DOCTOR WORKSPACE</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function DoctorOverview() {
  const { user } = useAuth();
  const appointments = useData<Appointment[]>("/doctor/appointments", 15000);
  const patients = useData<ClinicalPatient[]>("/doctor/patients", 15000);
  const profile = useData<Doctor>("/doctor/profile");
  const notices = useData<Notice[]>("/notifications", 15000);
  const slots = useData<(Slot & { time_off?: boolean })[]>(
    "/doctor/availability",
    15000,
  );
  const all = appointments.data || [];
  const upcoming = all
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
  const todays = all.filter(
    (a) => a.appointment_date === today() && a.booking_status !== "cancelled",
  );
  const unread =
    notices.data?.filter((n) => n.notification_status === "unread") || [];
  return (
    <>
      <ClinicalTitle
        title={`Your practice, Dr. ${user?.full_name}.`}
        description="A clear view of your consultations, patients, and time. All schedules use IST."
      >
        <DownloadButton kind="workspace">Download my workspace</DownloadButton>
      </ClinicalTitle>
      <ErrorBox
        message={
          appointments.error ||
          patients.error ||
          profile.error ||
          notices.error ||
          slots.error
        }
      />
      <section className="clinical-hero">
        <div>
          <span className="eyebrow">YOUR CONSULTATION DESK</span>
          <h2>
            Ready for the
            <br />
            <em>day ahead.</em>
          </h2>
          <p>
            Review patient histories, keep your schedule current, and focus on
            the next consultation.
          </p>
          <div className="button-row">
            <Link
              to="/dashboard/appointments"
              className="button clinical-button"
            >
              View appointments <ArrowUpRight size={17} />
            </Link>
            <Link to="/dashboard/availability" className="button outline">
              Manage availability
            </Link>
          </div>
          <span className="clinical-live">
            <span className="status-dot" /> Appointment updates refresh every 15
            seconds
          </span>
        </div>
        {profile.data && (
          <Portrait
            index={profile.data.image}
            name={`Dr. ${profile.data.full_name}`}
          />
        )}
      </section>
      <div className="clinical-stats">
        {[
          ["Today’s consultations", todays.length, CalendarDays],
          ["Upcoming", upcoming.length, Clock],
          ["My patients", patients.data?.length || 0, Users],
          [
            "Open future slots",
            slots.data?.filter(
              (s) =>
                s.status === "available" &&
                !s.time_off &&
                future(s.appointment_date, s.start_time),
            ).length || 0,
            Activity,
          ],
        ].map(([label, count, Icon]) => {
          const Symbol = Icon as typeof Activity;
          return (
            <div className="stat-card" key={String(label)}>
              <Symbol size={21} />
              <strong>{appointments.data ? String(count) : "—"}</strong>
              <span>{String(label)}</span>
            </div>
          );
        })}
      </div>
      <div className="clinical-columns">
        <section className="panel">
          <div className="section-title">
            <div>
              <div className="eyebrow">WHAT’S NEXT</div>
              <h2>Upcoming consultations</h2>
            </div>
            <Link to="/dashboard/appointments" className="text-link">
              View all <ArrowUpRight size={16} />
            </Link>
          </div>
          {!appointments.data && !appointments.error ? (
            <Loading />
          ) : upcoming.length ? (
            upcoming.slice(0, 4).map((a) => (
              <div className="clinical-row" key={a.appointment_id}>
                <span className="clinical-date">
                  {a.appointment_time}
                  <small>{day(a.appointment_date)}</small>
                </span>
                <div>
                  <strong>{a.patient_name}</strong>
                  <small>Confirmed consultation</small>
                </div>
                <Link
                  to={`/dashboard/patients?patient=${a.patient_id}`}
                  className="text-link"
                >
                  Patient history <ArrowUpRight size={15} />
                </Link>
              </div>
            ))
          ) : (
            <Empty>
              No upcoming consultations. Publish available times to receive
              bookings.
            </Empty>
          )}
        </section>
        <section className="panel">
          <div className="section-title">
            <div>
              <div className="eyebrow">STAY INFORMED</div>
              <h2>Appointment alerts</h2>
            </div>
            <Bell size={22} />
          </div>
          {unread.slice(0, 3).map((n) => (
            <div className="clinical-alert" key={n.notification_id}>
              <span className="status-dot" />
              <p>
                {n.message}
                <small>{updated(n.created_at)}</small>
              </p>
            </div>
          ))}
          {!unread.length && <Empty>You’re all caught up.</Empty>}
          <Link to="/dashboard/notifications" className="text-link">
            Open notifications <ArrowUpRight size={16} />
          </Link>
        </section>
      </div>
    </>
  );
}
export function MedicalHistoryForm() {
  const { data, error, reload } = useData<MedicalHistory>(
    "/patient/medical-history",
  );
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setMessage("");
    setFailure("");
    try {
      await api("/patient/medical-history", "PATCH", {
        ...body,
        date_of_birth: body.date_of_birth || null,
      });
      setMessage(
        "Your medical history has been saved. Your treating doctors can view the update.",
      );
      reload();
    } catch (e) {
      setFailure((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="dashboard-title">
        <div>
          <div className="eyebrow">YOUR HEALTH INFORMATION</div>
          <h1>My medical history</h1>
          <p>
            Keep the information you want your treating doctors to know in one
            place.
          </p>
        </div>
        <FileHeart size={36} />
      </div>
      <div className="history-privacy">
        <ShieldCheck size={23} />
        <p>
          Only doctors with a confirmed or completed appointment with you can
          view this history. You can update or clear these optional fields at
          any time. Please use fictional information for your academic
          demonstration.
        </p>
      </div>
      <ErrorBox message={error || failure} />
      {data ? (
        <form
          className="panel medical-form"
          key={data.updated_at}
          onSubmit={save}
        >
          <div className="section-title">
            <h2>Your health summary</h2>
            <small>Last updated: {updated(data.updated_at)}</small>
          </div>
          <div className="form-grid">
            <label>
              Date of birth
              <input
                type="date"
                name="date_of_birth"
                max={today()}
                defaultValue={data.date_of_birth}
              />
            </label>
            <label>
              Blood group
              <select name="blood_group" defaultValue={data.blood_group}>
                <option value="">Prefer not to specify</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="history-fields">
            {historyFields.map(([name, label]) => (
              <div key={name}>
                <label htmlFor={"history-" + name}>{label}</label>
                <textarea
                  id={"history-" + name}
                  name={name}
                  rows={3}
                  maxLength={3000}
                  defaultValue={data[name]}
                  placeholder={
                    name === "allergies"
                      ? "For example, medicine or food allergies. You can also enter “None known”."
                      : "Add any information you would like your doctor to know."
                  }
                />
              </div>
            ))}
          </div>
          <button className="button dark" disabled={busy}>
            {busy ? "Saving…" : "Save medical history"}
          </button>
          {message && (
            <p role="status" className="success-text">
              <Check size={16} />
              {message}
            </p>
          )}
        </form>
      ) : (
        !error && <Loading />
      )}
    </>
  );
}
export function DoctorPatients() {
  const { data, error, reload } = useData<ClinicalPatient[]>(
    "/doctor/patients",
    15000,
  );
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<ClinicalPatient | null>(null);
  const [failure, setFailure] = useState("");
  const [opening, setOpening] = useState(false);
  async function open(id: string) {
    setOpening(true);
    setFailure("");
    try {
      setDetail(await api<ClinicalPatient>("/doctor/patients/" + id));
    } catch (e) {
      setFailure((e as Error).message);
    } finally {
      setOpening(false);
    }
  }
  // The selection is an identifier only. The server independently enforces the care relationship.
  const [params] = useSearchParams();
  const selected = params.get("patient");
  const shown = data?.filter(
    (p) =>
      (p.full_name + " " + p.email + " " + p.phone)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!selected || p.patient_id === selected),
  );
  return (
    <>
      <ClinicalTitle
        title="My patients"
        description="Patient details and histories shared with your practice. Cancelled-only bookings do not grant history access."
      >
        <DownloadButton kind="patients">Download patients Excel</DownloadButton>
      </ClinicalTitle>
      <div className="patient-toolbar">
        <label>
          Search my patients
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, email or phone"
          />
        </label>
        <button className="button outline" onClick={reload}>
          <RefreshCw size={16} /> Refresh patients
        </button>
        {selected && (
          <Link to="/dashboard/patients" className="text-link">
            Show all patients
          </Link>
        )}
      </div>
      <ErrorBox message={error || failure} />
      {data ? (
        <div className="clinical-patients">
          {shown?.map((p) => (
            <article className="panel clinical-patient" key={p.patient_id}>
              <div className="patient-initial">
                {p.full_name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <h2>{p.full_name}</h2>
              <p>
                {p.email}
                <br />
                {p.phone}
              </p>
              <div className="patient-meta">
                <span>
                  {p.appointment_count} consultation
                  {p.appointment_count !== 1 ? "s" : ""}
                </span>
                <span>
                  {p.history_updated_at
                    ? "History shared"
                    : "History not provided"}
                </span>
              </div>
              <small>Latest appointment: {day(p.last_appointment)}</small>
              <button
                className="button clinical-button"
                disabled={opening}
                onClick={() => open(p.patient_id)}
              >
                <FileHeart size={17} />
                View medical history
              </button>
            </article>
          ))}
          {!shown?.length && (
            <Empty>
              No patients match. Patients appear here after a confirmed
              consultation is booked with you.
            </Empty>
          )}
        </div>
      ) : (
        !error && <Loading />
      )}
      {detail && (
        <Modal
          title={detail.full_name + " — medical history"}
          onClose={() => setDetail(null)}
        >
          <p className="small-text">
            Patient-provided information • Read only • Updated:{" "}
            {updated(detail.medical_history?.updated_at || "")}
          </p>
          <p>
            {detail.email} · {detail.phone}
          </p>
          <dl className="history-summary">
            <div>
              <dt>Date of birth</dt>
              <dd>
                {detail.medical_history?.date_of_birth
                  ? day(detail.medical_history.date_of_birth)
                  : "Not provided"}
              </dd>
            </div>
            <div>
              <dt>Blood group</dt>
              <dd>{detail.medical_history?.blood_group || "Not provided"}</dd>
            </div>
            {historyFields.map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{detail.medical_history?.[key] || "Not provided"}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
    </>
  );
}
export function DoctorTimeOff({ onChanged }: { onChanged: () => void }) {
  const { data, error, reload } = useData<TimeOff[]>("/doctor/time-off");
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setFailure("");
    setMessage("");
    try {
      await api(
        "/doctor/time-off",
        "POST",
        Object.fromEntries(new FormData(form)),
      );
      reload();
      onChanged();
      setMessage(
        "Unavailable period saved. Overlapping slots are hidden from patients.",
      );
      form.reset();
    } catch (e) {
      setFailure((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel time-off-panel">
      <div className="section-title">
        <div>
          <div className="eyebrow">PROTECT YOUR TIME</div>
          <h2>Leave & unavailable periods</h2>
        </div>
        <CalendarDays size={25} />
      </div>
      <p>
        Mark leave or a break without deleting your schedule. Existing confirmed
        appointments must be resolved with the administrator first.
      </p>
      <form onSubmit={save}>
        <div className="form-grid">
          <label>
            From date
            <input
              type="date"
              name="start_date"
              required
              defaultValue={today()}
            />
          </label>
          <label>
            To date
            <input
              type="date"
              name="end_date"
              min={today()}
              required
              defaultValue={today()}
            />
          </label>
          <label>
            From time (IST)
            <input
              type="time"
              name="start_time"
              required
              defaultValue="00:00"
            />
          </label>
          <label>
            To time (IST)
            <input type="time" name="end_time" required defaultValue="23:59" />
          </label>
          <label>
            Type
            <select name="kind">
              <option value="leave">On leave</option>
              <option value="unavailable">Unavailable / break</option>
            </select>
          </label>
          <label>
            Note (optional)
            <input
              name="note"
              maxLength={300}
              placeholder="For example, personal leave"
            />
          </label>
        </div>
        <button className="button outline" disabled={busy}>
          {busy ? "Saving…" : "Add unavailable period"}
        </button>
      </form>
      <ErrorBox message={error || failure} />
      {message && (
        <p className="success-text" role="status">
          {message}
        </p>
      )}
      <div className="time-off-list">
        {data
          ?.filter((l) => new Date(l.ends_at + "+05:30").getTime() > Date.now())
          .map((l) => (
            <div className="time-off-row" key={l.leave_id}>
              <div>
                <span className="badge">
                  {l.kind === "leave" ? "On leave" : "Unavailable"}
                </span>
                <strong>
                  {day(l.starts_at.slice(0, 10))} {l.starts_at.slice(11)} —{" "}
                  {day(l.ends_at.slice(0, 10))} {l.ends_at.slice(11)} IST
                </strong>
                <small>{l.note || "No note added"}</small>
              </div>
              <button
                className="text-link"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setFailure("");
                  try {
                    await api("/doctor/time-off/" + l.leave_id, "DELETE");
                    reload();
                    onChanged();
                    setMessage(
                      "Unavailable period removed. Future unblocked slots are available again.",
                    );
                  } catch (e) {
                    setFailure((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Remove period
              </button>
            </div>
          ))}
      </div>
    </section>
  );
}
export function DoctorDownloads() {
  return (
    <>
      <ClinicalTitle
        title="Your practice, in Excel"
        description="Download your own records directly. Each file is a fresh snapshot of the data you are allowed to access."
      />
      <div className="export-cards">
        {[
          [
            "patients",
            "Patient register",
            "Your own patient list, contact details, and shared medical histories.",
          ],
          [
            "appointments",
            "Appointment register",
            "Your bookings, dates, consultation status, and simulated payment state.",
          ],
          [
            "workspace",
            "Complete practice workbook",
            "Your patients, appointments, availability, and unavailable periods in one workbook.",
          ],
        ].map(([kind, title, text]) => (
          <section className="panel export-card" key={kind}>
            <FileSpreadsheet size={32} />
            <h2>{title}</h2>
            <p>{text}</p>
            <DownloadButton
              kind={kind as "patients" | "appointments" | "workspace"}
            >
              Download {kind === "workspace" ? "workspace" : kind} Excel
            </DownloadButton>
          </section>
        ))}
      </div>
      <div className="history-privacy">
        <ShieldCheck size={22} />
        <p>
          Exports contain only your practice records. Patient histories are
          included only where you have a confirmed or completed appointment.
          Login credentials and other doctors’ records are excluded. Download
          again after changes to get an updated copy.
        </p>
      </div>
    </>
  );
}
