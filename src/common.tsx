import React from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

export const C = {
  bg: '#070b14', cyan: '#00e5ff', amber: '#ffb703', green: '#2ee6a6',
  red: '#ff4d6d', text: '#f4f7fb', dim: '#9aa8bf', slate: '#1b2a4a',
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

export const Caption: React.FC<{title: string; sub?: string; typed?: boolean; mono?: boolean; subAt?: number}> = ({title, sub, typed, mono, subAt}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = title.split(' ');
  const subStart = subAt ?? 34;
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

// ---------- shared helpers for the freezer video ----------
export {clamp};
export const FPS = 30;
// pixels per world unit at z=0 with the camera at z=9, fov 45 (visible half-width is about 2.1)
export const K = 1920 / (2 * 9 * Math.tan(Math.PI / 8));
export const toPx = (x: number, y: number): [number, number] => [540 + x * K, 960 - y * K];

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
export const rnd = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};
export const lerpColor = (a: string, b: string, t: number) =>
  '#' + new THREE.Color(a).lerp(new THREE.Color(b), clamp01(t)).getHexString();
// cyan, then amber, then red
export const heat = (t: number) =>
  t < 0.5 ? lerpColor(C.cyan, C.amber, t * 2) : lerpColor(C.amber, C.red, (t - 0.5) * 2);
export const shake = (frame: number, start: number, dur: number, amp: number) => {
  if (frame < start) return {x: 0, y: 0};
  const k = clamp01(1 - (frame - start) / dur);
  return {x: (rnd(frame * 1.7) - 0.5) * 2 * amp * k, y: (rnd(frame * 2.3 + 9) - 0.5) * 2 * amp * k};
};

// Local-frame timing of visual events. src/audio.tsx turns these into sound cues.
export const T = {
  s1: {flip: 10},
  s2: {flashStart: 16, flashStep: 13},
  s3: {countStart: 20, countEnd: 100, pass0: 41, lock: 100},
  s4: {drop: 10, land: 24},
  s5: {litStart: 14, litStep: 14, plusAt: 84, tagAt: 100},
  s6: {iconStart: 12, iconStep: 5, glitchAt: 100},
  s7: {dot1: 8, dot2: 38, travelStart: 36, travelEnd: 58, hit: 60, ding: 90},
} as const;

// HTML text centered on a world coordinate (z=0)
export const WorldText: React.FC<{x: number; y: number; children: React.ReactNode; style?: React.CSSProperties}> = ({x, y, children, style}) => {
  const [px, py] = toPx(x, y);
  return (
    <div style={{position: 'absolute', left: px, top: py, transform: 'translate(-50%, -50%)', whiteSpace: 'nowrap', textAlign: 'center', ...style}}>
      {children}
    </div>
  );
};

type Vec3 = [number, number, number];

export const Freezer: React.FC<{
  color: string; position?: Vec3; scale?: number; rotationY?: number; glow?: number; displayColor?: string;
}> = ({color, position = [0, 0, 0], scale = 1, rotationY = 0, glow = 0.45, displayColor}) => {
  const door = lerpColor(color, '#0a1224', 0.55);
  return (
    <group position={position} scale={scale} rotation={[0, rotationY, 0]}>
      <mesh>
        <boxGeometry args={[1.6, 2.2, 0.9]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} roughness={0.45} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0, 0.46]}>
        <boxGeometry args={[1.46, 2.06, 0.04]} />
        <meshStandardMaterial color={door} emissive={color} emissiveIntensity={glow * 0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.1, 0.49]}>
        <boxGeometry args={[1.46, 0.035, 0.02]} />
        <meshStandardMaterial color="#04070d" />
      </mesh>
      <mesh position={[0.58, -0.45, 0.56]}>
        <boxGeometry args={[0.08, 0.7, 0.1]} />
        <meshStandardMaterial color="#dfe9f5" roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[-0.62, -1.16, 0]}>
        <boxGeometry args={[0.2, 0.1, 0.5]} />
        <meshStandardMaterial color="#0a1224" />
      </mesh>
      <mesh position={[0.62, -1.16, 0]}>
        <boxGeometry args={[0.2, 0.1, 0.5]} />
        <meshStandardMaterial color="#0a1224" />
      </mesh>
      {displayColor ? (
        <mesh position={[0, 0.6, 0.505]}>
          <planeGeometry args={[1.3, 0.6]} />
          <meshStandardMaterial color="#03060c" emissive={displayColor} emissiveIntensity={0.3} />
        </mesh>
      ) : null}
    </group>
  );
};

export const StoreIcon: React.FC<{position: Vec3; scale?: number; color: string; glow?: number}> = ({position, scale = 1, color, glow = 0.5}) => (
  <group position={position} scale={scale}>
    <mesh position={[0, -0.02, 0]}>
      <boxGeometry args={[0.38, 0.26, 0.26]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} roughness={0.5} />
    </mesh>
    <mesh position={[0, 0.16, 0]}>
      <boxGeometry args={[0.46, 0.07, 0.32]} />
      <meshStandardMaterial color={lerpColor(color, '#ffffff', 0.35)} emissive={color} emissiveIntensity={glow * 0.6} />
    </mesh>
    <mesh position={[0, -0.06, 0.135]}>
      <boxGeometry args={[0.1, 0.14, 0.01]} />
      <meshStandardMaterial color="#04070d" />
    </mesh>
  </group>
);

export const HeatParticles: React.FC<{frame: number; since: number; baseY: number}> = ({frame, since, baseY}) => {
  const t = Math.max(0, frame - since);
  return (
    <>
      {Array.from({length: 8}).map((_, i) => {
        const life = ((t * 0.03 + i * 0.113) % 0.9) / 0.9;
        return (
          <mesh key={i} position={[(i - 3.5) * 0.17, baseY + life * 0.9, 0.2]}>
            <sphereGeometry args={[0.05 + 0.03 * (1 - life), 12, 12]} />
            <meshBasicMaterial color={C.red} transparent opacity={0.9 * (1 - life)} />
          </mesh>
        );
      })}
    </>
  );
};
