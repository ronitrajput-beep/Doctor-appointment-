# Aurelia Care — Doctor Appointment Booking System

Working React + FastAPI application for **Ronit Rajput · E052 · CSBS · Division E · Batch 2**.

Patient booking, doctor schedules, administrator management, SQLite persistence, and validated seven-sheet Excel exchange. White-and-gold design with character names and portraits: **Dr. Jhatka (Motu Patlu), Jagdish Asthana (Munna Bhai M.B.B.S.), Emmett Brown (Back to the Future), Tsunade (Naruto), Tony Tony Chopper (One Piece), and John Zoidberg (Futurama)**.

The six original demo doctors have been replaced with character names and portraits. Normal clinic wording, qualifications and biographies are retained. This is an unofficial fictional crossover; specialties, years of experience and fees are demo values rather than claims about the characters. Booking, authentication and Excel exchange work normally.

Existing development databases upgrade the six original demo profiles automatically on startup. IDs, appointment history, payments, accounts and passwords are preserved. Admin-created or renamed doctors are not overwritten, and later edits to the new character profiles survive restarts. Demo upgrades are disabled in production and when `SEED_DEMO=0`.

## Start on your MacBook

1. Install **Python 3.12 or newer** from https://www.python.org/downloads/macos/ and **Node.js 22 LTS or newer** from https://nodejs.org/. Both have Mac installers; no Homebrew is required.
2. Download the repository ZIP **after the application source has been published to GitHub**, and double-click it to extract. The folder must contain `start.sh`, `frontend`, and `backend`. A folder containing only README.md is not the application.
3. Open Terminal. Type `cd ` (including the space), drag the extracted folder into Terminal, then press Return.
4. Run:

   ```bash
   bash start.sh
   ```

5. Wait for `Uvicorn running`, then open **http://localhost:8000** in your Mac browser. Keep Terminal open. Control+C stops the app.
6. Open the newly generated **DEMO_ACCOUNTS.md** inside the project folder to see your local patient, doctor and administrator logins. These are generated passwords, unique to your installation.

The launcher installs dependencies, builds the website, creates fictional sample data once, and serves the frontend and backend together. It preserves existing bookings and accounts on later starts. Internet is needed for initial installation; the running app and locally bundled fonts/images require no paid service.

`Start-Mac.command` is an alternative launcher. If macOS blocks double-clicking a downloaded script or its executable permission was lost during extraction, use the Terminal command above; do not disable macOS security settings.

To use another local port, run `PORT=8010 bash start.sh`, then open `http://localhost:8010`. The backend uses `PORT` for its default local allowed origins. An explicitly configured `ALLOWED_ORIGINS` takes precedence.

## Updating an existing Mac installation

Stop the old app with Control+C and keep a backup of its project folder. Extract the updated download into a separate folder. Copy your **entire `database` folder** and **`DEMO_ACCOUNTS.md`** from the old project into the new folder, replacing its empty database folder, then run `bash start.sh` from the new folder. Do not copy an actively running SQLite database. This keeps your accounts/bookings and automatically upgrades the six original doctor profiles. A fresh installation instead generates fresh local accounts.

## What works

- Registration, password hashing, JWT cookies, logout, role authorization and account deactivation.
- Database-backed doctor search, specialty/date filtering, fee/experience sorting and profiles.
- Available slots, booking review, simulated successful/failed payments, confirmation and persistent appointment history.
- Cancellation/refund and atomic rescheduling with a two-hour cutoff. Double booking is prevented inside SQLite transactions and by a unique index.
- Patient profiles and in-app notifications. Reminders are generated when opening notifications for appointments within the next 24 hours.
- Doctors see only their assigned patients, publish/remove availability, update profiles and complete consultations after their start time.
- Administrators manage doctors, specialties, patient accounts, passwords, appointments, statistics and reports.
- Real Excel export, validation, preview and atomic import of application records.

**Scope:** This is an academic demonstration with fictional patients and clinicians. Payments are explicitly simulated. Email/SMS delivery, real payment gateways, prescriptions, laboratory modules, clinical advice, and production hosting are not provided. This is not an emergency medical service.

## Development

The simplest launcher is `bash start.sh`. To use Vite hot reload, first run setup, then use two terminals in the project folder:

```bash
# Terminal 1
.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

```bash
# Terminal 2
cd frontend
npm run dev
```

Open http://localhost:5173 on your own machine. Vite proxies `/api` to FastAPI. API documentation is at http://localhost:8000/docs. These addresses are local-machine instructions, not remotely accessible cloud preview links.

For manual installation:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.lock.txt
cd frontend
npm ci
npm run build
cd ..
PYTHONPATH=backend .venv/bin/python -m app.manage init
```

Windows: install Python 3.12 and Node.js 22+, then run `start.bat`. The Windows launcher is included but was not executed in this Linux validation environment.

## Database and Excel

SQLite is authoritative at `database/appointments.sqlite3`. The initial workbook is generated at `database/Doctor_Appointment_Database.xlsx`. These local data files are intentionally ignored by Git and generated when you start a source-only download.

1. Sign in as administrator and choose **Excel database → Download workbook**.
2. In Microsoft Excel, keep the seven sheet names, headers, and IDs intact. Dates are text `YYYY-MM-DD`, times are text `HH:MM`, and phone numbers must stay text. Save as `.xlsx`.
3. Select the workbook and click **Validate & preview**. Inspect counts and the first five records of each worksheet. Nothing is saved at this stage.
4. Choose **Apply import**. The server revalidates against current records and commits all changes together. Invalid imports roll back entirely.

Sheets: Users, Patients, Doctors, Availability, Appointments, Payments, Notifications. Password hashes, sessions, tokens and active-account flags are never exported. Import merges by primary key and does not delete absent rows. Ownership and account roles cannot be reassigned. Administrator records cannot be created or edited through Excel. New patient/doctor users require matching profiles and remain inactive until an administrator resets their password. Appointment, slot and simulated payment states must agree. Completed/cancelled appointments cannot be rewritten. Export escapes spreadsheet formulas; upload rejects formulas, macros, excessive file sizes and invalid relationships.

The workbook is an explicit snapshot, not a live Excel connection. Download/export again after web bookings or imports to get the latest workbook.

## Demo and maintenance

The first initialization seeds six doctors, two patients, one administrator, two weeks of future slots, sample appointments and payments. Credentials are generated locally in `DEMO_ACCOUNTS.md`; no default passwords or secrets are committed.

If demonstration slots have expired:

```bash
PYTHONPATH=backend .venv/bin/python -m app.manage demo-slots
```

This adds nonoverlapping future times without changing existing bookings. It is disabled in production.

To create a real administrator on an empty production installation:

```bash
PYTHONPATH=backend .venv/bin/python -m app.manage create-admin
```

Enter the email and a password of at least 12 characters when prompted. Do not put passwords on the command line. To export via CLI: `PYTHONPATH=backend .venv/bin/python -m app.manage export`.

## Verification

```bash
.venv/bin/python -m pytest tests -q --junitxml=docs/test-results.xml
cd frontend
npm run build
# Keep the app running on port 8000 first:
npx playwright install chromium
npm run test:e2e
```

On this cloud machine browser tests use installed Chromium: `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`. They read local credentials and change fictional demo appointments. API tests use isolated temporary databases. See [test evidence](docs/TEST_RESULTS.md) and `screenshots/`.

## Troubleshooting

- **Cannot download the project:** a workspace path in chat is not necessarily a downloadable attachment. Use a verified GitHub branch/commit containing this source. GitHub's green **Code → Download ZIP** works only after the code is actually pushed. Check for `frontend/`, `backend/` and `start.sh` before proceeding.
- **`python3` or `npm` not found:** install the Mac prerequisites and open a new Terminal window.
- **Address already in use:** stop the previous app with Control+C. For another port: `PORT=8001 bash start.sh`, then use port 8001 in your browser.
- **Login fails:** use `DEMO_ACCOUNTS.md` from the same installation. Existing databases are not reseeded. An administrator can reset a patient/doctor password. Do not delete a database with work you need.
- **No appointments available:** run `demo-slots` above, or sign in as a doctor and publish a future time.
- **Excel rejected:** read the validation error. Start from a fresh export, keep dates/phone numbers as text, and do not insert Excel formulas.
- **Blank page after editing source:** run `cd frontend && npm run build`, then restart the backend.
- **Protect your work:** source should be committed and pushed to GitHub. Local Git commits, cloud snapshots, saved setup scripts, and generated ZIP files alone do not prove off-machine persistence.

## Deployment and project structure

See [deployment guide](docs/DEPLOYMENT.md), [architecture](docs/ARCHITECTURE.md), [requirements traceability](REQUIREMENTS_TRACEABILITY.md), and [asset notes](docs/ASSETS.md).

`backend/app/` contains database, authentication, booking, Excel and API modules. `frontend/src/` contains the responsive public site and role dashboards. `tests/` exercises API/business logic. `frontend/tests/` exercises browser workflows. `scripts/package_project.py` creates a clean local ZIP with a consistent database backup and workbook; it excludes dependencies and secrets.
