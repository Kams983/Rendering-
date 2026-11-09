# Internet Facts video (Remotion + three.js)

Vertical 1080x1920, 30fps, 32 seconds. Sound effects and a quiet background bed are built in.

## Run
    npm install
    npm start          # live preview (turn sound on in the studio)
    npm run render     # outputs out/internet-facts.mp4

If your GPU handles WebGL fine, change --gl=swangle to --gl=angle in package.json for faster renders.

## Sound
- All effects are synthesized by scripts/make_sfx.py into public/sfx. Re-run it with `python3 scripts/make_sfx.py` after editing.
- Cue timing (which sound plays on which frame) is in src/audio.tsx.
- Commit the public/ folder, otherwise the GitHub Actions render will have no audio.
- To bake the voiceover in: save the ElevenLabs export as public/voiceover.mp3 and set VOICEOVER = true in src/audio.tsx. The bed sits at 10 percent volume so it will not fight the voice.

## Edit
- Text and scene timing: src/scenes.tsx and the SCENES list in src/Main.tsx (durations in frames, 30 per second)
