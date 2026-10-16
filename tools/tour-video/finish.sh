#!/usr/bin/env bash
# The last mile, once batch.mjs has finished.
#
#   bash tools/tour-video/finish.sh
#
# Publishes every rendered clip into the handbook with a poster frame, checks
# that nothing a page asks for is missing, and builds the docs site.
set -euo pipefail
cd "$(dirname "$0")"

echo "── publishing clips ──────────────────────────────────────────────"
node publish.mjs

echo
echo "── checking every referenced clip exists ─────────────────────────"
node ../docs-shots/check-clips.mjs

echo
echo "── building the handbook ─────────────────────────────────────────"
cd ../../apps/docs
npx vitepress build

echo
echo "done. Preview it with: npx vitepress preview --port 5199 -w apps/docs"
