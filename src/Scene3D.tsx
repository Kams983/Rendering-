import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { COLORS } from "./config";

type V3 = [number, number, number];

/* ---------- helpers ---------- */

const rand = (i: number, s = 1) => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** clamped, eased 0..1 progress between two times (seconds) */
const prog = (t: number, a: number, b: number, easing = Easing.inOut(Easing.cubic)) =>
  interpolate(t, [a, b], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

/** overshoot pop, 0 -> ~1 */
const pop = (t: number, a: number, d = 0.5) =>
  prog(t, a, a + d, Easing.out(Easing.back(1.8)));

/** Catmull-Rom through keyframes, so camera moves stay smooth */
const sample = (keys: [number, V3][], t: number): V3 => {
  if (t <= keys[0][0]) return keys[0][1];
  if (t >= keys[keys.length - 1][0]) return keys[keys.length - 1][1];
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const [t1, p1] = keys[i];
  const [t2, p2] = keys[i + 1];
  const p0 = keys[Math.max(0, i - 1)][1];
  const p3 = keys[Math.min(keys.length - 1, i + 2)][1];
  const u = (t - t1) / (t2 - t1);
  const u2 = u * u;
  const u3 = u2 * u;
  const out = [0, 0, 0] as V3;
  for (let k = 0; k < 3; k++) {
    out[k] =
      0.5 *
      (2 * p1[k] +
        (-p0[k] + p2[k]) * u +
        (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 +
        (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3);
  }
  return out;
};

/* ---------- camera ---------- */

const CAM_POS: [number, V3][] = [
  [0, [0, 1.3, 8.5]],
  [3, [0, 1.25, 7.6]],
  [7, [0.35, 1.1, 3.4]],
  [10, [0.5, 1.5, 3.6]],
  [11.6, [5.6, 2.4, -2.2]],
  [13.8, [0.6, 1.6, -8.2]],
  [14.9, [4, 2, 0.5]],
  [16, [2.2, 1.8, 7.5]],
  [18, [2.4, 2.2, 9]],
  [22, [2.9, 3.2, 10.5]],
  [26, [2.7, 3.0, 14]],
  [30, [2.7, 3.2, 16]],
];

const CAM_TGT: [number, V3][] = [
  [0, [0, 1.2, -6]],
  [3, [0, 0.9, 0]],
  [7, [0, 0.9, 0]],
  [10, [0, 1.4, -1]],
  [11.6, [0, 2.0, -3]],
  [13.8, [0, 1.8, -3]],
  [14.9, [0.2, 0.6, 0]],
  [16, [1.0, 1.0, 0]],
  [18, [1.6, 1.8, 0]],
  [22, [2.5, 2.6, 0]],
  [26, [2.7, 2.6, 0]],
  [30, [2.7, 3.0, 0]],
];

const CameraRig: React.FC<{ t: number }> = ({ t }) => {
  const { camera } = useThree();
  const p = sample(CAM_POS, t);
  const q = sample(CAM_TGT, t);
  camera.position.set(p[0] + Math.sin(t * 0.7) * 0.05, p[1] + Math.cos(t * 0.9) * 0.04, p[2]);
  camera.lookAt(q[0], q[1], q[2]);
  return null;
};

/* ---------- figure ---------- */

const Figure: React.FC<{
  position?: V3;
  scale?: number;
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  rotationZ?: number;
}> = ({
  position = [0, 0, 0],
  scale = 1,
  color = "#3a4a7a",
  emissive = "#1a2a55",
  emissiveIntensity = 0.5,
  rotationZ = 0,
}) => {
  if (scale <= 0.001) return null;
  return (
    <group position={position} scale={scale} rotation={[0, 0, rotationZ]}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.26, 0.3, 1.1, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          roughness={0.45}
        />
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          roughness={0.35}
        />
      </mesh>
    </group>
  );
};

/* ---------- scene content ---------- */

const TALL_FIGURES: { x: number; z: number; s: number }[] = [
  { x: -3.4, z: -9, s: 1.6 },
  { x: -1.7, z: -11, s: 1.9 },
  { x: 0.1, z: -8, s: 1.5 },
  { x: 1.8, z: -12, s: 2.1 },
  { x: 3.3, z: -10, s: 1.7 },
  { x: -0.9, z: -14, s: 2.2 },
  { x: 0.9, z: -15.5, s: 2.3 },
];

const STEP_COUNT = 8;
const STEP_W = 0.55;
const STEP_H = 0.6;
const STEP_X0 = 0.4;

const Content: React.FC<{ t: number }> = ({ t }) => {
  /* hero state */
  const q = Math.min(7, Math.max(-1, (t - 15.2) / 0.85 - 1));
  const climbing = t >= 15.2;
  const stumble = prog(t, 14.4, 14.9) - prog(t, 15.0, 15.4);
  const heroScale = interpolate(t, [0, 14, 15.2, 22, 26], [0.55, 0.55, 0.6, 0.9, 1.15], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bob = climbing && q < 7 ? Math.abs(Math.sin(Math.PI * (q + 1))) * 0.1 : 0;
  const heroX = climbing ? STEP_X0 + STEP_W * (q + 0.5) : 0;
  const heroY = climbing ? Math.max(0, STEP_H * (q + 1)) + bob : 0;
  const idleBob = !climbing ? Math.sin(t * 2.2) * 0.02 : 0;

  /* "yet" gold shift */
  const gold = prog(t, 7.1, 7.6);
  const goldHold = 1 - prog(t, 11, 13);
  const goldMix = gold * (0.35 + 0.65 * goldHold);
  const heroColor = goldMix > 0.5 ? "#e8a820" : COLORS.cyan;
  const heroEmissive = goldMix > 0.5 ? COLORS.gold : COLORS.cyan;
  const flash = Math.max(0, 1 - Math.abs(t - 7.3) * 2.2);
  const heroGlow = 0.4 + goldMix * 0.7 + flash * 0.7 + (t > 23 ? prog(t, 23, 27) * 0.5 : 0);

  /* shockwave ring at "yet" */
  const ring = prog(t, 7.2, 8.4, Easing.out(Easing.cubic));
  const ringScale = 0.2 + ring * 9;

  /* tall figures fade away before the orbit */
  const tallFade = 1 - prog(t, 8.6, 9.8);

  /* thought bubble spheres as 3D hint (3.4 - 7.2) */
  const dots = pop(t, 3.4, 0.4) * (1 - prog(t, 7.1, 7.4));

  /* cards (10-14) */
  const cardsOut = 1 - prog(t, 14.0, 14.6);
  const draftsOut = 1 - prog(t, 14.2, 14.8);

  /* orbit icons */
  const orbitColors = [COLORS.cyan, COLORS.gold, "#ff7ab6"];
  const ringOpacity = prog(t, 21.6, 22.4);
  const orbitOut = 1 - prog(t, 24.5, 25.5);

  return (
    <>
      <color attach="background" args={[COLORS.bg]} />
      <fog attach="fog" args={[COLORS.bg, 14, 42]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 9, 6]} intensity={1.3} />
      <pointLight
        position={[heroX, heroY + 1.2 * heroScale, 1.6]}
        color={heroEmissive}
        intensity={heroGlow * 9}
        distance={14}
      />

      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -5]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#0a0f20" roughness={0.9} />
      </mesh>
      <gridHelper args={[120, 120, "#24315c", "#141c38"]} position={[0, 0, -5]} />

      {/* dust */}
      {Array.from({ length: 46 }, (_, i) => {
        const x = (rand(i, 1) - 0.5) * 16 + 2;
        const y = 0.5 + rand(i, 2) * 8 + Math.sin(t * 0.6 + i) * 0.15;
        const z = -rand(i, 3) * 16 + 4;
        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.03 + rand(i, 4) * 0.03, 8, 8]} />
            <meshBasicMaterial color={i % 5 === 0 ? COLORS.gold : "#8aa4ff"} />
          </mesh>
        );
      })}

      {/* taller figures (everyone else, ahead of you) */}
      {TALL_FIGURES.map((f, i) => (
        <Figure
          key={i}
          position={[f.x, 0, f.z]}
          scale={f.s * tallFade * pop(t, 0.3 + i * 0.12, 0.6)}
          color="#33436f"
          emissive="#18244a"
          emissiveIntensity={0.6}
        />
      ))}

      {/* hero */}
      <Figure
        position={[heroX, heroY + idleBob, 0]}
        scale={heroScale}
        color={heroColor}
        emissive={heroEmissive}
        emissiveIntensity={heroGlow}
        rotationZ={stumble * 1.35}
      />

      {/* thought dots */}
      {dots > 0.01 &&
        [0, 1, 2].map((i) => (
          <mesh key={i} position={[0.25 + i * 0.18, 1.3 + i * 0.28, 0.3]} scale={dots * (0.6 + i * 0.4)}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshBasicMaterial color="#cfd8ff" />
          </mesh>
        ))}

      {/* shockwave */}
      {ring > 0 && ring < 1 && (
        <mesh position={[0, 0.8, 0]} scale={ringScale}>
          <torusGeometry args={[1, 0.02, 12, 80]} />
          <meshBasicMaterial color={COLORS.gold} transparent opacity={1 - ring} />
        </mesh>
      )}

      {/* cards: front gold (polished wins), back grey */}
      {Array.from({ length: 9 }, (_, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const s = pop(t, 10.2 + i * 0.17, 0.45) * cardsOut;
        if (s <= 0.01) return null;
        return (
          <group
            key={i}
            position={[(col - 1) * 1.25, 1.0 + row * 1.2 + Math.sin(t * 1.4 + i) * 0.06, -3]}
            scale={s}
          >
            <mesh>
              <planeGeometry args={[0.95, 1.25]} />
              <meshStandardMaterial
                color="#ffd36a"
                emissive={COLORS.gold}
                emissiveIntensity={0.55}
              />
            </mesh>
            <mesh position={[0, 0, -0.01]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[0.95, 1.25]} />
              <meshStandardMaterial color="#2a3047" roughness={1} />
            </mesh>
          </group>
        );
      })}

      {/* crumpled drafts (what you do not see) */}
      {Array.from({ length: 22 }, (_, i) => {
        const s = pop(t, 12.0 + rand(i, 9) * 0.6, 0.4) * draftsOut;
        if (s <= 0.01) return null;
        const x = (rand(i, 5) - 0.5) * 3.2;
        const z = -4.4 - rand(i, 6) * 1.2;
        const sz = 0.3 + rand(i, 7) * 0.28;
        return (
          <mesh
            key={i}
            position={[x, sz * 0.8, z]}
            rotation={[rand(i, 8) * 6, rand(i, 10) * 6, rand(i, 11) * 6]}
            scale={sz * s}
          >
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#e6e9f5" flatShading roughness={0.95} />
          </mesh>
        );
      })}

      {/* staircase */}
      {Array.from({ length: STEP_COUNT }, (_, i) => {
        const appear = prog(t, 15.0 + i * 0.85, 15.0 + i * 0.85 + 0.35, Easing.out(Easing.cubic));
        if (appear <= 0.001) return null;
        const h = STEP_H * (i + 1);
        const done = i === STEP_COUNT - 1 ? prog(t, 23, 26) : 0;
        return (
          <mesh
            key={i}
            position={[STEP_X0 + STEP_W * (i + 0.5), (h * appear) / 2, 0]}
            scale={[1, appear, 1]}
          >
            <boxGeometry args={[STEP_W, h, 1.1]} />
            <meshStandardMaterial
              color={i === STEP_COUNT - 1 ? "#ffd470" : "#2c3b6b"}
              emissive={i === STEP_COUNT - 1 ? COLORS.gold : "#1d2a58"}
              emissiveIntensity={i === STEP_COUNT - 1 ? 0.3 + done * 0.9 : 0.35}
              roughness={0.5}
            />
          </mesh>
        );
      })}

      {/* orbiting Effort / Feedback / Repeat */}
      {orbitColors.map((c, i) => {
        const s = pop(t, 18.3 + i * 1.5, 0.5) * orbitOut;
        if (s <= 0.01) return null;
        const a = t * 2.4 + (i * Math.PI * 2) / 3;
        const r = 0.95 * heroScale + 0.2;
        return (
          <mesh
            key={i}
            position={[
              heroX + Math.cos(a) * r,
              heroY + 1.35 * heroScale + Math.sin(a * 0.5) * 0.12,
              Math.sin(a) * r,
            ]}
            scale={s}
          >
            <sphereGeometry args={[0.13, 20, 20]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.6} />
          </mesh>
        );
      })}
      {ringOpacity > 0.01 && orbitOut > 0.01 && (
        <mesh
          position={[heroX, heroY + 1.35 * heroScale, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={(0.95 * heroScale + 0.2) * ringOpacity}
        >
          <torusGeometry args={[1, 0.012, 10, 90]} />
          <meshBasicMaterial color="#dfe8ff" transparent opacity={0.55 * orbitOut} />
        </mesh>
      )}
    </>
  );
};

export const Scene3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  return (
    <ThreeCanvas
      width={width}
      height={height}
      camera={{ fov: 45, near: 0.1, far: 120, position: [0, 1.3, 8.5] }}
    >
      <CameraRig t={t} />
      <Content t={t} />
    </ThreeCanvas>
  );
};
