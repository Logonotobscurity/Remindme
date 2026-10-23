#!/bin/sh
set -eu
cd /workspace
# :8081 is QA-only — a revive must never inherit a stale built-output preview.
node scripts/preview.mjs stop || true
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
if [ -f .env.local ]; then
  set -a
  # Local only. The file is gitignored and must not be committed.
  . ./.env.local
  set +a
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
