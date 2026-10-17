#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m venv .venv
.venv/bin/python -m pip install --cache-dir /workspace/pip-cache -r backend/requirements.lock.txt
(cd frontend && npm ci --cache /workspace/npm-cache && npm run build)
PYTHONPATH=backend .venv/bin/python -m app.manage init
