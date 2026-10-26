import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  Menu,
  X,
  Plus,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "./context";
import { Doctor } from "./types";
import { money, day } from "./api";
export function Logo() {
  return (
    <Link to="/" className="logo">
      <span className="logo-mark">
        <Plus size={25} strokeWidth={1.7} />
      </span>
      <span>
        Aurelia<span className="logo-care">CARE</span>
      </span>
    </Link>
  );
}
export function Header() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const clinician = user?.role === "doctor";
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  return (
    <header className={"site-header " + (clinician ? "clinical-header" : "")}>
      <div className="container nav">
        <Logo />
        <button
          className="icon-button menu-toggle"
          aria-label="Toggle menu"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav
          className={open ? "nav-links open" : "nav-links"}
          aria-label="Main navigation"
        >
          {clinician ? (
            <>
              <NavLink to="/dashboard" end>
                Practice overview
              </NavLink>
              <NavLink to="/dashboard/patients">My patients</NavLink>
              <NavLink to="/dashboard/availability">My schedule</NavLink>
              <span className="clinical-role">
                <ShieldCheck size={14} /> Doctor portal
              </span>
            </>
          ) : (
            <>
              <NavLink to="/">Home</NavLink>
              <NavLink to="/doctors">Find doctors</NavLink>
              <a href="/#how-it-works">How it works</a>
              <NavLink to="/about">About us</NavLink>
            </>
          )}
          <span className="nav-divider" />
          {user ? (
            <Link to="/dashboard" className="button small dark">
              {clinician ? "My workspace" : "My dashboard"}{" "}
              <ArrowUpRight size={16} />
            </Link>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/login?role=doctor" className="doctor-entry">
                Doctor sign in
              </Link>
              <Link className="button small dark" to="/register">
                Get started <ArrowUpRight size={16} />
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="container footer-grid">
        <div>
          <Logo />
          <p>
            Thoughtful care. Meaningful connections.
            <br />A healthier tomorrow, together.
          </p>
        </div>
        <div>
          <h4>Explore care</h4>
          <Link to="/doctors">Find a doctor</Link>
          <Link to="/about">About Aurelia</Link>
          <Link to="/dashboard">Your appointments</Link>
        </div>
        <div>
          <h4>Here for your health</h4>
          <p>
            <MapPin size={15} /> Mumbai, India · Demonstration clinic
          </p>
          <p>
            <Clock size={15} /> Appointment times in IST
          </p>
          <p>
            <ShieldCheck size={15} /> Secure patient accounts
          </p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} Aurelia Care · Ronit Rajput, E052
        </span>
        <span>
          Academic demonstration · Fictional clinicians · Simulated payments
        </span>
      </div>
    </footer>
  );
}
export function Portrait({
  index = 0,
  hero = false,
  name = "Fictional doctor",
}: {
  index?: number;
  hero?: boolean;
  name?: string;
}) {
  const portraits = [
    "jhatka",
    "asthana",
    "brown",
    "tsunade",
    "chopper",
    "zoidberg",
  ];
  return (
    <div className={"portrait " + (hero ? "portrait-hero" : "")}>
      <img
        src={`/images/doctors/${portraits[index] || portraits[0]}.png`}
        alt={`${name} — illustrated character portrait`}
      />
      <span className="sample-label">Character fan art</span>
    </div>
  );
}
export function DoctorCard({ doctor: d }: { doctor: Doctor }) {
  return (
    <article className="doctor-card">
      <Link to={"/doctors/" + d.doctor_id} tabIndex={-1}>
        <Portrait index={d.image} name={`Dr. ${d.full_name}`} />
      </Link>
      <div className="doctor-card-body">
        <div className="eyebrow">{d.specialization}</div>
        <h3>
          <Link to={"/doctors/" + d.doctor_id}>Dr. {d.full_name}</Link>
        </h3>
        <p>
          {d.qualification} <span className="dot">·</span> {d.experience_years}{" "}
          years experience
        </p>
        <div className="availability-text">
          <span
            className={d.next_available ? "status-dot" : "status-dot muted"}
          />
          {d.next_available
            ? `Next: ${day(d.next_available.appointment_date)}, ${d.next_available.start_time}`
            : "View profile for availability"}
        </div>
        <div className="card-bottom">
          <span>
            <strong>{money(d.consultation_fee)}</strong>
            <small> / consultation</small>
          </span>
          <Link
            className="circle-button"
            aria-label={"View profile and book Dr. " + d.full_name}
            to={"/doctors/" + d.doctor_id}
          >
            <ArrowUpRight size={20} />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div role="alert" className="error-box">
      {message}
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div role="status" className="empty">
      <span className="spinner" /> Loading your care…
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button
          aria-label="Close dialog"
          className="icon-button"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  description,
  link,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  link?: string;
}) {
  return (
    <div className="section-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {link && (
        <Link to={link} className="text-link">
          Explore all doctors <ArrowRight size={17} />
        </Link>
      )}
    </div>
  );
}
