# Why You Can't Stop Scrolling

A 64 second vertical product film about the infinite scroll loop. The picture is a
real-time 3D scene built in React Three Fiber, rendered with Remotion at 1080x1920,
30 fps. The phone, the feed cards and every texture are generated in code. There are
no downloaded assets and no voice track: the render ships silent picture plus a
separate sound effect bed, so you can drop your voiceover on top in your editor.

## Requirements

- Node 18 or newer (the CI workflow uses Node 20).
- Python 3 with numpy and scipy, only if you want to regenerate the sound effects.
- Nothing else. There is no HDRI, font, model or texture download anywhere.

## Quick start

```bash
npm ci
npm run typecheck
npm run dev        # Remotion Studio, optional, not used by CI
```

## Quality tiers

`src/config.ts` exports `QUALITY` plus the presets. A render picks a tier through a
props file, so the same composition serves both.

| Tier | Size | Look |
| --- | --- | --- |
| `draft` | 720x1280 | No shadows, bloom, depth of field or transmission, fewer instances. Fast preview. |
| `final` | 1080x1920 | Everything on: post-processing, IBL, 2048 shadow map, contact shadows, transmission glass, reflective floor. |

## Render scripts

| Script | What it does | Output |
| --- | --- | --- |
| `npm run render:video` | Picture only, `--muted` | `out/video-silent.mp4` |
| `npm run render:sfx` | Sound effects only, `--codec=wav` | `out/sfx.wav` |
| `npm run render:full` | Picture with the SFX baked in, preview only | `out/preview-with-sfx.mp4` |
| `npm run render:draft` | Draft picture quality | `out/draft.mp4` |
| `npm run render:final` | Final picture quality | `out/final.mp4` |

All render commands use `--gl=swangle` so they behave the same locally and on a
runner without a GPU. No concurrency is hardcoded.

## GitHub Actions workflow

The only workflow is `.github/workflows/render.yml`. It runs on `workflow_dispatch`
only.

1. Open the repository on GitHub, go to **Actions**, pick **Render Why You Can't Stop
   Scrolling** on the left, then **Run workflow**.
2. Choose the `quality` input. `final` is the default (1080x1920). Pick `draft` when
   you only want a fast timing check at 720x1280.
3. Start the run. It checks out the repository, sets up Node 20, runs `npm ci`, runs
   `npm run typecheck`, renders the silent picture, renders the sound effects, and
   uploads both files as one artifact.
4. The job has a 240 minute timeout.

### Where the files are

Open the finished run and scroll to the **Artifacts** section at the bottom of the
run summary page. Download **video-files**. It contains:

- `video-silent.mp4`: the picture, no audio at all.
- `sfx.wav`: 64 seconds of sound effects, already quiet enough to sit under a voice.

Individual files can also be downloaded from the run's file list, but the artifact is
the intended bundle.

## Adding the voice in an editor

1. Start a 1080x1920, 30 fps timeline and drop in `video-silent.mp4`.
2. Add `sfx.wav` on its own track, aligned to frame 0. Keep it at unity gain: it is
   already mixed to roughly 0.35 master level so it leaves room for a voice.
3. Place one voice clip per line at the start times below. Do not stretch the film to
   fit the voice. If a line runs long, trim it, do not retime the picture.

| Line | Scene | Voice start (s) | Voice end (s) |
| --- | --- | --- | --- |
| 1 | THE NEXT ONE | 0.3 | 2.4 |
| 2 | WHAT COMES NEXT? | 2.5 | 6.3 |
| 3 | MAYBE THIS ONE | 6.5 | 11.1 |
| 4 | UNPREDICTABLE REWARD | 11.3 | 15.1 |
| 5 | UNCERTAINTY MATTERS | 15.3 | 20.3 |
| 6 | DOPAMINE ISN'T JOY | 20.5 | 26.7 |
| 7 | WANTING THE NEXT REWARD | 26.9 | 33.9 |
| 8 | NO STOPPING POINT | 34.1 | 42.6 |
| 9 | ANOTHER REASON TO CHECK | 42.9 | 48.2 |
| 10 | MORE SCROLLING, MORE BOREDOM | 48.5 | 53.5 |
| 11 | ONE MORE SWIPE | 53.7 | 57.5 |
| 12 | CREATE A STOPPING CUE | 57.7 | 61.9 |
| 13 | BREAK THE LOOP | 62.1 | 64.0 |

Useful mix notes:

- No voice is baked into any render. `video-silent.mp4` is muted, `sfx.wav` is
  effects only.
- Nothing sustained exceeds 0.25 of full scale during a voice window, so you should
  not need to duck the bed.
- The last second is a held still frame with a soft decay, so a final voice line can
  ring out without being cut off.

## Retiming

`src/timeline.ts` is the single source of truth. It holds `SCENES`, an array of
`{ id, start, end, caption }` in seconds, and `VOICE_WINDOWS` for reference. Every
scene, caption fade and sound cue is derived from those times:

- `src/Scene3D.tsx` switches scenes and drives every animation from scene local time.
- `src/Overlays.tsx` renders captions in the top third, faded and rising on entry.
- `src/Sfx.tsx` builds its cue table from `sceneStart(id)` plus small offsets.

To change a scene length, edit its `start` and `end` values only. Everything else
follows, including the audio cues. If you move a scene start, the voice table in this
README is the only thing that needs updating by hand.

## Sound effects

`scripts/generate_sfx.py` synthesizes every effect with numpy and scipy and writes the
wav files into `public/audio`. Nothing is sampled or downloaded.

```bash
npm run sfx
```

The generated wav files are committed, so `npm ci` plus a render is enough. Python is
not needed in CI. Files:

`low_hit`, `swish`, `dull_swipe`, `chime`, `tick`, `flash`, `pulse_hum`, `swell`,
`tunnel`, `ping`, `glass_tap`, `timer_tick`, `decay`.

Cue times live in one constants array at the top of `src/Sfx.tsx`, all expressed as
scene start plus offset.

## Project layout

```
src/config.ts        Quality tiers, palette, frame rate, master SFX gain
src/timeline.ts      Scene array with ids, start, end, caption, plus voice windows
src/Scene3D.tsx      Camera, lights, environment, post-processing and the 13 scenes
src/Phone.tsx        Code-built phone, procedural screen texture, glass barrier
src/Cards.tsx        Procedural card art, abstract symbols, instanced card streams
src/Overlays.tsx     Captions, lens vignette, grade
src/Sfx.tsx          Cue table that plays the procedural wav files
src/Video.tsx        Composition that stacks 3D, overlays and sound
src/Root.tsx         Registers the video composition and the audio-only composition
src/index.ts         Remotion entry point
scripts/generate_sfx.py
public/audio          Generated wav files
props                 draft.json and final.json quality props
```

## Look and technical notes

- Hero object: rounded glass and brushed metal phone, 0.08 body radius, dark glass
  front with a slightly emissive procedural screen and a two lens camera bump.
- Feed cards: rounded glass tiles with clearcoat bodies and emissive procedural faces,
  abstract icons and blank caption bars, no readable text anywhere.
- Lighting: drei `Environment` with white, cyan and gold `Lightformer` panels, plus one
  directional light with a 2048 shadow map and `ContactShadows`. If you drop a file at
  `public/hdri/studio.hdr`, it is picked up automatically through `staticFile`.
- Post: `EffectComposer multisampling={0}` with Bloom 0.7 at 0.6 threshold and mipmap
  blur, timeline-driven DepthOfField, Vignette and Noise grain.
- Instancing: card streams, the tunnel and the dust are all single instanced or points
  draws, not hundreds of meshes.
- Transmission is used only on the phone glass and the scene 12 barrier, since it is
  expensive. The cards use clearcoat and emissive faces instead.
- Animation is frame driven through `useCurrentFrame` only. There is no `useFrame`, no
  `useAnimations`, no real time clock and no `localStorage` anywhere in `src`.
- Text is system font only (`-apple-system`, Segoe UI, Roboto and fallbacks). Captions
  are keywords, not subtitles.
- No people, faces, hands or fingers appear at any point.

## Troubleshooting

- If the final render is slow on a laptop, use `draft` while you check timing. The
  final tier renders transmission glass, depth of field and a reflective floor, which
  cost real time under software GL.
- If a render complains about a missing browser, run `npx remotion browser ensure`
  once. GitHub's runners download it on the first render automatically.
- If you add `public/hdri/studio.hdr`, keep it small. The lightformer rig is the
  default and needs no file at all.
