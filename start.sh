#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v python3 >/dev/null; then
  echo 'Install Python 3.12 or newer from python.org, then run this again.'
  exit 1
fi
if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  echo 'Install Node.js 22 LTS or newer from nodejs.org, then run this again.'
  exit 1
fi
python3 -c 'import sys; assert sys.version_info >= (3, 12), "Python 3.12 or newer is required"'
node -e 'if(Number(process.versions.node.split(".")[0])<22)throw Error("Node.js 22 or newer is required")'
if [ ! -x .venv/bin/python ]; then python3 -m venv .venv; fi
.venv/bin/python -m pip install -r backend/requirements.lock.txt
(cd frontend && npm ci && npm run build)
PYTHONPATH=backend .venv/bin/python -m app.manage init
echo ''
echo "Aurelia Care is starting. Open http://localhost:${PORT:-8000} in your browser."
echo 'Your local account passwords are in DEMO_ACCOUNTS.md in this folder.'
echo 'Doctor names, emails and passwords are also listed in DOCTOR_LOGINS.md.'
echo 'Keep this Terminal window open. Press Control+C to stop.'
exec .venv/bin/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port "${PORT:-8000}"
