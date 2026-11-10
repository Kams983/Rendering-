# You Are Not Behind

30 second vertical (1080x1920, 30fps) growth mindset short.
3D scene built with three.js, rendered with Remotion. Sound effects included.

## Quick start

```bash
npm install
npm run dev        # opens Remotion Studio to preview
```

## Voiceover (ElevenLabs)

1. Paste the text from `VOICEOVER.txt` into ElevenLabs and generate it.
2. Save the file as `public/audio/voiceover.mp3`.
3. In `src/config.ts` set `USE_VOICEOVER = true`.

Aim for about 30 seconds total. If your voiceover runs longer or shorter, retime the
cues in `src/Sfx.tsx` and the caption times in `src/Overlays.tsx` (all times are in seconds).

## Render

Local:

```bash
npm run render     # out/you-are-not-behind.mp4
```

GitHub Actions:

1. Push this repo to GitHub (branch `main`).
2. Go to Actions, pick "Render video", click "Run workflow".
3. When it finishes, download the `you-are-not-behind` artifact. Unzip it for the mp4.

Pushes to `main` that touch `src/`, `public/` or `package.json` also trigger a render.
The CI script uses `--gl=swangle` (software rendering) because GitHub runners have no GPU.

## Sound effects

All SFX are generated in code, so they are royalty free. Regenerate them with:

```bash
pip install numpy scipy
python scripts/generate_sfx.py
```

To use better sounds, drop your own files into `public/audio` with the same file names.

## Timeline

| Time | Scene |
|---|---|
| 0-3s | Small glowing figure far behind taller figures |
| 3-7s | Camera pushes in, thought bubble |
| 7-10s | "yet" lands, figure turns gold |
| 10-14s | Polished gold cards, camera swings behind to the crumpled drafts |
| 14-18s | Figure stumbles, staircase grows |
| 18-23s | Effort, Feedback, Repeat orbit the figure |
| 23-27s | Camera pulls back, figure stands taller on the staircase |
| 27-30s | Black screen, "Not good at this. Yet." |

## Structure

```
src/Scene3D.tsx    3D scene and camera path
src/Overlays.tsx   text captions
src/Sfx.tsx        sound effect timing and voiceover hook
src/config.ts      size, fps, voiceover switch, colors
```
