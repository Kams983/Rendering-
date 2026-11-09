import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {C} from './common';
import {S1, S2, S3, S4, S5, S6} from './scenes';
import {Sfx} from './audio';

const SCENES = [
  {C: S1, d: 90}, {C: S2, d: 180}, {C: S3, d: 210},
  {C: S4, d: 210}, {C: S5, d: 150}, {C: S6, d: 120},
];
export const TOTAL = SCENES.reduce((s, x) => s + x.d, 0);

export const Main: React.FC = () => {
  const f = useCurrentFrame();
  const {width} = useVideoConfig();
  let start = 0;
  return (
    <AbsoluteFill style={{background: C.bg}}>
      {SCENES.map((s, i) => {
        const from = start;
        start += s.d;
        const Comp = s.C;
        return (
          <Sequence key={i} from={from} durationInFrames={s.d}>
            <Comp dur={s.d} />
          </Sequence>
        );
      })}
      <Sfx total={TOTAL} />
      <div style={{position: 'absolute', top: 120, left: 70, height: 8, width: (width - 140) * (f / TOTAL), background: C.cyan, borderRadius: 4}} />
    </AbsoluteFill>
  );
};
