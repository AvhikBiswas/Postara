#!/usr/bin/env bash
set -euo pipefail

./node_modules/.bin/prisma migrate deploy
if [ "${DEMO_MODE:-false}" = "true" ]; then
  ./node_modules/.bin/tsx prisma/seed.ts || true
fi

if [ "${POSTARA_ROLE:-web}" = "worker" ]; then
  exec ./node_modules/.bin/tsx src/worker.ts
fi

exec node server.js
