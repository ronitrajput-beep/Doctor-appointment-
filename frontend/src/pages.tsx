import { FormEvent, useEffect, useState } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  HeartPulse,
  Brain,
  Baby,
  Bone,
  Sparkles,
  Stethoscope,
  Search,
  ShieldCheck,
  CalendarDays,
  Check,
  Clock,
  Leaf,
  CheckCircle2,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, money, day, today } from "./api";
import { Doctor, Slot, Appointment } from "./types";
import {
  DoctorCard,
  Portrait,
  SectionTitle,
  ErrorBox,
  Loading,
  Empty,
  Modal,
} from "./components";
import { useAuth } from "./context";

const specialties = [
  ["Cardiology", HeartPulse],
  ["Dermatology", Sparkles],
  ["Neurology", Brain],
  ["Orthopedics", Bone],
  ["Pediatrics", Baby],
  ["General Medicine", Stethoscope],
] as const;
function SearchForm() {
  const navigate = useNavigate();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    values.forEach((v, k) => {
      if (v) params.set(k, String(v));
    });
    navigate("/doctors?" + params);
  }
  return (
    <form onSubmit={submit} className="hero-search">
      <label>
        <span>
          <Search size={15} /> Doctor name
        </span>
        <input name="q" placeholder="Who are you looking for?" />
      </label>
      <label>
        <span>
          <Stethoscope size={15} /> Specialization
        </span>
        <select name="specialization" defaultValue="">
          <option value="">All specialties</option>
          {specialties.map(([s]) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        <span>
          <CalendarDays size={15} /> Preferred date
        </span>
        <input
          aria-label="Preferred date"
          type="date"
          name="date"
          min={today()}
        />
      </label>
      <button className="button dark" type="submit">
        <Search size={18} /> Find a doctor
      </button>
    </form>
  );
}

export function Home() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [error, setError] = useState("");
  const reduce = useReducedMotion();
  useEffect(() => {
    api<Doctor[]>("/doctors")
      .then(setDoctors)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <motion.div
            className="hero-copy"
            initial={reduce ? false : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="eyebrow pill">
              <span className="status-dot" /> CARE THAT PUTS YOU FIRST
            </div>
            <h1>
              Your health.
              <br />
              Our <em>highest</em>
              <br />
              priority.
            </h1>
            <p>
              Exceptional care begins with a connection.
              <br className="desktop-only" /> Find the right specialist, at the
              right time —<br className="desktop-only" /> and feel cared for,
              every step of the way.
            </p>
            <div className="button-row">
              <Link to="/doctors" className="button dark">
                Find your doctor <ArrowUpRight size={18} />
              </Link>
              <a href="#how-it-works" className="text-link">
                How it works <ArrowRight size={16} />
              </a>
            </div>
            <div className="hero-trust">
              <span className="trust-icon">
                <ShieldCheck size={24} />
              </span>
              <div>
                <strong>Personal care. Peace of mind.</strong>
                <small>Secure booking · Clear consultation fees</small>
              </div>
            </div>
          </motion.div>
          <div className="hero-art">
            <div className="hero-orbit" />
            <Portrait hero index={0} />
            <div className="floating-card top">
              <span className="gold-icon">
                <HeartPulse />
              </span>
              <div>
                <strong>Good health starts here.</strong>
                <small>Expertise with a human touch</small>
              </div>
            </div>
            <div className="floating-card bottom">
              <span className="check-icon">
                <Check />
              </span>
              <div>
                <strong>Your next step to better health</strong>
                <small>Choose a specialist. Book with ease.</small>
              </div>
              <ArrowUpRight size={20} />
            </div>
            <span className="hero-art-label">THOUGHTFUL CARE, ALWAYS.</span>
          </div>
        </div>
        <div className="container">
          <SearchForm />
        </div>
      </section>
      <div className="promise-strip container">
        <span>
          <ShieldCheck /> Private & secure
        </span>
        <span>
          <CalendarDays /> Booking on your schedule
        </span>
        <span>
          <Stethoscope /> Care across specialties
        </span>
        <span>
          <HeartPulse /> People before everything
        </span>
      </div>
      <section className="section container">
        <SectionTitle
          eyebrow="FIND YOUR CARE"
          title="The right expertise. Just for you."
          description="Specialized care for every chapter of your life."
        />
        <div className="specialty-grid">
          {specialties.map(([name, Icon]) => (
            <Link
              key={name}
              to={"/doctors?specialization=" + encodeURIComponent(name)}
              className="specialty"
            >
              <Icon size={30} strokeWidth={1.4} />
              <h3>{name}</h3>
              <ArrowUpRight size={17} />
            </Link>
          ))}
        </div>
      </section>
      <section className="section tinted">
        <div className="container">
          <SectionTitle
            eyebrow="MEET YOUR SPECIALISTS"
            title="Expert hands. Caring hearts."
            description="Discover the people dedicated to your wellbeing."
            link="/doctors"
          />
          <ErrorBox message={error} />
          <div className="doctor-grid">
            {doctors.slice(0, 3).map((d) => (
              <DoctorCard key={d.doctor_id} doctor={d} />
            ))}
          </div>
        </div>
      </section>
      <section className="section container" id="how-it-works">
        <SectionTitle
          eyebrow="SIMPLER AT EVERY STEP"
          title="Your wellbeing, without the wait."
          description="From finding a specialist to your first hello — we make it easy."
        />
        <div className="steps">
          {[
            [
              "01",
              "Find your specialist",
              "Explore doctors by expertise, experience and availability.",
            ],
            [
              "02",
              "Choose your moment",
              "Pick a date and time that fits comfortably into your day.",
            ],
            [
              "03",
              "Review & confirm",
              "See your consultation fee and complete a simulated payment.",
            ],
            [
              "04",
              "You’re all set",
              "Your confirmation and updates stay together in your dashboard.",
            ],
          ].map(([n, t, p]) => (
            <div key={n}>
              <span className="step-number">{n}</span>
              <h3>{t}</h3>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="container">
        <div className="care-banner">
          <div className="eyebrow">A LITTLE CARE GOES A LONG WAY</div>
          <h2>
            Make time for <em>yourself.</em>
            <br />
            We’ll take care of the rest.
          </h2>
          <Link to="/doctors" className="button dark">
            Book an appointment <ArrowUpRight size={18} />
          </Link>
          <Leaf className="banner-leaf" strokeWidth={0.6} />
        </div>
      </section>
    </>
  );
}

export function FindDoctors() {
  const [params, setParams] = useSearchParams();
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [error, setError] = useState("");
  const [specs, setSpecs] = useState<string[]>([]);
  useEffect(() => {
    api<string[]>("/specializations")
      .then(setSpecs)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    let active = true;
    setDoctors(null);
    setError("");
    api<Doctor[]>("/doctors?" + params)
      .then((d) => {
        if (active) setDoctors(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [params]);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const p = new URLSearchParams();
    data.forEach((v, k) => {
      if (v) p.set(k, String(v));
    });
    setParams(p);
  }
  return (
    <div className="container section">
      <div className="page-heading">
        <div className="eyebrow">YOUR PARTNER IN BETTER HEALTH</div>
        <h1>
          Find your <em>kind of care.</em>
        </h1>
        <p>
          Thoughtful specialists, transparent fees, and a time that works for
          you.
        </p>
      </div>
      <form key={params.toString()} onSubmit={submit} className="filter-bar">
        <label>
          Doctor name
          <input
            name="q"
            placeholder="Search by name"
            defaultValue={params.get("q") || ""}
          />
        </label>
        <label>
          Specialization
          <select
            name="specialization"
            defaultValue={params.get("specialization") || ""}
          >
            <option value="">All specialties</option>
            {specs.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Available on
          <input
            type="date"
            name="date"
            min={today()}
            defaultValue={params.get("date") || ""}
          />
        </label>
        <label>
          Sort by
          <select name="sort" defaultValue={params.get("sort") || "name"}>
            <option value="name">Name</option>
            <option value="fee">Fee: low to high</option>
            <option value="experience">Most experienced</option>
          </select>
        </label>
        <button className="button dark">
          Search <Search size={16} />
        </button>
      </form>
      <ErrorBox message={error} />
      {!doctors && !error ? (
        <Loading />
      ) : (
        doctors && (
          <>
            <div className="results-line">
              <span>{doctors.length} specialists found</span>
              <button className="text-link" onClick={() => setParams({})}>
                Clear filters
              </button>
            </div>
            {doctors.length ? (
              <div className="doctor-grid">
                {doctors.map((d) => (
                  <DoctorCard key={d.doctor_id} doctor={d} />
                ))}
              </div>
            ) : (
              <Empty>
                No doctors match these filters. Try another specialty or date.
              </Empty>
            )}
          </>
        )
      )}
    </div>
  );
}

export function DoctorProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [d, setDoctor] = useState<Doctor | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [date, setDate] = useState("");
  const [selected, setSelected] = useState<Slot | null>(null);
  const [payment, setPayment] = useState("success");
  const [error, setError] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([
      api<Doctor>("/doctors/" + id),
      api<Slot[]>("/doctors/" + id + "/availability"),
    ])
      .then(([doctor, slots]) => {
        setDoctor(doctor);
        setSlots(slots);
        setDate(slots[0]?.appointment_date || "");
      })
      .catch((e) => setError(e.message));
  }, [id]);
  async function book() {
    if (!selected) return;
    setBusy(true);
    setBookingError("");
    try {
      const a = await api<Appointment>("/appointments", "POST", {
        slot_id: selected.slot_id,
        payment_result: payment,
      });
      navigate("/appointments/" + a.appointment_id + "/confirmation");
    } catch (e) {
      setBookingError((e as Error).message);
      api<Slot[]>("/doctors/" + id + "/availability")
        .then(setSlots)
        .catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container section">
      <Link className="text-link back-link" to="/doctors">
        ← All specialists
      </Link>
      <ErrorBox message={error} />
      {!d && !error ? (
        <Loading />
      ) : (
        d && (
          <>
            <div className="profile-hero">
              <Portrait index={d.image} />
              <div>
                <div className="eyebrow">{d.specialization}</div>
                <h1>
                  Dr. <em>{d.full_name}</em>
                </h1>
                <p className="lead">{d.qualification}</p>
                <div className="profile-facts">
                  <span>
                    <Stethoscope />
                    {d.experience_years} years of experience
                  </span>
                  <span>
                    <HeartPulse />
                    Patient-centered consultations
                  </span>
                </div>
                <p>
                  Care that listens. Guidance you can understand.
                  <br />A consultation focused on you.
                </p>
                <span className="badge">Fictional demonstration clinician</span>
              </div>
            </div>
            <div className="profile-columns">
              <section className="panel">
                <h2>A little about your doctor</h2>
                <p className="readable">{d.biography}</p>
                <h3>What to expect</h3>
                <ul className="check-list">
                  <li>
                    <Check />
                    Time to discuss your concerns
                  </li>
                  <li>
                    <Check />
                    Clear, personalized guidance
                  </li>
                  <li>
                    <Check />A thoughtful plan for your next steps
                  </li>
                </ul>
                <div className="note">
                  If you need urgent medical attention, contact your local
                  emergency service. This academic demonstration does not
                  provide medical care.
                </div>
              </section>
              <section className="panel booking-panel">
                <div className="section-title">
                  <h2>Book a consultation</h2>
                  <strong className="fee">{money(d.consultation_fee)}</strong>
                </div>
                <p>Choose an available time. All times are in IST.</p>
                {slots.length ? (
                  <>
                    <label>
                      Appointment date
                      <select
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      >
                        {[...new Set(slots.map((s) => s.appointment_date))].map(
                          (date) => (
                            <option value={date} key={date}>
                              {day(date)}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <div className="slot-grid">
                      {slots
                        .filter((s) => s.appointment_date === date)
                        .map((s) => (
                          <button
                            className="slot"
                            key={s.slot_id}
                            onClick={() => {
                              if (!user) {
                                navigate(
                                  "/login?next=" +
                                    encodeURIComponent("/doctors/" + id),
                                );
                                return;
                              }
                              setBookingError("");
                              setSelected(s);
                            }}
                          >
                            {s.start_time}
                            <small>{s.end_time} IST</small>
                          </button>
                        ))}
                    </div>
                    <p className="small-text">
                      <ShieldCheck size={14} /> Secure booking · Changes allowed
                      until 2 hours before
                    </p>
                  </>
                ) : (
                  <Empty>
                    No available times right now. Please check again soon.
                  </Empty>
                )}
              </section>
            </div>
            {selected && (
              <Modal
                title="Review your appointment"
                onClose={() => {
                  if (!busy) setSelected(null);
                }}
              >
                <div className="booking-summary">
                  <span className="eyebrow">{d.specialization}</span>
                  <h3>Dr. {d.full_name}</h3>
                  <p>
                    <CalendarDays size={16} /> {day(selected.appointment_date)}{" "}
                    · {selected.start_time} IST
                  </p>
                  <div className="card-bottom">
                    <span>Consultation fee</span>
                    <strong>{money(d.consultation_fee)}</strong>
                  </div>
                </div>
                <div className="note">
                  Simulated payment only. No real money will be charged and no
                  card details are needed.
                </div>
                {user?.role === "patient" ? (
                  <>
                    <label>
                      Simulated payment outcome
                      <select
                        value={payment}
                        onChange={(e) => setPayment(e.target.value)}
                      >
                        <option value="success">Payment succeeds</option>
                        <option value="failure">
                          Payment is declined (test retry)
                        </option>
                      </select>
                    </label>
                    <ErrorBox message={bookingError} />
                    <button
                      className="button dark full"
                      disabled={busy}
                      onClick={book}
                    >
                      {busy ? "Confirming…" : "Confirm & pay (simulation)"}{" "}
                      <ArrowRight size={16} />
                    </button>
                  </>
                ) : (
                  <ErrorBox message="Sign in with a patient account to book an appointment." />
                )}
              </Modal>
            )}
          </>
        )
      )}
    </div>
  );
}

const authSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
  full_name: z.string().optional(),
  phone: z.string().optional(),
  confirm: z.string().optional(),
});
type AuthValues = z.infer<typeof authSchema>;
export function AuthPage({ registerMode = false }: { registerMode?: boolean }) {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState("");
  const form = useForm<AuthValues>({
    resolver: zodResolver(
      registerMode
        ? authSchema.superRefine((v, c) => {
            if (!v.full_name || v.full_name.trim().length < 2)
              c.addIssue({
                code: "custom",
                path: ["full_name"],
                message: "Enter your full name.",
              });
            if (!v.phone || !/^\+?[\d\s()-]{7,20}$/.test(v.phone))
              c.addIssue({
                code: "custom",
                path: ["phone"],
                message: "Enter a valid phone number.",
              });
            if (v.password.length < 8)
              c.addIssue({
                code: "custom",
                path: ["password"],
                message: "Use at least 8 characters.",
              });
            if (v.confirm !== v.password)
              c.addIssue({
                code: "custom",
                path: ["confirm"],
                message: "Passwords do not match.",
              });
          })
        : authSchema,
    ),
  });
  useEffect(() => {
    form.reset();
    setError("");
  }, [registerMode]);
  if (user) return <Navigate to="/dashboard" replace />;
  async function submit(v: AuthValues) {
    setError("");
    try {
      await api(
        "/auth/" + (registerMode ? "register" : "login"),
        "POST",
        registerMode
          ? {
              full_name: v.full_name,
              email: v.email,
              phone: v.phone,
              password: v.password,
            }
          : { email: v.email, password: v.password },
      );
      await refresh();
      const next = params.get("next");
      navigate(next?.startsWith("/doctors/") ? next : "/dashboard", {
        replace: true,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function field(name: keyof AuthValues, label: string, type = "text") {
    return (
      <label>
        {label}
        <input
          type={type}
          autoComplete={
            name === "password"
              ? registerMode
                ? "new-password"
                : "current-password"
              : name === "email"
                ? "email"
                : undefined
          }
          {...form.register(name)}
        />
        {form.formState.errors[name] && (
          <span className="field-error">
            {form.formState.errors[name]?.message}
          </span>
        )}
      </label>
    );
  }
  return (
    <div className="container auth-grid">
      <div className="auth-story">
        <div className="eyebrow">WELCOME TO AURELIA CARE</div>
        <h1>
          A healthier you.
          <br />
          <em>A simpler way.</em>
        </h1>
        <p>
          Your appointments, your specialists, your peace of mind.
          <br />
          All in one thoughtful space.
        </p>
        <Portrait index={3} />
        <div className="auth-quote">“Care begins with listening.”</div>
      </div>
      <section className="auth-form panel">
        <div className="eyebrow">
          {registerMode ? "LET’S BEGIN" : "GOOD TO SEE YOU"}
        </div>
        <h2>{registerMode ? "Create your account" : "Welcome back."}</h2>
        <p>
          {registerMode
            ? "Take the first step towards more personal care."
            : "Sign in to manage your care."}
        </p>
        <form onSubmit={form.handleSubmit(submit)} noValidate>
          {registerMode && field("full_name", "Full name")}
          {field("email", "Email address", "email")}
          {registerMode && field("phone", "Phone number", "tel")}
          {field("password", "Password", "password")}
          {registerMode && field("confirm", "Confirm password", "password")}
          <ErrorBox message={error} />
          <button
            className="button dark full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? "Please wait…"
              : registerMode
                ? "Create account"
                : "Sign in"}{" "}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="auth-switch">
          {registerMode ? "Already have an account?" : "New to Aurelia?"}{" "}
          <Link to={registerMode ? "/login" : "/register"}>
            {registerMode ? "Sign in" : "Create an account"}
          </Link>
        </p>
        <div className="small-text">
          <ShieldCheck size={15} /> Your information stays in your private
          account.
        </div>
      </section>
    </div>
  );
}

export function Confirmation() {
  const { id } = useParams();
  const [a, setA] = useState<Appointment | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Appointment>("/appointments/" + id)
      .then(setA)
      .catch((e) => setError(e.message));
  }, [id]);
  return (
    <div className="container section">
      <div className="confirmation panel">
        <ErrorBox message={error} />
        {!a && !error ? (
          <Loading />
        ) : (
          a && (
            <>
              <span className="confirmation-icon">
                <CheckCircle2 size={42} />
              </span>
              <div className="eyebrow">YOU’RE ALL SET</div>
              <h1>
                Your care is <em>confirmed.</em>
              </h1>
              <p>
                We look forward to seeing you. Your appointment details are
                saved in your dashboard.
              </p>
              <div className="booking-summary">
                <h3>Dr. {a.doctor_name}</h3>
                <p>{a.specialization}</p>
                <p>
                  {day(a.appointment_date)} · {a.appointment_time} IST
                </p>
                <div className="card-bottom">
                  <span>Simulated payment</span>
                  <strong>{money(a.amount)}</strong>
                </div>
                <small>
                  {a.appointment_id}
                  <br />
                  {a.transaction_reference}
                </small>
              </div>
              <Link className="button dark" to="/dashboard/appointments">
                View my appointments <ArrowRight size={16} />
              </Link>
            </>
          )
        )}
      </div>
    </div>
  );
}

export function About() {
  return (
    <div className="container section">
      <div className="profile-hero">
        <Portrait index={5} />
        <div>
          <div className="eyebrow">THE HEART OF AURELIA</div>
          <h1>
            Healthcare.
            <br />
            <em>With a human touch.</em>
          </h1>
          <p className="lead">
            We believe finding care should feel reassuring, simple, and
            personal.
          </p>
          <p>
            Aurelia connects patients with specialists through clear profiles,
            available appointment times, and a single place to manage their
            care.
          </p>
          <Link to="/doctors" className="button dark">
            Meet your specialists <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
      <section className="panel">
        <h2>About this project</h2>
        <p>
          This working academic application was developed for Ronit Rajput,
          E052, B.Tech CSBS, Division E, Batch 2. It demonstrates the
          requirements, models, and workflows from Software Engineering
          Experiments 1–8.
        </p>
        <p>
          All clinician profiles and patient records are fictional. Payments are
          simulated. Appointment updates and reminders appear inside your
          account; external email and SMS services are not connected.
        </p>
      </section>
    </div>
  );
}
