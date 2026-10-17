#!/usr/bin/env bash
# Render everything, retrying what fails, then publish and build.
#
#   bash tools/tour-video/run-until-done.sh
#
# batch.mjs renders whatever is not already in out/ and carries on past a
# failure, so running it again picks up exactly the clips that failed. Most
# failures are the dev server being slow under load, which a second attempt
# usually clears. Three passes, then stop and report rather than loop forever.
#
# Needs the API on :3001 and the web app on :3002.
set -uo pipefail
cd "$(dirname "$0")"

for port in 3001 3002; do
  if ! curl -s -o /dev/null --max-time 10 "http://localhost:$port"; then
    echo "nothing answering on :$port — start the dev servers first:"
    echo "  npm run dev -w @kairos/api"
    echo "  npm run dev -w @kairos/web"
    exit 1
  fi
done

for pass in 1 2 3; do
  left=$(node batch.mjs --plan | sed -n 's/.*, \([0-9]*\) to do/\1/p')
  if [ "${left:-0}" -eq 0 ]; then
    echo "pass $pass: nothing left to render"
    break
  fi
  echo "═══ pass $pass: $left to render ═══"
  node batch.mjs
done

left=$(node batch.mjs --plan | sed -n 's/.*, \([0-9]*\) to do/\1/p')
if [ "${left:-0}" -gt 0 ]; then
  echo
  echo "WARNING: $left clips still unrendered after three passes."
  echo "The handbook will publish without them; run this again to retry."
fi

# publish.mjs skips anything written in the last minute, so let the last
# render settle before handing over.
sleep 90
bash ./finish.sh
