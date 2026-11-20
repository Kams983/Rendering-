# 5 Beginner Coding Mistakes That Cost Me Hours

A 47 second vertical 3D short. One persistent "code universe" in a single
`<ThreeCanvas>`, one camera that flies between eight locations, no cuts.
1080×1920, 60 fps, 2820 frames.

Built with Remotion 4, React Three Fiber, drei and
`@react-three/postprocessing`. Picture and sound are generated from the frame
number only: no clocks, no `Math.random`, no real-time physics.

## Quick start

```bash
npm install
npm run typecheck
npm run dev          # Remotion Studio
```

The previous project's files are preserved in `archive/previous-project/`.

## Structure

```
src/
  index.ts                  registerRoot
  Root.tsx                  <Composition /> 1080×1920 · 60 fps · 2820 frames
  config.ts                 FPS=60, S=FPS/30, palette, QUALITY tiers
  World.tsx                 audio + scene + HUD + subtitles
  fonts.css                 local Inter Black / JetBrains Mono
  scene/
    timeline.ts             8 locations, camera keys, captions, travel
    Scene.tsx               the single <ThreeCanvas>, font gate, motion blur
    CameraRig.tsx           CatmullRom flight, shake, FOV punches, 360 orbit
    Props.tsx               desk, IDE, error chips, tiles, copy stack, beacon
    Caption3D.tsx           extruded Text3D captions with spring slam-in
    CodePanel.tsx           glass monitor + live CanvasTexture IDE
    drawCode.ts             syntax highlighting, typing reveal, squiggles
    Keyboard.tsx            procedural PBR keyboard, frame-synced key travel
    Timer.tsx               neon 00:15 → 03:00 odometer
    CubeSwarm.tsx           instanced glitch cubes, detonate/reform
    Particles.tsx           instanced sparks / debris, stepped ballistics
    Magnifier.tsx           holographic wireframe detective lens
    Checkmark.tsx           self-drawing tube checkmark
    ScreenTear.tsx          raw ShaderMaterial screen-tear overlay
    Lights.tsx              procedural Environment softboxes + pulse lights
    Floor.tsx               MeshReflectorMaterial, Grid, neon rails, shadows
    Post.tsx                N8AO, DoF focus pull, Bloom, CA, Glitch, grain
  sfx/cues.ts               every cue, authored at 30 fps × S
  sfx/useSfxImpact.ts       decaying impact / error / slam / bass signals
  sfx/SfxTrack.tsx          cue playback, missing-file skip, ducking
  voice/voiceCues.ts        8 VO clips, durations, word timings
  voice/VoiceTiming.tsx     getAudioDurationInSeconds in delayRender
  voice/VoiceTrack.tsx      VO at 1.0
  voice/useVoiceEnergy.ts   visualizeAudio on the active clip
  voice/Subtitles.tsx       word-level subtitles (SHOW_SUBTITLES)
  hud/HUD.tsx               small 2D HUD, scanlines, flashes, blackout
scripts/generate-audio.ts   deterministic WAV synthesiser
public/sfx/*.wav            30 generated SFX / beds
public/music.wav            50 s seamless music bed
public/voice/vo-*.mp3       pre-generated narration
public/fonts/               Helvetiker 3D font, Inter Black, JetBrains Mono
```

## Timing rule

Cue frames are written at a 30 fps reference and multiplied by `S = FPS / 30`.
`src/config.ts` exports `FPS = 60` and `S = 2`; `src/sfx/cues.ts` and
`src/scene/timeline.ts` are the only files that hold reference frames.
Changing `FPS` rescales every cue.

Caption slams land on the cue frames in `SLAM_FRAMES`: 60 (3 HOURS), 130
(READ THE ERROR), 360, 600, 840, 1080, 1115 and 1395.

## Sound

All SFX and music are synthesised locally. No downloads, no libraries, no
network:

```bash
npm run gen-audio
```

`scripts/generate-audio.ts` uses a seeded mulberry32 PRNG, biquad filters,
ADSR/exponential envelopes, tanh distortion, bitcrushing, feedback-delay
reverb and a 16-bit PCM WAV encoder. Running it twice produces identical
files. `npm run render:preview` and `npm run render:final` run it first.

Mix: voice 1.0; SFX 0.35–0.6 ducked to ×0.35 while narration plays; ambient
hum and music at 0.15, ducked by −6 dB. SFX files that are missing at render
time log a warning and are skipped; a missing VO clip fails the render with
its filename.

## Render commands

Preview (half resolution, reduced post, 2 motion-blur samples):

```bash
npx remotion render src/index.ts CodingMistakes3D out/preview.mp4 \
  --gl=angle --concurrency=2 --scale=0.5 --props=props/preview.json
```

Final:

```bash
npx remotion render src/index.ts CodingMistakes3D out/final.mp4 \
  --gl=angle --concurrency=1 --scale=1.5 --crf=16 --props=props/final.json
```

Hero segments, then concat (`npm run render:segments` does this):

```bash
npx remotion render src/index.ts CodingMistakes3D out/seg-01.mp4 --frames=0-179    --gl=angle --concurrency=1 --scale=1.5 --crf=16 --props=props/final.json
npx remotion render src/index.ts CodingMistakes3D out/seg-02.mp4 --frames=180-479  --gl=angle --concurrency=1 --scale=1.5 --crf=16 --props=props/final.json
npx remotion render src/index.ts CodingMistakes3D out/seg-03.mp4 --frames=480-899  --gl=angle --concurrency=1 --scale=1.5 --crf=16 --props=props/final.json
npx remotion render src/index.ts CodingMistakes3D out/seg-04.mp4 --frames=900-1319 --gl=angle --concurrency=1 --scale=1.5 --crf=16 --props=props/final.json
npx remotion render src/index.ts CodingMistakes3D out/seg-05.mp4 --frames=1320-1739 --gl=angle --concurrency=1 --scale=1.5 --crf=16 --props=props/final.json
npx remotion render src/index.ts CodingMistakes3D out/seg-06.mp4 --frames=1740-2219 --gl=angle --concurrency=1 --scale=1.5 --crf=16 --props=props/final.json
npx remotion render src/index.ts CodingMistakes3D out/seg-07.mp4 --frames=2220-2639 --gl=angle --concurrency=1 --scale=1.5 --crf=16 --props=props/final.json
npx remotion render src/index.ts CodingMistakes3D out/seg-08.mp4 --frames=2640-2819 --gl=angle --concurrency=1 --scale=1.5 --crf=16 --props=props/final.json

printf "file '%s'\n" out/seg-*.mp4 > out/segments.txt
ffmpeg -y -f concat -safe 0 -i out/segments.txt -c copy out/final.mp4
```

## Quality tiers

`preview` drops path tracing entirely (it is not in this build), uses 800
particles, 180 cubes, no shadows/DoF/AO, lower DPR and one motion-blur sample.
`final` uses 2,500 particles, 420 cubes, shadows, contact shadows,
transmission glass, reflective floor, N8AO, animated DoF, 6 motion-blur
samples and 1.5 DPR.

## Deliberate deviations

- **Path tracing / three-gpu-pathtracer** is not enabled. It cannot run inside a
  deterministic Remotion frame at 256 samples without a GPU bake, so hero
  frames use the raster pipeline with a strong bloom/DoF/grade instead.
- **three.quarks / rapier / three-pinata** are replaced by analytic,
  frame-stepped instanced particles. The motion is baked per frame, which is
  the determinism requirement, and it removes a large runtime dependency.
- **AccumulativeShadows** is omitted; ContactShadows plus a shadow-casting key
  light keep the scene deterministic.
- **CameraMotionBlur** is capped at 6 samples. Each sample is its own WebGL
  canvas, and 16 copies of a 1080×1920 scene would exhaust GPU memory. Set
  `motionBlurSamples` to 1 in `QUALITY_SETTINGS.final` for a strict
  single-`<ThreeCanvas>` build with no temporal blur.
- **troika/glTF/KTX2 assets** are not used. All text is offline Text3D and all
  surfaces are procedural, so the project renders with no network access.
- The eight supplied VO clips are longer than their scene slots (measured:
  3.79 s, 8.99 s, 7.39 s, 12.51 s, 7.81 s, 12.20 s, 6.27 s, 3.40 s). They are
  placed on the specified start frames exactly, so consecutive clips overlap
  where the narration runs past its scene. Trim the MP3s or move the start
  frames in `src/voice/voiceCues.ts` if you want strict one-clip-per-scene.
