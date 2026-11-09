import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {C, Caption, Label, Lights, MONO, SANS, Scene, clamp} from './common';

const Canvas: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {width, height} = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} camera={{position: [0, 0, 9], fov: 45}}>
      <Lights />
      {children}
    </ThreeCanvas>
  );
};

/* ---------- Scene 1: hook ---------- */
const Grid: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <group position={[0, -2.4, (f * 0.14) % 1]}>
      <gridHelper args={[40, 40, C.cyan, '#0c4a5c']} />
    </group>
  );
};
const Core: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 12}});
  return (
    <mesh position={[0, 1.6, 0]} rotation={[f * 0.02, f * 0.03, 0]} scale={s * 0.8}>
      <icosahedronGeometry args={[1.5, 1]} />
      <meshStandardMaterial color={C.cyan} wireframe emissive={C.cyan} emissiveIntensity={0.9} />
    </mesh>
  );
};
export const S1: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fake = f < 58;
  const start = fake ? 26 : 58;
  const sp = spring({frame: f - start, fps, config: {damping: 10, stiffness: 220}});
  return (
    <Scene dur={dur}>
      <Canvas><Grid /><Core /></Canvas>
      <Label text="INTERNET FACTS" />
      <div style={{position: 'absolute', top: 960, width: '100%', display: 'flex', justifyContent: 'center'}}>
        <div style={{
          fontFamily: SANS, fontWeight: 900, fontSize: 130, color: fake ? C.red : C.green,
          border: `10px solid ${fake ? C.red : C.green}`, padding: '0 40px', borderRadius: 18,
          transform: `rotate(-6deg) scale(${interpolate(sp, [0, 1], [2.6, 1])})`,
          opacity: interpolate(sp, [0, 0.3], [0, 1], clamp),
        }}>{fake ? 'FAKE?' : 'REAL.'}</div>
      </div>
      <Caption title="These 4 internet facts sound fake." />
    </Scene>
  );
};

/* ---------- Scene 2: first website ---------- */
const BrowserWindow: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame: f, fps, config: {damping: 16}});
  const lines = [2.4, 2.0, 2.6, 1.6, 2.2, 1.2];
  return (
    <group scale={0.9 * enter} rotation={[0.08, Math.sin(f / 40) * 0.3, 0]} position={[0, 0.7, 0]}>
      <mesh><boxGeometry args={[3.4, 2.4, 0.12]} /><meshStandardMaterial color="#e8eef7" /></mesh>
      <mesh position={[0, 1.0, 0.07]}><boxGeometry args={[3.4, 0.4, 0.05]} /><meshStandardMaterial color="#2d3a4b" /></mesh>
      {[C.red, C.amber, C.green].map((c, i) => (
        <mesh key={i} position={[-1.45 + i * 0.2, 1.0, 0.11]}><sphereGeometry args={[0.07, 16, 16]} /><meshStandardMaterial color={c} /></mesh>
      ))}
      {lines.map((w, i) => {
        const p = spring({frame: f - 20 - i * 10, fps, config: {damping: 200}});
        return (
          <mesh key={i} position={[-1.5 + (w * p) / 2, 0.5 - i * 0.3, 0.07]}>
            <boxGeometry args={[w * p + 0.001, 0.12, 0.04]} /><meshStandardMaterial color="#1b2430" />
          </mesh>
        );
      })}
    </group>
  );
};
export const S2: React.FC<{dur: number}> = ({dur}) => (
  <Scene dur={dur}>
    <Canvas><BrowserWindow /></Canvas>
    <Label text="FACT 1" />
    <Caption title="The first website is still online." sub="A restored copy lives at info.cern.ch" />
  </Scene>
);

/* ---------- Scene 3: first domain ---------- */
const DomainTag: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const drop = spring({frame: f - 6, fps, config: {damping: 8, stiffness: 90}});
  const y = interpolate(drop, [0, 1], [7, 1.35]);
  return (
    <>
      <group position={[0, y, 0]} rotation={[0.1, Math.sin(f / 35) * 0.35, 0]}>
        <mesh><boxGeometry args={[3.0, 1.3, 0.2]} /><meshStandardMaterial color={C.amber} /></mesh>
        <mesh position={[0, 0, 0.12]}><boxGeometry args={[2.6, 0.9, 0.05]} /><meshStandardMaterial color="#1b2430" /></mesh>
        <mesh position={[-1.25, 0.4, 0.12]}><torusGeometry args={[0.1, 0.04, 12, 24]} /><meshStandardMaterial color={C.amber} /></mesh>
      </group>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = f * 0.03 + i * 1.2566;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.9, 1.35 + Math.sin(a * 2) * 0.3, Math.sin(a) * 1.2]} rotation={[a, a, 0]}>
            <boxGeometry args={[0.25, 0.25, 0.25]} /><meshStandardMaterial color={C.cyan} />
          </mesh>
        );
      })}
    </>
  );
};
export const S3: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const year = Math.round(interpolate(f, [24, 70], [1960, 1985], clamp));
  const still = spring({frame: f - 95, fps, config: {damping: 12}});
  return (
    <Scene dur={dur}>
      <Canvas><DomainTag /></Canvas>
      <Label text="FACT 2" />
      <div style={{position: 'absolute', top: 850, width: '100%', textAlign: 'center'}}>
        <div style={{fontFamily: MONO, fontWeight: 800, fontSize: 150, color: C.amber}}>{year}</div>
        <div style={{fontFamily: MONO, fontWeight: 800, fontSize: 44, letterSpacing: 6, color: C.green, opacity: still, transform: `scale(${still})`}}>STILL REGISTERED</div>
      </div>
      <Caption title="The first domain ever is still registered." sub="symbolics.com, bought in 1985" />
    </Scene>
  );
};

/* ---------- Scene 4: coffee pot webcam ---------- */
const CoffeePot: React.FC = () => {
  const f = useCurrentFrame();
  const h = interpolate(f, [10, 100], [0.25, 1.4], clamp);
  const blink = f % 30 < 15 ? 3 : 0.1;
  return (
    <>
      <group position={[0, 0.5, 0]} rotation={[0, f * 0.012 + 0.5, 0]}>
        <mesh position={[0, -0.9, 0]}><cylinderGeometry args={[1.1, 1.2, 0.2, 32]} /><meshStandardMaterial color="#222c3a" /></mesh>
        <mesh><cylinderGeometry args={[0.8, 0.9, 1.6, 32]} /><meshStandardMaterial color="#9fd8ff" transparent opacity={0.25} /></mesh>
        <mesh position={[0, -0.8 + h / 2, 0]} scale={[1, h, 1]}><cylinderGeometry args={[0.76, 0.84, 1, 32]} /><meshStandardMaterial color="#6b3d1c" emissive="#2a1507" /></mesh>
        <mesh position={[1.0, 0, 0]}><torusGeometry args={[0.45, 0.08, 16, 32]} /><meshStandardMaterial color="#222c3a" /></mesh>
        <mesh position={[0, 0.86, 0]}><cylinderGeometry args={[0.85, 0.8, 0.12, 32]} /><meshStandardMaterial color="#222c3a" /></mesh>
      </group>
      <group position={[-1.5, -0.1, 0.2]} rotation={[0, 2.13, 0]} scale={0.6}>
        <mesh position={[0, -0.45, 0]}><cylinderGeometry args={[0.06, 0.06, 0.7, 12]} /><meshStandardMaterial color="#8b98ad" /></mesh>
        <mesh><boxGeometry args={[0.9, 0.6, 0.6]} /><meshStandardMaterial color="#e8eef7" /></mesh>
        <mesh position={[0, 0, 0.4]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.2, 0.3, 20]} /><meshStandardMaterial color="#111" /></mesh>
        <mesh position={[0.3, 0.36, 0]}><sphereGeometry args={[0.07, 12, 12]} /><meshStandardMaterial color={C.red} emissive={C.red} emissiveIntensity={blink} /></mesh>
      </group>
    </>
  );
};
export const S4: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  return (
    <Scene dur={dur}>
      <Canvas><CoffeePot /></Canvas>
      <Label text="FACT 3" />
      <div style={{position: 'absolute', top: 330, right: 80, fontFamily: MONO, fontWeight: 800, fontSize: 40, color: C.red, opacity: f % 30 < 20 ? 1 : 0.25}}>● LIVE</div>
      <Caption title="The first webcam watched a coffee pot." sub="Cambridge researchers built it to check if there was coffee before walking over." />
    </Scene>
  );
};

/* ---------- Scene 5: BackRub ---------- */
const COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];
const Orbit: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <mesh position={[0, 0.9, 0]} rotation={[f * 0.015, f * 0.02, 0]}>
        <icosahedronGeometry args={[0.9, 1]} />
        <meshStandardMaterial color={C.cyan} wireframe emissive={C.cyan} emissiveIntensity={0.6} />
      </mesh>
      {Array.from({length: 8}).map((_, i) => {
        const a = f * 0.04 + (i * Math.PI) / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.7, 0.9 + Math.sin(a * 1.5) * 0.5, Math.sin(a) * 1.0]}>
            <sphereGeometry args={[0.28, 24, 24]} />
            <meshStandardMaterial color={COLORS[i % 4]} emissive={COLORS[i % 4]} emissiveIntensity={0.4} />
          </mesh>
        );
      })}
    </>
  );
};
export const S5: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const intro = spring({frame: f - 8, fps, config: {damping: 14}});
  const p = spring({frame: f - 64, fps, config: {damping: 12}});
  const letters = ['G', 'o', 'o', 'g', 'l', 'e'];
  const lc = ['#4285F4', '#EA4335', '#FBBC05', '#4285F4', '#34A853', '#EA4335'];
  return (
    <Scene dur={dur}>
      <Canvas><Orbit /></Canvas>
      <Label text="FACT 4" />
      <div style={{position: 'absolute', top: 1010, width: '100%', height: 200, fontFamily: SANS, fontWeight: 900, fontSize: 170, textAlign: 'center', opacity: intro}}>
        <div style={{opacity: 1 - p, transform: `scale(${1 - p * 0.3})`}}>
          {letters.map((l, i) => <span key={i} style={{color: lc[i]}}>{l}</span>)}
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, opacity: p, transform: `scale(${0.7 + 0.3 * p})`, color: C.text}}>BackRub</div>
      </div>
      <Caption title="Google was originally called BackRub." />
    </Scene>
  );
};

/* ---------- Scene 6: outro ---------- */
const Converge: React.FC = () => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, 70], [1, 0], clamp);
  const pulse = 1 + Math.sin(f / 5) * 0.05;
  return (
    <>
      {Array.from({length: 12}).map((_, i) => {
        const a = f * 0.05 + (i * Math.PI) / 6;
        const r = 2.0 * t * t;
        return (
          <mesh key={i} position={[Math.cos(a) * r, 0.9 + Math.sin(a) * r * 0.6, Math.sin(a) * r * 0.5]}>
            <sphereGeometry args={[0.22, 20, 20]} />
            <meshStandardMaterial color={COLORS[i % 4]} emissive={COLORS[i % 4]} emissiveIntensity={0.5} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.9, 0]} scale={(1 - t) * 1.6 * pulse}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={C.cyan} wireframe emissive={C.cyan} emissiveIntensity={1} />
      </mesh>
    </>
  );
};
export const S6: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const a = interpolate(f, [6, 20, 62, 72], [0, 1, 1, 0], clamp);
  const b = spring({frame: f - 70, fps, config: {damping: 14}});
  const c = spring({frame: f - 88, fps, config: {damping: 10, stiffness: 160}});
  return (
    <Scene dur={dur}>
      <Canvas><Converge /></Canvas>
      <div style={{position: 'absolute', left: 80, right: 80, top: 1050, textAlign: 'center', fontFamily: SANS, fontWeight: 800, fontSize: 70, lineHeight: 1.2, color: C.text, opacity: a}}>
        And you thought your first project was embarrassing.
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1030, textAlign: 'center', fontFamily: SANS, fontWeight: 800, fontSize: 80, color: C.text, opacity: b, transform: `scale(${b})`}}>
        Follow for more.
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1180, textAlign: 'center', fontFamily: MONO, fontWeight: 800, fontSize: 64, color: C.cyan, opacity: c, transform: `scale(${c})`}}>
        Part 2 tomorrow.
      </div>
    </Scene>
  );
};
