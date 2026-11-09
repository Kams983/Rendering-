import React from 'react';
import {Audio, Sequence, interpolate, staticFile} from 'remotion';

// Set to true after you drop your ElevenLabs export at public/voiceover.mp3
export const VOICEOVER = false;

type Cue = {f: number; file: string; v: number};
// Scene starts (frames @30fps): 0, 90, 270, 480, 690, 840
const starts = [0, 90, 270, 480, 690, 840];
const cues: Cue[] = [];
const add = (f: number, file: string, v: number) => cues.push({f, file, v});

// Scene cuts: whoosh just before each cut, label pop just after
starts.forEach((s, i) => {
  add(Math.max(0, s - 4), 'whoosh', 0.5);
  if (i < 5) add(s + 2, 'pop', 0.4);
});

// Scene 1: FAKE? stamp, then REAL. stamp
add(26, 'hit', 0.8);
add(56, 'glitch', 0.5);
add(58, 'hit', 1);
add(60, 'ding', 0.35);

// Scene 2: page lines draw in, URL types out
for (let i = 0; i < 6; i++) add(110 + i * 10, 'blip', 0.3);
for (let k = 0; k < 17; k++) add(124 + k * 2, 'key', k % 3 === 0 ? 0.4 : 0.3);

// Scene 3: tag drops and bounces, year ticks up, locks
add(282, 'hit', 0.9);
add(296, 'hit', 0.35);
for (let k = 0; k < 24; k++) add(294 + k * 2, 'tick', 0.22);
add(341, 'ding', 0.6);
add(365, 'ding', 0.5);

// Scene 4: camera shutter on the coffee pot
[492, 552, 612, 672].forEach((f) => add(f, 'shutter', 0.35));

// Scene 5: letters flip Google to BackRub
add(752, 'glitch', 0.6);

// Scene 6: spheres converge, impact, "Part 2 tomorrow"
add(840, 'riser', 0.7);
add(910, 'hit', 1);
add(928, 'ding', 0.6);

export const Sfx: React.FC<{total: number}> = ({total}) => (
  <>
    <Audio
      src={staticFile('sfx/bed.wav')}
      volume={(f) => interpolate(f, [0, 30, total - 45, total], [0, 0.1, 0.1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
    />
    {cues.map((c, i) => (
      <Sequence key={i} from={c.f} layout="none">
        <Audio src={staticFile(`sfx/${c.file}.wav`)} volume={c.v} />
      </Sequence>
    ))}
    {VOICEOVER ? (
      <Sequence from={6} layout="none">
        <Audio src={staticFile('voiceover.mp3')} volume={1} />
      </Sequence>
    ) : null}
  </>
);
