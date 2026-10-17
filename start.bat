@echo off
cd /d "%~dp0"
where py >nul 2>nul || (echo Install Python 3.12 from python.org & pause & exit /b 1)
where npm >nul 2>nul || (echo Install Node.js 22 LTS from nodejs.org & pause & exit /b 1)
if not exist .venv\Scripts\python.exe py -3.12 -m venv .venv
.venv\Scripts\python.exe -m pip install -r backend\requirements.lock.txt
if errorlevel 1 goto fail
cd frontend
call npm ci
if errorlevel 1 goto fail
call npm run build
if errorlevel 1 goto fail
cd ..
set PYTHONPATH=backend
.venv\Scripts\python.exe -m app.manage init
if errorlevel 1 goto fail
echo Open http://localhost:8000 and read DEMO_ACCOUNTS.md for local logins.
.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
exit /b %errorlevel%
:fail
echo Setup failed. See the error above.
pause
exit /b 1
