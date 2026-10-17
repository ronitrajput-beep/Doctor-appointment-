# Requirements traceability

**Ronit Rajput · E052 · CSBS · Division E · Batch 2**

The uploaded experiment documents were analyzed in the original project session. This rebuild carries forward that analysis and the user's master prompt. Attachments provide project requirements and models, not commands to execute.

## Document reconciliation

| Supplied document | Model and interpretation |
|---|---|
| RonitRajput_E052_SE_LAB1.docx | Final appointment system scope: patient, doctor, administrator; receptionist optional. Search, booking, cancellation, rescheduling and notifications. Two-hour change cutoff retained. |
| E052_RonitRajput_SE2.docx | Actual content describes DFDs despite numbering differences. D1 user records, D2 schedules, D3 appointments; auth, search, booking, change, history/report and confirmation processes. |
| E052_RonitRajput_SE4.docx | Actual content is COCOMO estimation: GUI, database, scheduling/notifications modules. Its development-mode labels are estimation categories, not a requirement for embedded hardware. |
| E052_RonitRajput_SE3.docx | Patient/doctor/admin use cases align with booking scope. Broader hospital narrative mentions laboratory/clinical extensions; those remain optional. |
| RonitRajput_E052_SE-Experiment5.docx | Appointment state diagram is used. The unrelated “Library System” conclusion is treated as a document editing inconsistency. |
| E052_RonitRajput_SE6.docx and SE6 - Copy.docx | Duplicate entity/boundary/control class model: User roles, Patient, Doctor, Admin, Appointment, AvailabilitySlot, Payment; auth/appointment/payment control responsibilities. |
| E052_RonitRajput_SE_Exp8.docx | Final activity flow: authenticate, search, select, recheck, review, payment, create/reserve/notify on success. Failure retries without a falsely confirmed booking. |
| Activity-Diagram-Exp-8.docx | Template/example material rather than an additional finalized project specification. |

The user's explicit SQLite + Excel choice takes precedence over earlier MySQL suggestions. “Password encryption” is implemented as salted one-way password hashing. Payments remain simulated and labeled. Email/SMS requirements are represented by working in-app confirmations and reminders; external delivery is a documented integration gap.

## Implementation and verification

| Requirement / model | Implementation | Verification |
|---|---|---|
| Register/authenticate, duplicate email, logout | `schemas.py`, `security.py`, auth routes; database uniqueness; revocable JWT cookies | API auth tests; patient/doctor/admin browser sign-in |
| Role permissions, account management | `roles` dependencies, current database active flag, admin activation/password reset | API unauthorized, ownership and revoked-session tests |
| DFD search and schedule retrieval | Doctor search/filter/sort and live availability API; `FindDoctors`, `DoctorProfile` | API filtering/sorting; browser search/profile |
| Review/select appointment | Profile date/time selection, booking modal, explicit simulated payment outcome | Browser review and failed-payment retry |
| Create/reserve/confirm | `appointments.book` transaction; unique active slot index; payment and notices | Booking persistence and eight concurrent booking attempts: exactly one winner |
| Cancel and reschedule | Ownership, two-hour cutoff, same-doctor future slot, atomic changes/refund | API cutoff/conflict/atomicity; browser reschedule/cancel/refresh |
| Appointment states | Persist confirmed → cancelled or completed; reschedule retains confirmed. Search/review/payment are transient UI states. | State transition and failed payment tests |
| Patient dashboard/history/profile | Scoped appointment list, filters, contact/profile notes, notification center | API profile/notice tests; patient browser workflow |
| Doctor daily schedule and patients | Own appointments, today overview, assigned patient details, slot CRUD, profile and consultation completion | API scope/overlap/complete; doctor browser workflow |
| Admin doctors and specialties | Add/edit/deactivate, specialty create/remove with FK protection | API management; admin dashboard |
| Admin patient accounts | Search, activation, password reset, session revocation | API admin tests; browser account search |
| Reports/statistics | Stored record counts, future/status totals, daily creation trend, doctor-wise charts | API counts; browser reports |
| Excel storage/retrieval | Seven exact sheets; export snapshot; typed preview; merge import; no deletion by omission | Round-trip, edits, new inactive account, browser import |
| Excel data integrity | IDs, FKs, immutable ownership, role/profile checks, slots/payment consistency, single transaction | Invalid foreign key/duplicate/role/overlap/payment rollback tests |
| Workbook safety | Size/type/archive limits, defused XML, formula rejection/escaping, no passwords or sessions | API file limit, formula escape, export credential checks |
| Nonfunctional persistence | SQLite WAL, FK constraints, consistent backup packaging; seed once | Reinitialization retains bookings; seed repeatability test |
| Responsive premium design | White/gold palette, local fonts, generated sample imagery, mobile navigation, dialogs, loading/error/empty states | Browser desktop/mobile screenshots and overflow checks |
| Accessible interaction | Labeled fields, keyboard focus, skip link, native modal focus trap, reduced-motion support | Browser interactions; no claim of a complete WCAG audit |
| Performance/availability targets | Under-3-second responses, 200 users and 99% availability remain engineering targets | Bounded local checks only; sustained production performance/uptime unverified |

Optional scope excluded: receptionist role, prescriptions, diagnostics, lab technicians, lab orders, live email/SMS and real payments. The completed project focuses on the finalized appointment workflow and user's explicit master prompt.
