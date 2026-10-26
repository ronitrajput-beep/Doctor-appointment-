# Doctor and patient workspaces

Updated 26 October 2026. This extends the earlier academic report baseline with patient-maintained medical histories, private doctor registers, leave management, direct Excel downloads, and refreshed notifications.

## Sign in

Run the updated application, then choose **Doctor sign in**. Each listed doctor already has a separate user account and doctor profile:

| Doctor | Login email |
|---|---|
| Dr. Jhatka | doctor@example.com |
| Dr. Jagdish Asthana | doctor2@example.com |
| Dr. Emmett Brown | doctor3@example.com |
| Dr. Tsunade | doctor4@example.com |
| Dr. Tony Tony Chopper | doctor5@example.com |
| Dr. John Zoidberg | doctor6@example.com |

Passwords are installation-specific. Startup creates **DOCTOR_LOGINS.md** beside start.sh with names, emails, and matching local demo passwords, using the existing **DEMO_ACCOUNTS.md**. Both files are private and ignored by Git. Startup never resets passwords. If a password was changed by the administrator or its original record is unavailable, the guide instructs you to ask the administrator to reset it through **Accounts**. Newly added doctors use the credentials entered by the administrator; their password is not recoverable from a hash.

## Doctor dashboard

- A distinct green practice workspace with your own portrait, consultation counts, upcoming appointments, and unread alerts.
- **Appointments:** your consultations only; date/status filters; patient information; access to the patient's history where permitted; completion after consultation start; direct appointments Excel download.
- **My patients:** search your assigned patients and inspect their current patient-provided medical histories. Histories are read-only for doctors.
- **Availability:** publish future time intervals, block an unbooked interval, and reopen a blocked interval. Blocked intervals remain visible to you.
- **Leave & unavailable periods:** define a date/time range for leave or a break. Overlapping future slots disappear from public availability and cannot be booked by calling the API directly. Leave creation is rejected if it conflicts with a confirmed appointment; arrange changes with the administrator first. Removing leave restores only otherwise available slots, not manually blocked slots.
- **Excel downloads:** one click downloads a patient register, appointment register, or complete scoped practice workbook.
- **Notifications:** confirmations, appointment changes, upcoming reminders, and relevant patient-history updates; unread badges and mark-all-read. The interface polls every 15 seconds and refreshes on focus; this is not a WebSocket connection or external SMS/email delivery.
- **My profile:** maintain your existing clinician profile.

Doctors have administrative control over their own practice; they do not become global administrators. They cannot book as patients, access another doctor's private patient register, download the full clinic database, or manage other users.

## Patient medical history

After signing in, the patient can choose **Medical history** or use the overview shortcut. Optional fields include date of birth, blood group, allergies, conditions, medications, surgeries/hospitalizations, family history, and other health information. Patients may update or clear their own fields. The UI shows the last update time. Use fictional information for the academic demonstration.

A doctor can view the current history only where a **confirmed or completed** appointment links that doctor and patient. A cancelled-only appointment does not grant history access. If cancellation removes the last qualifying relationship, that patient no longer appears in the doctor's patient register or history export. Multiple doctors may legitimately share the same patient when each has their own qualifying consultation. Doctors never edit the patient's history. Administrators do not gain a new medical-history endpoint through this change.

Backend checks enforce these rules independently of hidden buttons, route redirects, or submitted IDs. Update notifications contain a generic history-changed message, not the medical contents. Historic cancelled appointment responses omit legacy profile notes.

## Excel files

All three doctor exports are fresh, read-only snapshots:

- **My_Patients_Doctor.xlsx:** My Patients sheet, containing only your qualifying patients, contact information, consultation counts, and their shared medical history.
- **My_Appointments_Doctor.xlsx:** your appointment records, including dates/status and simulated payment information. No other doctor's consultations are included.
- **My_Workspace_Doctor.xlsx:** My Patients, My Appointments, My Availability, and My Time Off sheets. The availability sheet records stored slot states; the time-off sheet records overriding unavailable periods.

Formula-like text is escaped. Passwords, sessions, tokens, and other doctors' records are excluded. These doctor downloads are not accepted by the administrator's seven-sheet import tool. The administrator's existing seven-sheet workbook remains compatible and deliberately excludes the new structured medical-history and leave tables. A full database backup preserves those tables. Neither workbook is a live Excel connection; download again after changes.

## Installation and updates

Download the **codex/doctor-workspace** branch, extract it, and run `PORT=8010 bash start.sh` on the Mac. Open http://localhost:8010. Existing instructions still require Python 3.12+ and Node.js 22+.

To keep an older installation: stop it, back up the project, copy its **entire database folder** and **DEMO_ACCOUNTS.md** into the updated source folder, then start the new version. Do not copy a running database. Startup adds the medical_histories and doctor_time_off tables without removing existing accounts, slots, payments, or appointments. It then creates the local doctor login guide if the source credentials file is available. New installations generate their own local credentials.

## Verification

The API suite exercises privacy across doctors/patients, medical-history validation, updates and clearing, generic notification content, cancellation revocation, formula-safe scoped exports, leave overlap/boundaries, booking and import protection, blocked-slot restoration, old-schema upgrades, credential preservation, and local login-guide generation. Browser checks exercise the patient history form, doctor portal and direct downloads, leave controls, live notification refresh, cross-role redirects, desktop/mobile layout, and all pre-existing workflows. See DOCTOR_WORKSPACE_TEST_RESULTS.md for the final run results.
