#!/bin/sh
set -e
cd /app
# Create/verify schema, then seed demo data on first boot (SEED=1 default).
npx prisma db push --skip-generate
if [ "${SEED:-1}" = "1" ]; then
  npx tsx prisma/seed.ts || echo "seed skipped/failed (db may already be seeded)"
fi
exec npx next start -p 3000
