#!/usr/bin/env bash
# Verification pass. Renders stills only — never the full video.
#
#   npm run verify:stills
#
# 1. measures the voice clips (report mode: overlong clips are listed, not fatal)
# 2. prints scene / voice start / voice end / caption frame and the frame list
# 3. renders one PNG at the first frame of every scene and every caption slam
# 4. scans those PNGs for near-black frames
set -euo pipefail

node scripts/prepare-voice.ts --allow-overflow
node scripts/still-frames.ts

mkdir -p out/stills
while read -r FRAME; do
  [ -z "$FRAME" ] && continue
  echo "→ still frame $FRAME"
  npx remotion still src/index.ts CodingMistakes3D "out/stills/frame-${FRAME}.png" \
    --frame="$FRAME" \
    --gl=swangle \
    --scale=0.5 \
    --props=props/preview.json
done < out/stills/frames.txt

node scripts/check-black-frames.ts out/stills
