# New York Wasn't Always New York

A 60-second, vertical 3D Remotion short about Manhattan's transformation. The
composition is 1080x1920 at 30 fps (1800 frames), built with React, TypeScript,
Three.js, and React Three Fiber. The visuals use low-poly geometry only.

## Preview and render

```bash
npm ci
npm run dev
npm run render
```

The local render writes `out/new-york.mp4`. The GitHub Actions workflow runs on
pushes to `main` and manually from the Actions tab; its video is uploaded as the
`new-york-history` artifact.

## Audio

The composition uses the available WAV effects in `public/sfx/`. Adjust
`SFX_VOLUME` in `src/constants.ts` to tune their overall level. Add the final
ElevenLabs recording as `public/voiceover.mp3`, then set `USE_VOICEOVER` to
`true` in the same constants file. `VOICEOVER.txt` contains a suggested script;
time the delivered recording to approximately 60 seconds.

The current sound effects are the WAV files already in this repository, mapped
to the scene cues in `src/NewYorkHistory.tsx`. Swap in scene-specific recordings
there if desired.

## GitHub Actions and FFmpeg

The workflow runs `npm ci`, ensures Remotion's browser, renders with
`--gl=swangle` for software WebGL, and uploads the MP4. No system `ffmpeg`
package needs to be installed; Remotion's renderer manages the FFmpeg binary
through its npm dependencies.

## Assumptions to confirm

- The voiceover is not included yet; provide `public/voiceover.mp3` and confirm
  the narration should fit the full 60-second cut.
- The requested output aspect ratio is portrait 9:16 (1080x1920).
- Existing WAV effects are used as temporary scene cues; provide custom
  scene-named effects if specific recordings are required.
