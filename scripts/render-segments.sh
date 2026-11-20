#!/usr/bin/env bash
# Render the 47s short in eight segments, then concatenate.
# Usage: npm run render:segments
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f public/sfx/text-slam.wav ] || [ ! -f public/music.wav ]; then
  echo "Sound design missing — synthesising…"
  npm run gen-audio
fi

mkdir -p out/segments

render () {
  local name="$1"
  local frames="$2"
  echo "→ $name ($frames)"
  npx remotion render src/index.ts CodingMistakes3D "out/segments/$name.mp4" \
    --frames="$frames" \
    --gl=angle \
    --concurrency=1 \
    --scale=1.5 \
    --crf=16 \
    --props=props/final.json
}

render 01-hook       0-179
render 02-error      180-479
render 03-one-thing  480-899
render 04-copy       900-1319
render 05-typo       1320-1739
render 06-ask        1740-2219
render 07-payoff     2220-2639
render 08-end        2640-2819

cd out/segments
printf "file '%s'\n" 01-hook.mp4 02-error.mp4 03-one-thing.mp4 04-copy.mp4 \
  05-typo.mp4 06-ask.mp4 07-payoff.mp4 08-end.mp4 > list.txt

ffmpeg -y -f concat -safe 0 -i list.txt -c copy ../final-segmented.mp4
echo "Done: out/final-segmented.mp4"
