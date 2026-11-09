import React from 'react';
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {
  C, Caption, FPS, Freezer, HeatParticles, Label, Lights, MONO, Scene, StoreIcon, T, WorldText,
  clamp, clamp01, heat, lerpColor, rnd, shake,
} from './common';

const Canvas: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {width, height} = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} camera={{position: [0, 0, 9], fov: 45}}>
      <Lights />
      {children}
    </ThreeCanvas>
  );
};

const pop = (frame: number, damping = 12) => spring({frame, fps: FPS, config: {damping, stiffness: 180}});

/* ---------- Scene 1: freezer flips from cyan to red with a glitch shake ---------- */
export const S1: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const {flip} = T.s1;
  const g = f - flip;
  let color: string = C.cyan;
  if (g >= 0 && g < 8) color = rnd(f * 3.1) > 0.5 ? C.red : C.cyan;
  else if (g >= 8) color = C.red;
  const sk = shake(f, flip, 30, 0.12);
  const bob = Math.sin(f / 12) * 0.03;
  return (
    <Scene dur={dur}>
      <Canvas>
        <group position={[sk.x, 0.35 + bob + sk.y, 0]}>
          <Freezer color={color} rotationY={Math.sin(f / 25) * 0.3} glow={g >= 0 ? 0.7 : 0.45} />
          {g >= 8 ? <HeatParticles frame={f} since={flip + 8} baseY={1.2} /> : null}
        </group>
      </Canvas>
      <Label text="BREAKING" />
      <Caption title="Hackers heated freezers" />
    </Scene>
  );
};

/* ---------- Map of six flat blocks (used by scenes 2 and 5) ---------- */
type Block = {id: string; x: number; y: number; w: number; h: number};
const BLOCKS: Block[] = [
  {id: 'SE', x: 0.35, y: 1.2, w: 0.9, h: 1.3},
  {id: 'EE', x: 1.45, y: 0.95, w: 0.75, h: 0.5},
  {id: 'IE', x: -1.35, y: 0.5, w: 0.6, h: 0.9},
  {id: 'NL', x: -0.3, y: 0.2, w: 0.62, h: 0.5},
  {id: 'BE', x: -0.3, y: -0.4, w: 0.62, h: 0.5},
  {id: 'LU', x: 0.5, y: -0.45, w: 0.5, h: 0.45},
];

type MapProps = {frame: number; litAt: (id: string) => number; scale: number; offsetY: number};

const MapBlocks: React.FC<MapProps> = ({frame, litAt, scale, offsetY}) => (
  <group position={[0, offsetY, 0]} scale={scale}>
    {BLOCKS.map((b) => {
      const g = frame - litAt(b.id);
      const lit = g >= 0;
      const color = lit ? lerpColor(C.amber, C.red, g / 8) : C.slate;
      const em = lit ? 0.5 + 0.9 * Math.exp(-g / 5) : 0.08;
      const z = lit ? 0.12 * Math.exp(-g / 6) : 0;
      return (
        <group key={b.id} position={[b.x, b.y, z]}>
          <mesh>
            <boxGeometry args={[b.w, b.h, 0.18]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={em} roughness={0.55} />
          </mesh>
          {lit ? <StoreIcon position={[0, 0.08, 0.155]} scale={0.5 * pop(g, 10)} color={C.text} glow={0.35} /> : null}
        </group>
      );
    })}
  </group>
);

const MapLabels: React.FC<MapProps> = ({frame, litAt, scale, offsetY}) => (
  <>
    {BLOCKS.map((b) => (
      <WorldText
        key={b.id}
        x={b.x * scale}
        y={(b.y - 0.13) * scale + offsetY}
        style={{
          fontFamily: MONO, fontWeight: 800, fontSize: 26, letterSpacing: 2,
          color: frame >= litAt(b.id) ? C.text : 'rgba(160,185,220,0.55)',
        }}
      >
        {b.id}
      </WorldText>
    ))}
  </>
);

/* ---------- Scene 2: map blocks flash on one by one ---------- */
export const S2: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const order = ['SE', 'BE', 'LU', 'IE', 'EE', 'NL'];
  const litAt = (id: string) => {
    const i = order.indexOf(id);
    return i < 0 ? 9999 : T.s2.flashStart + i * T.s2.flashStep;
  };
  return (
    <Scene dur={dur}>
      <Canvas>
        <MapBlocks frame={f} litAt={litAt} scale={1} offsetY={0.15} />
      </Canvas>
      <MapLabels frame={f} litAt={litAt} scale={1} offsetY={0.15} />
      <Label text="EUROPE" />
      <Caption title="Europe, November 2026" />
    </Scene>
  );
};

/* ---------- Scene 3: display counts from -18 to 50, color shifts to red ---------- */
export const S3: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const {countStart, countEnd, lock} = T.s3;
  const raw = -18 + 68 * clamp01((f - countStart) / (countEnd - countStart));
  const v = Math.round(raw);
  const color = heat(clamp01((raw + 18) / 68));
  const sk = shake(f, lock, 40, 0.07);
  const tremor = f > lock + 40 ? Math.sin(f * 2.3) * 0.008 : 0;
  const pulse = f >= lock ? 1 + 0.06 * Math.exp(-(f - lock) / 6) : 1;
  const dx = sk.x + tremor;
  const baseY = 0.4;
  return (
    <Scene dur={dur}>
      <Canvas>
        <group position={[dx, baseY + sk.y, 0]} scale={pulse}>
          <Freezer color={color} displayColor={color} glow={0.55} />
        </group>
      </Canvas>
      <WorldText
        x={dx}
        y={baseY + 0.6 * pulse + sk.y}
        style={{fontFamily: MONO, fontWeight: 800, fontSize: 84, color, textShadow: `0 0 24px ${color}`}}
      >
        {v}°C
      </WorldText>
      <Label text="ICA SWEDEN" />
      <Caption title="Set to 50°C" />
    </Scene>
  );
};

/* ---------- Scene 4: ESTONIA tag drops onto the freezer and bounces ---------- */
const dropY = (t: number, start: number, land: number) => {
  const fall = 14;
  if (t < fall) return start - (start - land) * Math.pow(Math.max(0, t) / fall, 2);
  const u = t - fall;
  if (u < 12) return land + 0.45 * 4 * (u / 12) * (1 - u / 12);
  const w = u - 12;
  if (w < 8) return land + 0.15 * 4 * (w / 8) * (1 - w / 8);
  return land;
};

export const S4: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const {drop, land} = T.s4;
  const t = f - drop;
  const tagY = dropY(t, 2.25, 1.32);
  const sk = shake(f, land, 16, 0.05);
  const baseY = 0.1;
  const squash = f >= land && f < land + 5 ? 0.85 : 1;
  return (
    <Scene dur={dur}>
      <Canvas>
        <group position={[sk.x, baseY + sk.y, 0]}>
          <Freezer color={C.red} displayColor={C.red} glow={0.7} />
        </group>
        {t >= 0 ? (
          <group position={[0, tagY, 0.7]} scale={[1, squash, 1]}>
            <mesh>
              <boxGeometry args={[1.7, 0.44, 0.1]} />
              <meshStandardMaterial color={C.amber} emissive={C.amber} emissiveIntensity={0.5} />
            </mesh>
          </group>
        ) : null}
      </Canvas>
      <WorldText
        x={sk.x}
        y={baseY + 0.6 + sk.y}
        style={{fontFamily: MONO, fontWeight: 800, fontSize: 84, color: C.red, textShadow: `0 0 24px ${C.red}`}}
      >
        50°C
      </WorldText>
      {t >= 0 ? (
        <WorldText x={0} y={tagY} style={{fontFamily: MONO, fontWeight: 800, fontSize: 46, letterSpacing: 4, color: '#0b1226'}}>
          ESTONIA
        </WorldText>
      ) : null}
      <Label text="ALSO HIT" />
      <Caption title="Estonia was hit too" />
    </Scene>
  );
};

/* ---------- Scene 5: five countries light up, counter reaches 5+ ---------- */
export const S5: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const {litStart, litStep, plusAt, tagAt} = T.s5;
  const order = ['SE', 'EE', 'NL', 'IE', 'BE'];
  const litAt = (id: string) => {
    const i = order.indexOf(id);
    return i < 0 ? 9999 : litStart + i * litStep;
  };
  const count = order.filter((id) => f >= litAt(id)).length;
  const plusP = pop(f - plusAt, 8);
  const tagP = pop(f - tagAt, 12);
  return (
    <Scene dur={dur}>
      <Canvas>
        <MapBlocks frame={f} litAt={litAt} scale={0.9} offsetY={0.75} />
      </Canvas>
      <MapLabels frame={f} litAt={litAt} scale={0.9} offsetY={0.75} />
      <WorldText x={0} y={-0.45} style={{fontFamily: MONO, fontWeight: 800, fontSize: 130, color: C.cyan, textShadow: `0 0 28px ${C.cyan}`}}>
        {count}
        <span
          style={{
            display: 'inline-block', color: C.amber, opacity: clamp01(plusP * 1.5),
            transform: `scale(${plusP})`, textShadow: `0 0 28px ${C.amber}`,
          }}
        >
          +
        </span>
      </WorldText>
      {f >= tagAt ? (
        <WorldText
          x={0}
          y={-0.92}
          style={{
            fontFamily: MONO, fontWeight: 800, fontSize: 40, color: C.amber,
            border: `2px solid ${C.amber}`, background: 'rgba(255,183,3,0.12)', borderRadius: 14,
            padding: '12px 26px', opacity: clamp01(tagP * 1.5),
            transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * tagP})`,
          }}
        >
          CARREFOUR BE: 15 stores
        </WorldText>
      ) : null}
      <Label text="SPREADING" />
      <Caption title="At least five countries" />
    </Scene>
  );
};

/* ---------- Scene 6: 15 store icons turn red one by one, a few stay green ---------- */
export const S6: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const {iconStart, iconStep, glitchAt} = T.s6;
  const g = f - glitchAt;
  const glitching = g >= 0 && g < 14;
  const lit = (i: number) => f - (iconStart + i * iconStep);
  const hit = Array.from({length: 15}).filter((_, i) => lit(i) >= 0).length;
  return (
    <Scene dur={dur}>
      <Canvas>
        {Array.from({length: 15}).map((_, i) => {
          const k = lit(i);
          let color: string = k >= 0 ? lerpColor(C.green, C.red, k / 5) : C.green;
          if (glitching && rnd(f * 7 + i) > 0.6) color = C.text;
          const s = k >= 0 ? 1 + 0.35 * Math.exp(-k / 4) : 1;
          const jx = glitching ? (rnd(f * 5 + i) - 0.5) * 0.12 : 0;
          return (
            <StoreIcon
              key={i}
              position={[-1.24 + (i % 5) * 0.62 + jx, 1.3 - Math.floor(i / 5) * 0.6, 0]}
              scale={s}
              color={color}
              glow={k >= 0 ? 0.9 : 0.45}
            />
          );
        })}
        <mesh position={[0, -0.25, 0]}>
          <boxGeometry args={[3.2, 0.012, 0.01]} />
          <meshBasicMaterial color={C.cyan} transparent opacity={0.4} />
        </mesh>
        {Array.from({length: 5}).map((_, j) => (
          <StoreIcon key={j} position={[-1.24 + j * 0.62, -0.7, 0]} scale={0.8} color={C.green} glow={0.5} />
        ))}
      </Canvas>
      <WorldText
        x={glitching ? (rnd(f) - 0.5) * 0.1 : 0}
        y={-1.15}
        style={{fontFamily: MONO, fontWeight: 800, fontSize: 56, color: C.red, textShadow: `0 0 20px ${C.red}`}}
      >
        {hit} HIT
      </WorldText>
      <Label text="BELGIUM" />
      <Caption title="15 Carrefour stores hit" />
    </Scene>
  );
};

/* ---------- Scene 7: timeline, freezer loops back to red, "Part 2 tomorrow." ---------- */
export const S7: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const {dot1, dot2, travelStart, travelEnd, hit, ding} = T.s7;
  const lineP = interpolate(f, [dot1 + 6, dot2], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const d1 = pop(f - dot1, 10);
  const d2 = pop(f - dot2, 10);
  const x = interpolate(f, [travelStart, travelEnd], [-1.2, 1.2], {...clamp, easing: Easing.inOut(Easing.cubic)});
  let color: string = C.cyan;
  if (f >= 18 && f < 36) color = C.red;
  else if (f >= 36 && f < 50) color = lerpColor(C.red, C.cyan, (f - 36) / 14);
  else if (f >= 50 && f < hit) color = lerpColor(C.cyan, C.red, (f - 50) / 10);
  else if (f >= hit) color = C.red;
  const sk = shake(f, hit, 18, 0.05);
  const labelStyle: React.CSSProperties = {
    fontFamily: MONO, fontWeight: 700, fontSize: 30, color: C.text, width: 290, whiteSpace: 'normal', lineHeight: 1.25,
  };
  return (
    <Scene dur={dur}>
      <Canvas>
        <group position={[-1.2, 1.25, 0]} scale={[Math.max(lineP, 0.0001), 1, 1]}>
          <mesh position={[1.2, 0, 0]}>
            <boxGeometry args={[2.4, 0.04, 0.04]} />
            <meshBasicMaterial color={C.cyan} />
          </mesh>
        </group>
        <mesh position={[-1.2, 1.25, 0.05]} scale={d1}>
          <sphereGeometry args={[0.13, 24, 24]} />
          <meshStandardMaterial color={C.amber} emissive={C.amber} emissiveIntensity={0.9} />
        </mesh>
        <mesh position={[1.2, 1.25, 0.05]} scale={d2}>
          <sphereGeometry args={[0.13, 24, 24]} />
          <meshStandardMaterial color={C.red} emissive={C.red} emissiveIntensity={0.9} />
        </mesh>
        <Freezer color={color} position={[x + sk.x, -0.1 + sk.y, 0]} scale={0.5} glow={0.6} />
      </Canvas>
      <WorldText x={-1.15} y={0.82} style={{...labelStyle, opacity: clamp01(d1)}}>France, last month</WorldText>
      <WorldText x={1.15} y={0.82} style={{...labelStyle, opacity: clamp01(d2)}}>Europe, now</WorldText>
      <Label text="TIMELINE" />
      <Caption title="France was hit first" sub="Part 2 tomorrow." mono subAt={ding} />
    </Scene>
  );
};
