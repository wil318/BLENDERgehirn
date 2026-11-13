#!/usr/bin/env bash
# Lokaler Blender-Build (Alternative zum Cloud-Build in GitHub Actions).
# Aufruf:  ./build.sh            → Modell + Cycles-Rendering + Icons
#          ./build.sh --no-render → nur Modell (schnell, ≈ 20 s)
# Blender-Pfad überschreibbar:  BLENDER=/opt/blender/blender ./build.sh
set -euo pipefail
cd "$(dirname "$0")"
BLENDER="${BLENDER:-blender}"
"$BLENDER" --version | head -1
"$BLENDER" -b --factory-startup --python-exit-code 1 --python blender/build_brain.py -- "$@"
ls -la web/models web/img web/icons
