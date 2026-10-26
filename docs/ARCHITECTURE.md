# Architecture

React/Vite/TypeScript routes call same-origin `/api` endpoints. FastAPI authenticates a signed JWT in an HttpOnly, SameSite=Strict cookie and checks its server-side session record. Database role and active status are rechecked on every request. Scrypt hashes passwords with random salts; credentials never enter the workbook.

SQLite uses foreign keys, WAL, bounded lock waits and `BEGIN IMMEDIATE` transactions. The availability/booking/payment/notification writes occur in one transaction. A partial unique index permits only one noncancelled appointment per slot. Failed simulated payments roll back before creating records. Rescheduling reserves the new slot and releases the old slot together. All clinic times are Asia/Kolkata.

```mermaid
flowchart LR
    Patient[Patient / Doctor / Administrator] --> UI[React pages and dashboards]
    UI --> API[FastAPI validation and authorization]
    API --> Auth[JWT + revocable sessions]
    API --> Booking[Appointment transactions]
    Booking --> DB[(SQLite)]
    API --> Excel[Workbook validation and preview]
    Excel <--> DB
    Excel <--> Workbook[Seven-sheet XLSX]
```

Entities: User has one Patient or Doctor profile; Administrator is a User role. Doctor owns Availability slots. Appointment connects Patient, Doctor and slot. Payment is unique per appointment. Notifications belong to a user and optionally an appointment. Sessions are separate from exportable business data. Specializations are normalized for administrator management.

Entity/boundary/control mapping: React auth/booking/payment screens are boundaries; API route dependencies, `appointments.py` and `excel.py` are controllers/services; SQLite tables are entities. This implements the class-model responsibilities without forcing Java-style inheritance onto SQL.

The import parser enforces sheet/header shape, size limits, typed fields, IDs, foreign keys, role/profile consistency, no overlapping schedules, booking-slot agreement, and matching simulated payment state. Validation starts a real transaction and rolls it back; import repeats validation and commits. Export takes a consistent read snapshot and atomically replaces the local workbook.


## Doctor workspace extension

`clinical.py` handles patient-owned structured medical histories, care-relationship checks, private doctor registers/workbooks, and unavailable periods. New tables `medical_histories` and `doctor_time_off` are added idempotently without altering the existing Patients workbook schema. A confirmed/completed appointment is required for current history access; cancelled-only bookings do not grant access. History view/export takes a protected snapshot while relationships are checked. Doctors have no endpoint to edit a patient's history and no access to the administrator's full workbook.

Leave conflicts with confirmed appointments are rejected transactionally. Both public slot listing and transactional booking check time-off intervals; slot publication and administrator workbook import also enforce the relevant leave rules. Leave records override availability without rewriting slot states, so removing leave does not reactivate manually blocked slots.

Doctor pages, appointment lists, and notification badges refresh via 15-second polling while visible, plus focus/visibility refresh. Doctor sign-in routes to a distinct practice layout, and browser redirects complement existing backend patient-only booking authorization. Scoped exports are direct authenticated XLSX downloads; the existing admin workbook remains seven-sheet and excludes the new clinical tables. Backups preserve all tables. Generated local doctor credentials remain outside Git.
