#!/bin/bash
# Deploy normal ranges seed to all hospital backends
# Files to copy: normalRanges.ts, importJsonTests.ts, routes/index.ts
# Then compile each backend and restart PM2

HOSPITALS="demohospital cheema-hospital pebs NazirHospital sialkotmedical"
SRC_DIR="/tmp/deploy_src"

mkdir -p $SRC_DIR

for h in $HOSPITALS; do
  echo "=========================================="
  echo "Deploying to: $h"
  echo "=========================================="

  BASE="/var/www/$h"

  # Copy backend seed files
  cp -f $SRC_DIR/normalRanges.ts $BASE/backend/src/modules/lab/seeds/normalRanges.ts
  cp -f $SRC_DIR/importJsonTests.ts $BASE/backend/src/modules/lab/seeds/importJsonTests.ts
  cp -f $SRC_DIR/labTestTemplates.ts $BASE/backend/src/modules/lab/seeds/labTestTemplates.ts

  # Copy backend routes
  cp -f $SRC_DIR/routes_index.ts $BASE/backend/src/modules/lab/routes/index.ts

  # Copy frontend lab_Settings.tsx
  cp -f $SRC_DIR/lab_Settings.tsx $BASE/src/pages/lab/lab_Settings.tsx

  # Compile backend
  echo "Compiling backend for $h..."
  cd $BASE/backend
  npx tsc --noEmitOnError false --outDir dist 2>&1 | tail -2

  # Check if normalRanges.js was compiled
  if [ -f dist/modules/lab/seeds/normalRanges.js ]; then
    echo "  normalRanges.js compiled OK"
  else
    echo "  WARNING: normalRanges.js NOT compiled"
  fi

  echo "Done with $h"
done

echo ""
echo "=========================================="
echo "All files deployed. Now restarting PM2..."
echo "=========================================="
pm2 restart demohospital-backend --silent
pm2 restart cheema-hospital --silent
pm2 restart pebs-backend --silent
pm2 restart nazirhospital-backend --silent
pm2 restart sialkotmedical-backend --silent
echo "All backends restarted."
