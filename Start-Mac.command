#!/usr/bin/env bash
cd "$(dirname "$0")"
bash ./start.sh
result=$?
if [ "$result" -ne 0 ]; then
  echo 'Startup did not complete. See the error above.'
  read -r -p 'Press Return to close this window.'
fi
exit "$result"
