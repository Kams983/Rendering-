# How ChatGPT Actually Works

A 64 second vertical 3D explainer about next-token prediction. The composition is
1080x1920 at 30 fps (1920 frames), built with Remotion, `@remotion/three`, `three`,
and `@react-three/fiber`.

The picture is rendered silent by design. The voiceover is added later in a video
editor, and the project renders its sound effects separately as a WAV so they can
sit under that voice.

## What is in this project

| Path | Purpose |
| --- | --- |
| `src/timeline.ts` | Every scene start, scene end, and top caption in seconds. This is the retiming source of truth. |
| `src/config.ts` | Frame rate, duration, quality tiers, palette, system font stack, SFX master gain. |
| `src/Scene3D.tsx` | The whole 3D world: camera, lighting, IBL, shadows, instances, and all 13 scenes. |
| `src/Overlays.tsx` | Top-third captions, the final card, and the CSS vignette. |
| `src/Sfx.tsx` | Every sound cue, timed from `timeline.ts`, with the quiet master gain. |
| `src/Video.tsx` | Composes the 3D layer, overlays, and SFX. |
| `src/Root.tsx` | Registers the picture composition and the audio-only composition. |
| `scripts/generate_sfx.py` | Procedurally generates all 17 WAV effects with numpy and scipy only. |
| `public/audio/` | The generated WAV files. They are committed, so CI does not need Python. |
| `props/` | Quality input props used by the render scripts and the workflow. |
| `.github/workflows/render.yml` | Manual GitHub Actions render with a draft or final choice. |

## Requirements

- Node 20 or newer. The workflow uses Node 20.
- npm, with the committed `package-lock.json`.
- Python 3 with numpy and scipy, only if you want to regenerate the audio. The
  committed WAV files are enough for a normal render.

## Install and typecheck

```bash
npm ci
npm run typecheck
```

All Remotion packages are pinned to the exact same version, 4.0.542. The lockfile
is committed so `npm ci` is reproducible.

## Render commands

| Command | Output |
| --- | --- |
| `npm run render:video` | `out/video-silent.mp4`, picture only, rendered with `--muted` |
| `npm run render:sfx` | `out/sfx.wav`, sound effects only, rendered with `--codec=wav` |
| `npm run render:full` | `out/preview-with-sfx.mp4`, picture with SFX for quick previews |
| `npm run render:draft` | `out/draft.mp4`, 720x1280, no shadows, no contact shadows, fewer instances |
| `npm run render:final` | `out/final.mp4`, 1080x1920 with full shadows and instances |
| `npm run sfx` | Regenerates `public/audio/` from `scripts/generate_sfx.py` |

The draft and final preview scripts read `props/draft.json` and `props/final.json`.
The two delivery pieces are `render:video` and `render:sfx`.

## GitHub Actions workflow

1. Push this folder to a GitHub repository. The workflow lives at
   `.github/workflows/render.yml`.
2. Open the repository on GitHub and go to the **Actions** tab.
3. Select **Render How ChatGPT Actually Works** and click **Run workflow**.
4. Choose a quality. The input defaults to `final`. Pick `draft` for a much faster
   test render.
5. Wait for the job. The timeout is 240 minutes.
6. Open the completed run and scroll to the **Artifacts** section at the bottom of
   the run summary. Download **video-files**.

The artifact is one zip containing:

- `video-silent.mp4`
- `sfx.wav`

The workflow checks out the repo, sets up Node 20, runs `npm ci`, runs
`npm run typecheck`, renders the silent picture with `--muted --gl=swangle`, renders
the sound effects with `--codec=wav --gl=swangle`, and uploads both files together.
It uses no hardcoded concurrency flag.

## Add the voice in an editor

1. Create a 1080x1920, 30 fps timeline.
2. Import `out/video-silent.mp4` as the picture.
3. Import `out/sfx.wav` at 00:00. Keep this track under the voice. The project
   master gain is `0.35`, so the effects are already quiet.
4. Record or import one voice clip per line, then place each clip at its start time
   from the table below. The picture scenes start slightly before each line so the
   visual has time to arrive.
5. Do not add spoken-word subtitles. The top-third keyword captions are intentional.
6. Mix the voice above the effects, and export H.264 at 1080x1920 and 30 fps.

### Voice windows

| Line | Start | End | Top caption in the picture |
| --- | --- | --- | --- |
| 1 | 0.3 | 2.4 | ChatGPT doesn't think. It predicts. |
| 2 | 2.5 | 6.3 | One piece at a time. |
| 3 | 6.5 | 11.1 | Tokens. |
| 4 | 11.3 | 15.1 | No caption during the question split |
| 5 | 15.3 | 20.3 | Which token is next? |
| 6 | 20.5 | 26.7 | Again. And again. |
| 7 | 26.9 | 33.9 | Trained on huge amounts of text. |
| 8 | 34.1 | 42.6 | Transformer: it weighs every word. |
| 9 | 42.9 | 48.2 | Tuned by human ratings. |
| 10 | 48.5 | 53.5 | Sounds right, not true. |
| 11 | 53.7 | 57.5 | Confident. Still wrong. |
| 12 | 57.7 | 61.9 | A fast assistant, not a source of truth. |
| 13 | 62.1 | 64.0 | That's how ChatGPT actually works. |

Line 4 has no top caption because the supplied caption list did not include one.
If you want one, add it to the `question` scene in `src/timeline.ts`.

## Retiming

Edit `SCENES` in `src/timeline.ts`. Each entry is:

```ts
{ id: "tokens", start: 6.4, end: 11.2, caption: "Tokens." }
```

The 3D scene switch, top captions, and sound cue times all read from this array.
The sound cue list in `src/Sfx.tsx` is derived from scene starts, so moving a scene
also moves its pops, ticks, snaps, and swells. Internal beats such as the crack
spreading or the winner glowing are relative offsets inside each scene.

## Quality tiers

| Setting | Draft | Final |
| --- | --- | --- |
| Resolution | 720x1280 | 1080x1920 |
| Directional shadows | Off | On, 2048 shadow map |
| Contact shadows | Off | On, 512 resolution |
| Instances | 50 percent | 100 percent |
| Environment map | 96 px | 256 px |

Bloom and the 3D vignette were removed after the swangle still check described below.
The CSS vignette and the emissive materials carry the look instead.

`src/config.ts` exports `QUALITY = "final"` as the default. A render can override it
with `--props=props/draft.json` or `--props=props/final.json`. The workflow passes the
selected file to Remotion.

## Sound design

All 17 effects are synthesised by `scripts/generate_sfx.py` using numpy and scipy.
Nothing is downloaded. The files are:

`bass_hit`, `chime`, `crack`, `ding`, `dissonant`, `hum`, `key_click`, `pop`,
`riser`, `rush`, `shimmer`, `snap`, `thud`, `tick`, `typing`, `warm_swell`, `whoosh`.

`SFX_MASTER_VOLUME` in `src/config.ts` is `0.35`. Sustained cues use lower source
levels and cue volumes, keeping every sustained effect below an effective peak of
0.25 so the voice can sit on top. Short transients are also kept quiet.

Regenerate the files with:

```bash
npm run sfx
```

You only need to do this if you change the sound design. The WAV files are already
committed for CI and for editing.

## Offline and deterministic

- Every animation is driven by `useCurrentFrame`. There is no `useFrame`, no real
  time clock, and no local storage.
- No fonts, textures, models, or HDRIs are loaded from a CDN.
- Text labels are drawn to canvas textures at runtime with the system font stack in
  `src/config.ts`.
- Image-based lighting uses `Environment` with custom `Lightformer` panels. If a
  valid Radiance file is present at `public/hdri/studio.hdr`, it is loaded with
  `staticFile()` automatically. Remove that file to fall back to the light panels.
- The final render uses one directional light with a 2048 shadow map,
  `ContactShadows`, `MeshPhysicalMaterial` with clearcoat, and `RoundedBox` tokens
  with a 0.06 radius.
- The tile streams, attention nodes, and attention links use `InstancedMesh`, so
  hundreds of objects do not become hundreds of draw calls.
- `@react-three/postprocessing` 3.2.2 was tested inside the Remotion `ThreeCanvas`
  at 1080x1920 with swangle. The EffectComposer produced a blank 3D canvas on the
  attention frame, so Bloom and the 3D Vignette were removed. The packages
  `@react-three/postprocessing` and `postprocessing` are no longer dependencies.
  The CSS vignette in `Overlays.tsx` and the emissive materials with additive
  halos carry the glow instead.

## Project structure

```text
.
├── .github/workflows/render.yml
├── props/
│   ├── draft.json
│   └── final.json
├── public/
│   └── audio/            (17 generated WAV files)
├── scripts/
│   └── generate_sfx.py
├── src/
│   ├── config.ts
│   ├── timeline.ts
│   ├── Scene3D.tsx
│   ├── Overlays.tsx
│   ├── Sfx.tsx
│   ├── Video.tsx
│   ├── Root.tsx
│   └── index.ts
├── package.json
├── package-lock.json
├── remotion.config.ts
├── tsconfig.json
└── README.md
```

## Common fixes

- If a custom HDR fails to load, delete `public/hdri/studio.hdr`. The Lightformer
  environment is used automatically.
- If a final render is too slow on a laptop, use the draft quality for timing and
  layout checks, then run the final quality for delivery.
- Linux, Windows, and macOS resolve the system font stack differently. The stack
  ends in `sans-serif`, so the layout stays stable without any downloaded font.
