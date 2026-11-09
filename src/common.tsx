import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

export const C = {
  bg: '#070b14', cyan: '#00e5ff', amber: '#ffb703', green: '#2ee6a6',
  red: '#ff4d6d', text: '#f4f7fb', dim: '#9aa8bf',
};
export const SANS = "Inter, 'Segoe UI', Roboto, Arial, sans-serif";
export const MONO = "'JetBrains Mono', Consolas, 'Courier New', monospace";
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const Scene: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8, dur - 8, dur], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: o, background: `radial-gradient(circle at 50% 35%, #12203d 0%, ${C.bg} 72%)`}}>
      {children}
    </AbsoluteFill>
  );
};

export const Label: React.FC<{text: string}> = ({text}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f - 2, fps, config: {damping: 14}});
  return (
    <div style={{position: 'absolute', top: 210, width: '100%', display: 'flex', justifyContent: 'center'}}>
      <div style={{
        fontFamily: MONO, fontWeight: 800, fontSize: 46, letterSpacing: 8, color: C.bg,
        background: C.cyan, padding: '10px 36px', borderRadius: 14,
        transform: `scale(${p})`,
      }}>{text}</div>
    </div>
  );
};

export const Caption: React.FC<{title: string; sub?: string; typed?: boolean; mono?: boolean}> = ({title, sub, typed, mono}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = title.split(' ');
  const subStart = 34;
  const shown = typed && sub ? sub.slice(0, Math.max(0, Math.floor((f - subStart) * 1.1))) : sub;
  const subOpacity = interpolate(f, [subStart - 4, subStart + 6], [0, 1], clamp);
  return (
    <div style={{position: 'absolute', left: 70, right: 70, bottom: 430, textAlign: 'center'}}>
      <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 78, lineHeight: 1.12, color: C.text}}>
        {words.map((w, i) => {
          const p = spring({frame: f - 6 - i * 3, fps, config: {damping: 200}});
          return (
            <span key={i} style={{display: 'inline-block', marginRight: 18, opacity: p, transform: `translateY(${(1 - p) * 30}px)`}}>{w}</span>
          );
        })}
      </div>
      {sub ? (
        <div style={{
          marginTop: 28, opacity: subOpacity, color: mono ? C.cyan : C.dim,
          fontFamily: mono ? MONO : SANS, fontSize: mono ? 52 : 44, fontWeight: mono ? 700 : 500, lineHeight: 1.3,
        }}>
          {shown}{typed && f % 20 < 10 ? '|' : ''}
        </div>
      ) : null}
    </div>
  );
};

export const Lights: React.FC = () => (
  <>
    <ambientLight intensity={0.7} />
    <directionalLight position={[3, 5, 5]} intensity={2.2} />
    <pointLight position={[-4, 2, 3]} intensity={30} color={C.cyan} />
  </>
);
export {clamp};
