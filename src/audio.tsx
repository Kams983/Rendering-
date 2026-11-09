import React from 'react';
import {Audio, Sequence, interpolate, staticFile} from 'remotion';
import {T} from './common';

// Set to true after you drop your ElevenLabs export at public/voiceover.mp3
export const VOICEOVER = false;

type Cue = {f: number; file: string; v: number};
// Scene starts (frames @30fps): 0, 90, 210, 360, 480, 630, 780
const starts = [0, 90, 210, 360, 480, 630, 780];
const s = (n: number) => starts[n - 1];
const cues: Cue[] = [];
const add = (f: number, file: string, v: number) => cues.push({f, file, v});

// Scene cuts: whoosh just before each cut, label pop just after
starts.forEach((st) => {
  add(Math.max(0, st - 4), 'whoosh', 0.5);
  add(st + 2, 'pop', 0.4);
});

// Scene 1: freezer flips to red
add(s(1) + T.s1.flip, 'glitch', 0.6);

// Scene 2: tick on each map flash
for (let i = 0; i < 6; i++) add(s(2) + T.s2.flashStart + i * T.s2.flashStep, 'tick', 0.4);

// Scene 3: alarm when the number passes 0, hit when it locks at 50
add(s(3) + T.s3.pass0, 'alarm', 0.45);
add(s(3) + T.s3.lock, 'hit', 1);

// Scene 4: ESTONIA tag lands
add(s(4) + T.s4.land, 'hit', 0.9);

// Scene 5: tick per country, ding on the final count, blip for the tag
for (let i = 0; i < 5; i++) add(s(5) + T.s5.litStart + i * T.s5.litStep, 'tick', 0.4);
add(s(5) + T.s5.plusAt, 'ding', 0.6);
add(s(5) + T.s5.tagAt, 'blip', 0.35);

// Scene 6: tick per store icon, glitch at the end
for (let i = 0; i < 15; i++) add(s(6) + T.s6.iconStart + i * T.s6.iconStep, 'tick', 0.3);
add(s(6) + T.s6.glitchAt, 'glitch', 0.6);

// Scene 7: riser into f780, hit at f840, ding at f870
add(s(7) - 30, 'riser', 0.7);
add(s(7) + T.s7.dot1, 'blip', 0.3);
add(s(7) + T.s7.dot2, 'blip', 0.3);
add(s(7) + T.s7.hit, 'hit', 1);
add(s(7) + T.s7.ding, 'ding', 0.6);

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
