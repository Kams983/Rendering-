import React, { useLayoutEffect, useMemo, useRef } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  RoundedBox,
} from "@react-three/drei";
import {
  Bloom,
  DepthOfField,
  EffectComposer,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import {
  Easing,
  getStaticFiles,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as THREE from "three";
import { COLORS, QUALITY_PRESETS, resolveQuality } from "./config";
import type { Quality, QualityPreset } from "./config";
import { getScene, sceneStart } from "./timeline";
import { CARD_H, CardInstances, HeroCard, rgba } from "./Cards";
import type { CardInstance, SymbolKind, V3 } from "./Cards";
import { GlassBarrier, PHONE_W, Phone } from "./Phone";

const NEAR = 0.1;
const FAR = 60;

/* -------------------------------------------------------------------- */
/* Maths helpers                                                         */
/* -------------------------------------------------------------------- */

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const mix = (a: number, b: number, u: number) => a + (b - a) * u;

const hash = (i: number, salt = 0) => {
  const value = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
};

const smooth = (a: number, b: number, value: number) => {
  if (b <= a) {
    return value >= b ? 1 : 0;
  }
  const u = clamp01((value - a) / (b - a));
  return u * u * (3 - 2 * u);
};

const range = (
  t: number,
  a: number,
  b: number,
  easing: (input: number) => number = Easing.inOut(Easing.cubic),
) =>
  interpolate(t, [a, b], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

const popIn = (t: number, at: number, duration = 0.5) =>
  range(t, at, at + duration, Easing.out(Easing.back(1.6)));

const catmullRom = (keys: CameraKey[], t: number): V3 => {
  if (t <= keys[0].at) {
    return [...keys[0].v];
  }
  if (t >= keys[keys.length - 1].at) {
    return [...keys[keys.length - 1].v];
  }
  let index = 0;
  while (index < keys.length - 2 && t > keys[index + 1].at) {
    index += 1;
  }
  const k0 = keys[Math.max(0, index - 1)];
  const k1 = keys[index];
  const k2 = keys[index + 1];
  const k3 = keys[Math.min(keys.length - 1, index + 2)];
  const span = Math.max(0.0001, k2.at - k1.at);
  const u = clamp01((t - k1.at) / span);
  const u2 = u * u;
  const u3 = u2 * u;
  const out: V3 = [0, 0, 0];
  for (let axis = 0; axis < 3; axis += 1) {
    out[axis] =
      0.5 *
      (2 * k1.v[axis] +
        (-k0.v[axis] + k2.v[axis]) * u +
        (2 * k0.v[axis] - 5 * k1.v[axis] + 4 * k2.v[axis] - k3.v[axis]) * u2 +
        (-k0.v[axis] +
          3 * k1.v[axis] -
          3 * k2.v[axis] +
          k3.v[axis]) *
          u3);
  }
  return out;
};

/* -------------------------------------------------------------------- */
/* Camera                                                                */
/* -------------------------------------------------------------------- */

type CameraKey = { at: number; v: V3 };

const CAM_POS: CameraKey[] = [
  { at: 0, v: [0, 0.08, 6.35] },
  { at: 2.4, v: [0.1, 0.12, 6.15] },
  { at: 4.4, v: [-0.12, 0.18, 6.0] },
  { at: 6.4, v: [0.05, 0.1, 6.05] },
  { at: 8.8, v: [-0.08, 0.14, 5.75] },
  { at: 11.2, v: [0.06, 0.08, 5.95] },
  { at: 13.4, v: [-0.08, 0.12, 5.7] },
  { at: 15.2, v: [0.05, 0.06, 5.9] },
  { at: 17.8, v: [-0.06, 0.1, 5.7] },
  { at: 20.4, v: [0.04, 0.06, 6.0] },
  { at: 23.6, v: [-0.1, 0.12, 5.8] },
  { at: 26.8, v: [0.06, 0.1, 6.2] },
  { at: 30.2, v: [-0.05, 0.14, 5.9] },
  { at: 34, v: [0.03, 0.1, 6.3] },
  { at: 38.4, v: [-0.02, 0.06, 5.4] },
  { at: 42.8, v: [0, 0.04, 4.85] },
  { at: 45.4, v: [0.05, 0.06, 5.95] },
  { at: 48.4, v: [-0.04, 0.08, 5.8] },
  { at: 51, v: [0.03, 0.05, 5.55] },
  { at: 53.6, v: [0, 0.08, 5.9] },
  { at: 55.6, v: [-0.04, 0.1, 5.75] },
  { at: 57.6, v: [0.05, 0.1, 6.1] },
  { at: 60, v: [0, 0.12, 5.95] },
  { at: 62, v: [0, 0.14, 6.25] },
  { at: 64, v: [0, 0.14, 6.3] },
];

const CAM_TARGET: CameraKey[] = [
  { at: 0, v: [0, 0.0, 0] },
  { at: 2.4, v: [0, 0.04, 0] },
  { at: 4.4, v: [0, 0.1, -0.2] },
  { at: 6.4, v: [0, 0.02, 0] },
  { at: 8.8, v: [0, 0.06, 0.1] },
  { at: 11.2, v: [0, 0.02, 0] },
  { at: 13.4, v: [0, 0.04, 0.2] },
  { at: 15.2, v: [0, 0.0, 0] },
  { at: 17.8, v: [0, 0.04, 0.1] },
  { at: 20.4, v: [0, 0.0, -0.3] },
  { at: 23.6, v: [0, 0.02, -0.2] },
  { at: 26.8, v: [0, 0.04, 0] },
  { at: 30.2, v: [0, 0.08, 0.3] },
  { at: 34, v: [0, 0.04, 0] },
  { at: 38.4, v: [0, 0.02, -1.2] },
  { at: 42.8, v: [0, 0.02, -2.0] },
  { at: 45.4, v: [0, 0.04, 0] },
  { at: 48.4, v: [0, 0.02, 0] },
  { at: 51, v: [0, 0.0, 0] },
  { at: 53.6, v: [0, 0.02, 0] },
  { at: 55.6, v: [0, 0.06, 0] },
  { at: 57.6, v: [0, 0.02, -0.1] },
  { at: 60, v: [0, 0.0, 0] },
  { at: 62, v: [0, -0.18, 0] },
  { at: 64, v: [0, -0.18, 0] },
];

const FOCUS_KEYS: CameraKey[] = [
  { at: 0, v: [0, 0, 0] },
  { at: 2.4, v: [0, 0.05, 0.3] },
  { at: 6.4, v: [0, 0.05, 0.2] },
  { at: 8.8, v: [0, 0.05, 0.1] },
  { at: 11.2, v: [0, 0, 0] },
  { at: 15.2, v: [0, 0, -0.2] },
  { at: 20.4, v: [0, 0, -0.4] },
  { at: 26.8, v: [0, 0.05, 0.2] },
  { at: 30.2, v: [0, 0.05, 0.6] },
  { at: 34, v: [0, 0, 0] },
  { at: 38.4, v: [0, 0, -1.4] },
  { at: 42.8, v: [0, 0, -2.2] },
  { at: 45.4, v: [0.3, 0.2, 0.2] },
  { at: 48.4, v: [0, 0.1, 0.3] },
  { at: 53.6, v: [0, 0.1, 0.3] },
  { at: 57.6, v: [0, 0, 0] },
  { at: 64, v: [0, -0.1, 0.2] },
];

const CameraRig: React.FC<{ t: number }> = ({ t }) => {
  const { camera } = useThree();
  const position = catmullRom(CAM_POS, t);
  const target = catmullRom(CAM_TARGET, t);
  const swayX = Math.sin(t * 0.67) * 0.016 + Math.sin(t * 1.93 + 0.6) * 0.005;
  const swayY = Math.cos(t * 0.53) * 0.013 + Math.cos(t * 2.17) * 0.004;
  camera.position.set(position[0] + swayX, position[1] + swayY, position[2]);
  camera.lookAt(
    target[0] + Math.sin(t * 0.41) * 0.008,
    target[1] + Math.cos(t * 0.47) * 0.006,
    target[2],
  );
  camera.updateMatrixWorld();
  return null;
};

/* -------------------------------------------------------------------- */
/* Environment, lights, floor, dust                                      */
/* -------------------------------------------------------------------- */

const hasStudioHdr = (() => {
  try {
    return getStaticFiles().some(
      (file) => file.name.replace(/\\/g, "/") === "hdri/studio.hdr",
    );
  } catch {
    return false;
  }
})();

const StudioEnvironment: React.FC<{ preset: QualityPreset }> = ({
  preset,
}) => {
  if (hasStudioHdr) {
    return (
      <Environment
        files={staticFile("hdri/studio.hdr")}
        background={false}
        resolution={preset.environmentResolution}
      />
    );
  }
  return (
    <Environment
      resolution={preset.environmentResolution}
      frames={1}
      background={false}
    >
      <color attach="background" args={["#02050c"]} />
      <Lightformer
        form="rect"
        intensity={3.2}
        color="#ffffff"
        scale={[9, 5, 1]}
        position={[0, 4.6, 4]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        intensity={2.4}
        color={COLORS.cyan}
        scale={[7, 4, 1]}
        position={[-5.2, 1.4, 2.4]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        intensity={1.9}
        color={COLORS.gold}
        scale={[4.6, 3, 1]}
        position={[5.4, -0.6, 1.8]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        intensity={1.1}
        color="#8fd8ff"
        scale={[6, 2.4, 1]}
        position={[0, -3.2, -4.2]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="circle"
        intensity={1.6}
        color="#eaf7ff"
        scale={2.6}
        position={[0, 0.4, 6.4]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        intensity={1.4}
        color="#ffffff"
        scale={[2.4, 6, 1]}
        position={[3.6, 2.6, -3.4]}
        target={[0, 0, 0]}
      />
    </Environment>
  );
};

const Lighting: React.FC<{ preset: QualityPreset }> = ({ preset }) => (
  <>
    <ambientLight intensity={0.22} />
    <directionalLight
      position={[3.6, 6.4, 4.8]}
      intensity={2.1}
      color="#f2f8ff"
      castShadow={preset.shadows}
      shadow-mapSize-width={preset.shadowMapSize}
      shadow-mapSize-height={preset.shadowMapSize}
      shadow-camera-near={0.5}
      shadow-camera-far={26}
      shadow-camera-left={-5}
      shadow-camera-right={5}
      shadow-camera-top={6}
      shadow-camera-bottom={-6}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
    />
    <spotLight
      position={[-4.2, 2.2, 3.6]}
      angle={0.7}
      penumbra={1}
      intensity={26}
      distance={16}
      color={COLORS.cyan}
      decay={2}
    />
    <spotLight
      position={[4.4, -1.2, 2.8]}
      angle={0.72}
      penumbra={1}
      intensity={18}
      distance={14}
      color={COLORS.gold}
      decay={2}
    />
  </>
);

const Floor: React.FC<{ preset: QualityPreset }> = ({ preset }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.45, -1]} receiveShadow>
    <planeGeometry args={[44, 44]} />
    {preset.reflectFloor ? (
      <MeshReflectorMaterial
        resolution={256}
        blur={[320, 90]}
        mixBlur={1.1}
        mixStrength={2.4}
        mirror={0.5}
        depthScale={1.1}
        minDepthThreshold={0.35}
        maxDepthThreshold={1.4}
        color="#050b16"
        metalness={0.55}
        roughness={0.86}
        envMapIntensity={1.1}
      />
    ) : (
      <meshPhysicalMaterial
        color="#060d18"
        metalness={0.7}
        roughness={0.24}
        clearcoat={1}
        clearcoatRoughness={0.2}
        envMapIntensity={1.1}
      />
    )}
  </mesh>
);

const Dust: React.FC<{ t: number; count: number }> = ({ t, count }) => {
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      values[i * 3] = (hash(i, 21) - 0.5) * 6.4;
      values[i * 3 + 1] = -2.2 + hash(i, 22) * 4.4;
      values[i * 3 + 2] = -4 + hash(i, 23) * 7;
    }
    return values;
  }, [count]);

  return (
    <points
      position={[0, Math.sin(t * 0.16) * 0.06, 0]}
      rotation={[0, t * 0.02, 0]}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#a8dcff"
        size={0.016}
        sizeAttenuation
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
};

/* -------------------------------------------------------------------- */
/* Post processing                                                       */
/* -------------------------------------------------------------------- */

const Post: React.FC<{ preset: QualityPreset; focusDistance: number }> = ({
  preset,
  focusDistance,
}) => {
  if (!preset.postprocessing) {
    return null;
  }
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={0.7}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.18}
        mipmapBlur
        radius={0.72}
      />
      {preset.depthOfField ? (
        <DepthOfField
          focusDistance={focusDistance}
          focusRange={0.028}
          bokehScale={4}
        />
      ) : null}
      <Vignette offset={0.22} darkness={0.72} eskil={false} />
      <Noise premultiply opacity={0.035} blendFunction={BlendFunction.OVERLAY} />
    </EffectComposer>
  );
};

/* -------------------------------------------------------------------- */
/* Small shared pieces                                                   */
/* -------------------------------------------------------------------- */

const haloTextures = new Map<string, THREE.Texture | null>();

const getHaloTexture = (color: string): THREE.Texture | null => {
  if (haloTextures.has(color)) {
    return haloTextures.get(color) ?? null;
  }
  if (typeof document === "undefined") {
    haloTextures.set(color, null);
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    haloTextures.set(color, null);
    return null;
  }
  const gradient = ctx.createRadialGradient(128, 128, 2, 128, 128, 128);
  gradient.addColorStop(0, rgba(color, 0.95));
  gradient.addColorStop(0.22, rgba(color, 0.34));
  gradient.addColorStop(0.6, rgba(color, 0.07));
  gradient.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  haloTextures.set(color, texture);
  return texture;
};

const Halo: React.FC<{
  color: string;
  size: number;
  opacity?: number;
  position?: V3;
}> = ({ color, size, opacity = 0.5, position = [0, 0, 0] }) => {
  const map = getHaloTexture(color);
  if (!map) {
    return null;
  }
  return (
    <sprite position={position} scale={[size, size, 1]}>
      <spriteMaterial
        map={map}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  );
};

const Orb: React.FC<{
  position?: V3;
  radius?: number;
  color?: string;
  intensity?: number;
  segments?: number;
  halo?: number;
}> = ({
  position = [0, 0, 0],
  radius = 0.14,
  color = COLORS.gold,
  intensity = 1.8,
  segments = 32,
  halo = 1,
}) => {
  const hot = useMemo(
    () => new THREE.Color(color).multiplyScalar(Math.max(0.2, intensity)),
    [color, intensity],
  );
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[radius, segments, segments]} />
        <meshBasicMaterial color={hot} toneMapped={false} />
      </mesh>
      <mesh scale={1.7}>
        <sphereGeometry args={[radius, Math.max(16, segments - 8), Math.max(16, segments - 8)]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.18 * halo}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <Halo color={color} size={radius * 9} opacity={0.42 * halo} />
    </group>
  );
};

const Ring: React.FC<{
  position?: V3;
  rotation?: V3;
  radius?: number;
  tube?: number;
  color?: string;
  opacity?: number;
  segments?: number;
  arc?: number;
  scale?: number | V3;
}> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  radius = 0.9,
  tube = 0.012,
  color = COLORS.cyan,
  opacity = 0.5,
  segments = 128,
  arc = Math.PI * 2,
  scale = 1,
}) => (
  <mesh position={position} rotation={rotation} scale={scale}>
    <torusGeometry args={[radius, tube, 10, segments, arc]} />
    <meshBasicMaterial
      color={color}
      transparent
      opacity={opacity}
      depthWrite={false}
      blending={THREE.AdditiveBlending}
      toneMapped={false}
    />
  </mesh>
);

const LightLine: React.FC<{
  a: V3;
  b: V3;
  radius?: number;
  color?: string;
  opacity?: number;
}> = ({ a, b, radius = 0.006, color = COLORS.cyan, opacity = 0.4 }) => {
  const from = useMemo(() => new THREE.Vector3(...a), [a]);
  const to = useMemo(() => new THREE.Vector3(...b), [b]);
  const direction = useMemo(() => new THREE.Vector3().subVectors(to, from), [from, to]);
  const length = Math.max(0.001, direction.length());
  const midpoint = useMemo(
    () => new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5),
    [from, to],
  );
  const quaternion = useMemo(
    () =>
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize(),
      ),
    [direction],
  );

  return (
    <mesh position={midpoint} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 8, 1]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
};

type SceneProps = {
  t: number;
  preset: QualityPreset;
};

/* -------------------------------------------------------------------- */
/* 1. THE NEXT ONE                                                       */
/* -------------------------------------------------------------------- */

const NextOneScene: React.FC<SceneProps> = ({ t, preset }) => {
  const s = sceneStart("next-one");
  const bob = Math.sin((t - s) * 0.9) * 0.03;
  const riseA = range(t, s + 0.05, s + 0.95, Easing.out(Easing.cubic));
  const leaveA = range(t, s + 1.0, s + 1.42, Easing.in(Easing.cubic));
  const riseB = range(t, s + 1.16, s + 2.05, Easing.out(Easing.cubic));
  const glowA = 0.95 + 0.15 * Math.sin((t - s) * 3.4);

  return (
    <group>
      <group position={[0, bob, 0]}>
        <Phone preset={preset} glow={0.85} shadows={preset.shadows} />
      </group>
      <Halo color={COLORS.cyan} size={2.8} opacity={0.16} position={[0, 0, -1.2]} />
      <group position={[0, -2.45 + riseA * 1.95 + leaveA * 2.7, 0.94]}>
        <HeroCard
          variant={0}
          scale={0.9}
          brightness={glowA}
          rotation={[0.02, -0.06, 0.02]}
        />
        <Halo color={COLORS.cyan} size={1.5} opacity={0.3} position={[0, -0.1, -0.2]} />
      </group>
      <group position={[0, -2.6 + riseB * 2.12, 0.98]}>
        <HeroCard
          variant={3}
          scale={0.9}
          brightness={0.9}
          rotation={[0.02, 0.05, -0.015]}
        />
        <Halo color={COLORS.gold} size={1.4} opacity={0.22} position={[0, -0.15, -0.2]} />
      </group>
    </group>
  );
};

/* -------------------------------------------------------------------- */
/* 2. WHAT COMES NEXT?                                                   */
/* -------------------------------------------------------------------- */

const WhatComesNextScene: React.FC<SceneProps> = ({ t, preset }) => {
  const s = sceneStart("what-comes-next");
  const pull = range(t, s + 0.15, s + 1.15, Easing.inOut(Easing.cubic));
  const cardZ = mix(1.05, 0.02, pull);
  const cardScale = mix(0.92, 0.16, pull);
  const cardGlow = 0.9 + 0.9 * pull;
  const cardOpacity = 1 - smooth(s + 0.95, s + 1.25, t);

  const behind: Array<{
    position: V3;
    rotation: V3;
    color: string;
    variant: number;
    at: number;
  }> = [
    {
      position: [-1.28, 0.3, -1.3],
      rotation: [0.03, 0.38, 0],
      color: COLORS.cyan,
      variant: 0,
      at: s + 1.15,
    },
    {
      position: [0.02, 0.92, -2.2],
      rotation: [0.02, -0.18, 0.03],
      color: COLORS.gold,
      variant: 2,
      at: s + 1.5,
    },
    {
      position: [1.26, 0.12, -1.55],
      rotation: [0.02, -0.42, 0],
      color: COLORS.violet,
      variant: 3,
      at: s + 1.85,
    },
  ];

  return (
    <group>
      <group position={[0, Math.sin((t - s) * 0.8) * 0.025, 0]}>
        <Phone preset={preset} glow={0.9} shadows={preset.shadows} />
      </group>
      <Halo color={COLORS.cyan} size={3.2} opacity={0.18} position={[0, 0.1, -1.6]} />
      {cardOpacity > 0.01 ? (
        <group position={[0, -0.42, cardZ]} scale={Math.max(0.01, cardScale)}>
          <HeroCard
            variant={1}
            brightness={cardGlow}
            opacity={cardOpacity}
            rotation={[0.02, 0.04 * pull, 0]}
          />
          <Halo color={COLORS.green} size={1.5} opacity={0.34 * cardOpacity} />
        </group>
      ) : null}
      {behind.map((item, index) => {
        const appear = popIn(t, item.at, 0.6);
        if (appear < 0.01) {
          return null;
        }
        return (
          <group
            key={index}
            position={item.position}
            rotation={[
              item.rotation[0],
              item.rotation[1] + Math.sin((t - s) * 0.5 + index) * 0.04,
              item.rotation[2],
            ]}
            scale={0.72 * appear}
          >
            <HeroCard
              variant={item.variant}
              brightness={0.34}
              opacity={0.9}
            />
            <Orb
              position={[-0.28, 0.34, 0.24]}
              radius={0.075}
              color={item.color}
              intensity={1.5}
              segments={24}
              halo={0.9}
            />
          </group>
        );
      })}
    </group>
  );
};

/* -------------------------------------------------------------------- */
/* 3. MAYBE THIS ONE                                                     */
/* -------------------------------------------------------------------- */

const MaybeThisOneScene: React.FC<SceneProps> = ({ t, preset }) => {
  const s = sceneStart("maybe-this-one");
  const blur = range(t, s + 3.3, s + 4.4, Easing.inOut(Easing.cubic));
  const specs: Array<{
    x: number;
    tilt: number;
    variant: number;
    symbol: SymbolKind;
    color: string;
    delay: number;
  }> = [
    { x: -0.78, tilt: 0.95, variant: 1, symbol: "ring", color: COLORS.cyan, delay: 0.15 },
    { x: 0, tilt: -0.8, variant: 2, symbol: "triangle", color: COLORS.gold, delay: 0.45 },
    { x: 0.78, tilt: 0.9, variant: 3, symbol: "hexagon", color: COLORS.violet, delay: 0.75 },
  ];

  return (
    <group>
      <Halo color={COLORS.cyan} size={3.4} opacity={0.12} position={[0, 0.05, -1.4]} />
      {specs.map((spec, index) => {
        const rotate = range(t, s + spec.delay, s + spec.delay + 1.15, Easing.out(Easing.cubic));
        const entrance = popIn(t, s + spec.delay - 0.15, 0.6);
        if (entrance < 0.01) {
          return null;
        }
        const depth = -0.1 - blur * 1.9;
        const scale = 0.66 * entrance * (1 - blur * 0.14);
        const brightness = mix(1.02, 0.3, blur);
        return (
          <group
            key={spec.symbol}
            position={[
              spec.x * mix(0.94, 0.72, rotate),
              0.02 + Math.sin((t - s) * 0.7 + index) * 0.03,
              depth,
            ]}
            rotation={[0.015, mix(spec.tilt, 0, rotate), 0]}
            scale={scale}
          >
            <HeroCard
              variant={spec.variant}
              symbol={spec.symbol}
              symbolColor={spec.color}
              brightness={brightness}
            />
            <Halo
              color={spec.color}
              size={1.15}
              opacity={mix(0.34, 0.08, blur)}
              position={[0, 0.1, -0.3]}
            />
            <Orb
              position={[0.18, 0.42, 0.12]}
              radius={0.036}
              color={spec.color}
              intensity={1.7}
              segments={20}
              halo={0.7}
            />
          </group>
        );
      })}
    </group>
  );
};

/* -------------------------------------------------------------------- */
/* 4. UNPREDICTABLE REWARD                                               */
/* -------------------------------------------------------------------- */

const UnpredictableRewardScene: React.FC<SceneProps> = ({ t, preset }) => {
  const s = sceneStart("unpredictable-reward");
  const travel = (t - s) * 0.82;
  const rewardAt = s + 1.1;
  const reward = smooth(rewardAt, rewardAt + 0.42, t);
  const cardCount = Math.round(7 * Math.max(0.7, preset.instanceScale));
  const items: CardInstance[] = [];

  for (let i = 0; i < cardCount; i += 1) {
    const z = -3.15 + i * 0.62 + travel;
    const isReward = i === 3;
    const nearRing = Math.exp(-Math.pow((z - 0.15) / 0.7, 2));
    const lit = isReward ? reward : 0;
    items.push({
      position: [(i - 3) * 0.115, Math.sin(i * 1.7) * 0.02, z],
      rotation: [0.01, 0.06 * Math.sin(i * 2.3), 0],
      scale: 0.84 * (1 + lit * 0.08),
      brightness: 0.26 + nearRing * 0.12 + lit * 1.7,
      tint: isReward ? COLORS.gold : "#a8cbe8",
    });
  }

  const rewardCard = items[3];
  const ringPulse = 0.55 + 0.15 * Math.sin((t - s) * 2.6);

  return (
    <group>
      <Ring
        radius={1.02}
        tube={0.014}
        color={COLORS.cyan}
        opacity={ringPulse}
        segments={preset.ringSegments}
        position={[0, 0, 0]}
      />
      <Ring
        radius={1.18}
        tube={0.006}
        color={COLORS.gold}
        opacity={0.24}
        segments={preset.ringSegments}
        position={[0, 0, -0.02]}
        scale={[1, 1, 1]}
      />
      <Halo color={COLORS.cyan} size={2.6} opacity={0.16} />
      <CardInstances items={items} capacity={cardCount} shadows={preset.shadows} />
      {reward > 0.02 && rewardCard ? (
        <group position={rewardCard.position}>
          <Orb
            radius={0.17 + reward * 0.05}
            color={COLORS.gold}
            intensity={1.9 + reward * 1.4}
            segments={preset.sphereSegments}
            halo={reward}
            position={[0, 0.05, 0.22]}
          />
          <Ring
            radius={0.42 + reward * 0.36}
            tube={0.008}
            color={COLORS.gold}
            opacity={0.5 * reward}
            segments={96}
            position={[0, 0.05, 0.2]}
          />
        </group>
      ) : null}
    </group>
  );
};

/* -------------------------------------------------------------------- */
/* 5. UNCERTAINTY MATTERS                                                */
/* -------------------------------------------------------------------- */

const UncertaintyScene: React.FC<SceneProps> = ({ t, preset }) => {
  const s = sceneStart("uncertainty-matters");
  const cycle = 0.8;
  const slots = Math.round(9 * Math.max(0.6, preset.instanceScale));
  const items: CardInstance[] = [];

  for (let i = 0; i < slots; i += 1) {
    const phase = (((t - s) / cycle + i / slots) % 1 + 1) % 1;
    const z = mix(-2.5, 1.7, phase);
    items.push({
      position: [Math.sin(i * 1.7) * 0.05, Math.cos(i * 2.1) * 0.05, z],
      rotation: [0, 0, Math.sin(i * 1.3) * 0.1],
      scale: 0.44,
      brightness: 0.22 + smooth(0.55, 1, 1 - phase) * 0.22,
      tint: i % 4 === 0 ? COLORS.cyan : "#8db4d6",
    });
  }

  const wobbleX = Math.sin((t - s) * 2.1) * 0.1;
  const wobbleY = Math.cos((t - s) * 1.7) * 0.07;
  const flashAt = s + 3.05;
  const flash =
    smooth(flashAt, flashAt + 0.22, t) *
    (1 - smooth(flashAt + 0.45, flashAt + 1.1, t));
  const surprise = range(t, s + 2.35, s + 3.1, Easing.out(Easing.cubic));
  const settle = range(t, s + 3.25, s + 4.6, Easing.inOut(Easing.cubic));

  return (
    <group>
      <Halo color={COLORS.cyan} size={3} opacity={0.12 + flash * 0.35} />
      <CardInstances items={items} capacity={slots} shadows={preset.shadows} />
      <group position={[wobbleX * (1 - settle), wobbleY * (1 - settle), -0.25]}>
        <Ring
          radius={mix(0.92, 0.74, settle)}
          tube={0.014}
          color={flash > 0.2 ? COLORS.white : COLORS.cyan}
          opacity={0.45 + flash * 0.5}
          segments={preset.ringSegments}
        />
        <Ring
          radius={mix(0.78, 0.6, settle)}
          tube={0.007}
          color={COLORS.gold}
          opacity={0.2 + flash * 0.4}
          segments={preset.ringSegments}
        />
      </group>
      <group
        position={[
          mix(0.42, 0.06, surprise),
          mix(0.38, 0.06, surprise),
          mix(-2.7, 0.12, surprise),
        ]}
        scale={0.5 * (0.9 + 0.1 * surprise)}
      >
        <HeroCard variant={3} brightness={0.5 + flash * 1.6} tint={COLORS.violet} />
        <Orb
          radius={0.09 + flash * 0.06}
          color={COLORS.white}
          intensity={1.4 + flash * 2.4}
          segments={preset.sphereSegments}
          halo={0.6 + flash}
          position={[0, 0.1, 0.2]}
        />
      </group>
      {flash > 0.02 ? (
        <Ring
          radius={0.35 + (1 - flash) * 1.15}
          tube={0.01}
          color={COLORS.white}
          opacity={flash * 0.7}
          segments={preset.ringSegments}
        />
      ) : null}
      <Orb
        radius={0.11}
        color={COLORS.gold}
        intensity={1.2 + flash}
        segments={preset.sphereSegments}
        halo={0.5}
        position={[wobbleX, wobbleY + 0.36, -0.1]}
      />
    </group>
  );
};

/* -------------------------------------------------------------------- */
/* 6. DOPAMINE ISN'T JOY                                                 */
/* -------------------------------------------------------------------- */

const DopamineScene: React.FC<SceneProps> = ({ t, preset }) => {
  const s = sceneStart("dopamine");
  const approach = range(t, s + 0.3, s + 5.6, Easing.inOut(Easing.cubic));
  const orbZ = mix(1.9, 0.6, approach);
  const pulse = 0.5 + 0.5 * Math.sin((t - s) * 2.3);
  const ringRadius = mix(0.94, 0.68, smooth(s + 4.2, s + 6.2, t));
  const ringGlow = mix(0.55, 0.3, smooth(s + 4.4, s + 6.2, t));

  return (
    <group>
      <Halo color={COLORS.cyan} size={3.2} opacity={0.14} position={[0, 0, -1.6]} />
      <Ring
        radius={ringRadius}
        tube={0.013}
        color={COLORS.cyan}
        opacity={ringGlow + pulse * 0.1}
        segments={preset.ringSegments}
        position={[0, 0, -0.85]}
      />
      <Ring
        radius={ringRadius * 0.86}
        tube={0.006}
        color={COLORS.gold}
        opacity={0.22}
        segments={preset.ringSegments}
        position={[0, 0, -0.9]}
        rotation={[0, 0, 0.4]}
      />
      {[0, 1, 2].map((index) => (
        <Orb
          key={index}
          radius={0.12 - index * 0.028}
          color={index === 0 ? COLORS.white : COLORS.gold}
          intensity={1.7 - index * 0.4}
          segments={20}
          halo={0.5 - index * 0.1}
          position={[0, 0.02, orbZ + 0.24 + index * 0.24]}
        />
      ))}
      <Orb
        radius={0.16}
        color={COLORS.gold}
        intensity={1.6 + pulse * 0.9}
        segments={preset.sphereSegments}
        halo={1}
        position={[0, 0.02, orbZ]}
      />
      <LightLine
        a={[0, 0.02, orbZ]}
        b={[0, 0, -0.85]}
        radius={0.004}
        color={COLORS.gold}
        opacity={0.1}
      />
    </group>
  );
};

/* -------------------------------------------------------------------- */
/* 7. WANTING THE NEXT REWARD                                            */
/* -------------------------------------------------------------------- */

const WantingScene: React.FC<SceneProps> = ({ t, preset }) => {
  const s = sceneStart("wanting-next-reward");
  const local = t - s;
  const streamCount = Math.round(16 * Math.max(0.5, preset.instanceScale));
  const pulseStart = s + 3.55;
  const pulse = range(t, pulseStart, pulseStart + 2.8, Easing.inOut(Easing.cubic));
  const pulseZ = mix(0.9, -3.4, pulse);
  const brilliant = smooth(s + 3.1, s + 3.8, t);
  const items: CardInstance[] = [];

  for (let i = 0; i < streamCount; i += 1) {
    const cycle = ((local * 0.34 + i / streamCount) % 1 + 1) % 1;
    const z = 1.9 - cycle * 4.7;
    const boost = Math.exp(-Math.pow((z - pulseZ) / 0.55, 2)) * (1 - pulse) * 1.3;
    items.push({
      position: [(hash(i, 2) - 0.5) * 0.24, (hash(i, 3) - 0.5) * 0.3, z],
      rotation: [0.05, (hash(i, 4) - 0.5) * 0.4, (hash(i, 5) - 0.5) * 0.3],
      scale: 0.48,
      brightness: 0.16 + boost,
      tint: "#86aac8",
    });
  }

  return (
    <group>
      <group position={[0, Math.sin(local * 0.7) * 0.02, 0]}>
        <Phone preset={preset} glow={0.8} shadows={preset.shadows} />
      </group>
      <Halo color={COLORS.gold} size={3.2} opacity={0.12 + brilliant * 0.1} />
      <CardInstances items={items} capacity={streamCount} shadows={preset.shadows} />
      <group
        position={[0, 0.04, mix(1.6, 0.98, brilliant)]}
        scale={Math.max(0.01, 0.92 * brilliant)}
      >
        <HeroCard variant={2} brightness={0.7 + brilliant * 1.6} tint={COLORS.gold} />
        <Halo color={COLORS.gold} size={1.8} opacity={0.42 * brilliant} />
      </group>
      {brilliant > 0.05 ? (
        <Orb
          radius={0.1}
          color={COLORS.gold}
          intensity={1.5 + brilliant}
          segments={preset.sphereSegments}
          halo={brilliant}
          position={[0, 0.04, 1.12]}
        />
      ) : null}
      {pulse > 0.02 && pulse < 0.99 ? (
        <group>
          <Ring
            radius={0.42}
            tube={0.01}
            color={COLORS.gold}
            opacity={0.4 * (1 - pulse)}
            segments={96}
            position={[0, 0, pulseZ]}
          />
          <Ring
            radius={0.62}
            tube={0.006}
            color={COLORS.cyan}
            opacity={0.25 * (1 - pulse)}
            segments={96}
            position={[0, 0, pulseZ - 0.12]}
          />
        </group>
      ) : null}
    </group>
  );
};

/* -------------------------------------------------------------------- */
/* 8. NO STOPPING POINT                                                  */
/* -------------------------------------------------------------------- */

const TunnelScene: React.FC<SceneProps> = ({ t, preset }) => {
  const s = sceneStart("no-stopping-point");
  const local = t - s;
  const count = Math.round(96 * Math.max(0.4, preset.instanceScale));
  const items: CardInstance[] = [];

  for (let i = 0; i < count; i += 1) {
    const ringIndex = Math.floor(i / 6);
    const slot = i % 6;
    const angle = (slot / 6) * Math.PI * 2 + ringIndex * 0.42;
    const depth = (((i / count) + local * 0.05) % 1 + 1) % 1;
    const z = mix(2.2, -17, depth);
    const radius = 0.47 + 0.02 * Math.sin(ringIndex * 0.7);
    const scale = mix(0.3, 0.055, depth) * (1 + 0.1 * Math.sin(i));
    items.push({
      position: [Math.cos(angle) * radius, Math.sin(angle) * radius, z],
      rotation: [0, 0, angle],
      scale,
      brightness: mix(0.42, 0.08, depth),
      tint: i % 7 === 0 ? COLORS.gold : COLORS.cyan,
    });
  }

  return (
    <group>
      <Phone preset={preset} glow={0.7} ghost={0.72} shadows={false} />
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -7.5]}>
        <cylinderGeometry args={[0.74, 0.85, 18, 36, 1, true]} />
        <meshBasicMaterial
          color={COLORS.cyan}
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <CardInstances items={items} capacity={count} shadows={preset.shadows} />
      <Halo color={COLORS.cyan} size={3.4} opacity={0.18} position={[0, 0, -3]} />
      <Ring
        radius={0.52}
        tube={0.006}
        color={COLORS.cyan}
        opacity={0.24}
        segments={96}
        position={[0, 0, 1.2]}
      />
      <Ring
        radius={0.66}
        tube={0.004}
        color={COLORS.gold}
        opacity={0.16}
        segments={96}
        position={[0, 0, 0.9]}
      />
    </group>
  );
};

/* -------------------------------------------------------------------- */
/* 9. ANOTHER REASON TO CHECK                                            */
/* -------------------------------------------------------------------- */

const AnotherReasonScene: React.FC<SceneProps> = ({ t, preset }) => {
  const s = sceneStart("another-reason");
  const appear = popIn(t, s + 0.5, 0.55);
  const line = smooth(s + 0.95, s + 1.35, t);
  const pull = range(t, s + 1.45, s + 3.5, Easing.inOut(Easing.cubic));
  const orb: V3 = [0.98, 0.74, 0.6];
  const cardStart: V3 = [1.12, -0.86, 0.66];
  const cardPosition: V3 = [
    mix(cardStart[0], 0.34, pull),
    mix(cardStart[1], 0.16, pull),
    mix(cardStart[2], 0.42, pull),
  ];
  const pingAge = ((t - s - 0.6) % 1.5 + 1.5) % 1.5;
  const pingRing = smooth(0, 0.15, pingAge) * (1 - smooth(0.5, 1.35, pingAge));

  return (
    <group>
      <group position={[-0.42, Math.sin((t - s) * 0.8) * 0.025, 0]}>
        <Phone preset={preset} glow={0.85} shadows={preset.shadows} />
      </group>
      <Halo color={COLORS.gold} size={2.8} opacity={0.14} position={[0.2, 0.1, -1.2]} />
      {appear > 0.01 ? (
        <group scale={appear}>
          <Orb
            position={orb}
            radius={0.13}
            color={COLORS.gold}
            intensity={1.7 + pingRing * 0.9}
            segments={preset.sphereSegments}
            halo={1}
          />
          <Ring
            radius={0.2 + pingRing * 0.34}
            tube={0.006}
            color={COLORS.gold}
            opacity={0.5 * pingRing}
            segments={64}
            position={orb}
          />
        </group>
      ) : null}
      {line > 0.01 ? (
        <LightLine
          a={orb}
          b={cardPosition}
          radius={0.0045}
          color={COLORS.gold}
          opacity={0.34 * line}
        />
      ) : null}
      <group position={cardPosition} scale={0.44}>
        <HeroCard
          variant={4}
          brightness={0.55 + 0.35 * pull}
          rotation={[0.02, mix(-0.3, 0.05, pull), 0]}
        />
      </group>
      <group position={[0.1, -1.05, 0.5]} scale={0.4 * (1 - pull * 0.5)}>
        <HeroCard variant={0} brightness={0.24} />
      </group>
    </group>
  );
};

/* -------------------------------------------------------------------- */
/* 10. MORE SCROLLING, MORE BOREDOM                                      */
/* -------------------------------------------------------------------- */

const MoreScrollingScene: React.FC<SceneProps> = ({ t, preset }) => {
  const s = sceneStart("more-scrolling");
  const local = t - s;
  const scene = getScene("more-scrolling");
  const fade = clamp01(local / (scene.end - scene.start));
  const changes = Math.floor(local / 0.24);
  const items: CardInstance[] = [];
  const rows = 6;

  for (let i = 0; i < rows; i += 1) {
    const variantShift = (changes + i) % 5;
    const y = 0.86 - i * 0.34;
    const brightness =
      mix(2.4, 0.42, Math.min(1, fade * 1.12)) *
      (0.72 + 0.28 * hash(i, changes));
    items.push({
      position: [Math.sin(i * 2.1 + changes) * 0.04, y, 0.92],
      rotation: [0.01, Math.sin(i * 0.7 + changes) * 0.08, 0],
      scale: 0.34,
      brightness,
      tint: ["#ffffff", "#e8f6ff", "#cfe2f2", "#b8cadb", "#9fb2c4"][variantShift],
    });
  }

  return (
    <group>
      <group position={[0, Math.sin(local * 0.6) * 0.02, 0]}>
        <Phone
          preset={preset}
          glow={mix(1, 0.4, fade)}
          shadows={preset.shadows}
        />
      </group>
      <Halo
        color={COLORS.cyan}
        size={2.6}
        opacity={mix(0.24, 0.05, fade)}
        position={[0, 0, 0.2]}
      />
      <CardInstances items={items} capacity={rows} shadows={false} />
      <Orb
        radius={0.05}
        color={COLORS.white}
        intensity={mix(2, 0.6, fade)}
        segments={16}
        halo={0.5}
        position={[0, 1.1, 1.0]}
      />
    </group>
  );
};

/* -------------------------------------------------------------------- */
/* 11. ONE MORE SWIPE                                                    */
/* -------------------------------------------------------------------- */

const OneMoreSwipeScene: React.FC<SceneProps> = ({ t, preset }) => {
  const s = sceneStart("one-more-swipe");
  const swipe = range(t, s + 0.55, s + 1.35, Easing.out(Easing.cubic));
  const rise = range(t, s + 1.1, s + 2.15, Easing.out(Easing.cubic));
  const loop = smooth(s + 1.6, s + 3.2, t);

  return (
    <group>
      <group position={[0, Math.sin((t - s) * 0.7) * 0.02, 0]}>
        <Phone preset={preset} glow={0.9} shadows={preset.shadows} />
      </group>
      <Ring
        radius={1.12}
        tube={0.007}
        color={COLORS.cyan}
        opacity={0.12 + loop * 0.16}
        segments={preset.ringSegments}
        position={[0, 0.02, -0.3]}
        rotation={[0, 0, (t - s) * 0.22]}
      />
      {swipe > 0.01 && swipe < 0.99 ? (
        <group position={[0, mix(-1.35, 1.05, swipe), 1.02]}>
          <Ring
            radius={0.5}
            tube={0.01}
            color={COLORS.white}
            opacity={0.65 * (1 - swipe)}
            segments={96}
            arc={Math.PI * 1.35}
            rotation={[0, 0, -1.1]}
            scale={[1, 0.72, 1]}
          />
          <mesh rotation={[0, 0, Math.PI / 2]} scale={[1, 1 - swipe * 0.6, 1]}>
            <cylinderGeometry args={[0.006, 0.006, 0.9, 6, 1]} />
            <meshBasicMaterial
              color={COLORS.cyan}
              transparent
              opacity={0.4 * (1 - swipe)}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
          <Halo color={COLORS.cyan} size={1.2} opacity={0.22 * (1 - swipe)} />
        </group>
      ) : null}
      <group position={[0, -2.55 + rise * 2.05, 0.98]} scale={0.9}>
        <HeroCard variant={5} brightness={0.8 + rise * 0.5} tint="#ffffff" />
        <Halo color={COLORS.gold} size={1.4} opacity={0.28 * rise} />
      </group>
    </group>
  );
};

/* -------------------------------------------------------------------- */
/* 12 and 13. STOPPING CUE, BREAK THE LOOP                               */
/* -------------------------------------------------------------------- */

const StoppingCueScene: React.FC<SceneProps & { final: boolean }> = ({
  t,
  preset,
  final,
}) => {
  const scene = getScene(final ? "break-the-loop" : "stopping-cue");
  const s = scene.start;
  const local = t - s;
  const barrierY = -1.5;
  const cardScale = 0.42;
  const landing = barrierY + 0.04 + (CARD_H * cardScale) / 2 - 0.02;
  const items: CardInstance[] = [];

  for (let i = 0; i < 5; i += 1) {
    const start = s - 0.35 + i * 0.42;
    const travelTime = 0.95;
    const progress = range(t, start, start + travelTime, Easing.out(Easing.cubic));
    const y = mix(2.55, landing + i * 0.07, progress);
    items.push({
      position: [(i - 2) * 0.035, y, 0.3 + i * 0.012],
      rotation: [0.01, (hash(i, 6) - 0.5) * 0.06, 0],
      scale: cardScale,
      brightness: 0.36 + 0.05 * i,
      tint: "#bcd6ea",
    });
  }

  const timerProgress = final
    ? 1
    : range(t, s + 0.9, s + 3.6, Easing.inOut(Easing.cubic));
  const barrierGlow = 0.7 + 0.3 * Math.sin(local * 1.6);
  const finalDrop = final
    ? range(t, s + 0.15, s + 1.05, Easing.out(Easing.cubic))
    : 0;
  const settle = final ? smooth(s + 1.05, s + 1.45, t) : 0;

  return (
    <group>
      <group position={[0, 0.14, 0]}>
        <Phone preset={preset} glow={mix(0.95, 0.55, final ? settle : 0)} shadows={preset.shadows} />
      </group>
      <Halo color={COLORS.cyan} size={3} opacity={0.14} position={[0, -0.4, -0.8]} />
      <GlassBarrier
        preset={preset}
        position={[0, barrierY, 0.26]}
        width={2.15}
        depth={0.9}
        glow={barrierGlow}
      />
      <CardInstances items={items} capacity={5} shadows={preset.shadows} />
      {final ? (
        <group
          position={[
            0,
            mix(2.7, landing, finalDrop),
            0.44,
          ]}
          scale={cardScale}
        >
          <HeroCard
            variant={2}
            brightness={mix(0.9, 1.5, settle)}
            tint={COLORS.gold}
            rotation={[0.01, 0.02, 0]}
          />
          <Halo color={COLORS.gold} size={1.5} opacity={0.34 * settle} />
        </group>
      ) : null}
      <group position={[0.98, -1.02, 0.62]}>
        <Ring
          radius={0.26}
          tube={0.006}
          color={COLORS.cyan}
          opacity={0.16}
          segments={64}
        />
        <Ring
          radius={0.26}
          tube={0.012}
          color={COLORS.cyan}
          opacity={0.7}
          segments={Math.max(24, Math.round(preset.ringSegments * 0.75))}
          arc={Math.PI * 2 * timerProgress}
          rotation={[0, 0, Math.PI / 2]}
        />
        <Orb
          radius={0.028}
          color={COLORS.gold}
          intensity={1.4}
          segments={16}
          halo={0.5}
        />
        <Halo color={COLORS.cyan} size={0.95} opacity={0.16} />
      </group>
    </group>
  );
};

/* -------------------------------------------------------------------- */
/* Scene switch                                                          */
/* -------------------------------------------------------------------- */

const SceneFor: React.FC<{ t: number; preset: QualityPreset }> = ({
  t,
  preset,
}) => {
  const scenes: Array<{ id: string; render: React.ReactNode }> = [
    { id: "next-one", render: <NextOneScene t={t} preset={preset} /> },
    { id: "what-comes-next", render: <WhatComesNextScene t={t} preset={preset} /> },
    { id: "maybe-this-one", render: <MaybeThisOneScene t={t} preset={preset} /> },
    {
      id: "unpredictable-reward",
      render: <UnpredictableRewardScene t={t} preset={preset} />,
    },
    { id: "uncertainty-matters", render: <UncertaintyScene t={t} preset={preset} /> },
    { id: "dopamine", render: <DopamineScene t={t} preset={preset} /> },
    { id: "wanting-next-reward", render: <WantingScene t={t} preset={preset} /> },
    { id: "no-stopping-point", render: <TunnelScene t={t} preset={preset} /> },
    { id: "another-reason", render: <AnotherReasonScene t={t} preset={preset} /> },
    { id: "more-scrolling", render: <MoreScrollingScene t={t} preset={preset} /> },
    { id: "one-more-swipe", render: <OneMoreSwipeScene t={t} preset={preset} /> },
    {
      id: "stopping-cue",
      render: <StoppingCueScene t={t} preset={preset} final={false} />,
    },
    {
      id: "break-the-loop",
      render: <StoppingCueScene t={t} preset={preset} final />,
    },
  ];

  for (const entry of scenes) {
    const scene = getScene(entry.id);
    if (t >= scene.start && t < scene.end) {
      return <>{entry.render}</>;
    }
  }
  const last = getScene("break-the-loop");
  return t >= last.end ? <StoppingCueScene t={t} preset={preset} final /> : null;
};

/* -------------------------------------------------------------------- */
/* Stage                                                                 */
/* -------------------------------------------------------------------- */

const Stage: React.FC<{
  t: number;
  preset: QualityPreset;
  focusDistance: number;
  dustCount: number;
}> = ({ t, preset, focusDistance, dustCount }) => (
  <>
    <color attach="background" args={[COLORS.bg]} />
    <fog attach="fog" args={[COLORS.bg, 9, 26]} />
    <CameraRig t={t} />
    <StudioEnvironment preset={preset} />
    <Lighting preset={preset} />
    <Floor preset={preset} />
    <Dust t={t} count={dustCount} />
    <SceneFor t={t} preset={preset} />
    {preset.contactShadows ? (
      <ContactShadows
        position={[0, -2.42, 0]}
        opacity={0.55}
        scale={9}
        blur={2.8}
        far={4.2}
        resolution={preset.contactShadowResolution}
        color="#02060d"
      />
    ) : null}
    <Post preset={preset} focusDistance={focusDistance} />
  </>
);

export const Scene3D: React.FC<{ quality?: Quality }> = ({ quality }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const preset = QUALITY_PRESETS[resolveQuality(quality)];
  const t = frame / fps;

  const focusPoint = catmullRom(FOCUS_KEYS, t);
  const cameraPosition = catmullRom(CAM_POS, t);
  const focusWorldDistance = Math.sqrt(
    Math.pow(focusPoint[0] - cameraPosition[0], 2) +
      Math.pow(focusPoint[1] - cameraPosition[1], 2) +
      Math.pow(focusPoint[2] - cameraPosition[2], 2),
  );
  const focusDistance = clamp01((focusWorldDistance - NEAR) / (FAR - NEAR));
  const dustCount = Math.max(40, Math.round(420 * preset.instanceScale));

  return (
    <ThreeCanvas
      width={width}
      height={height}
      style={{ backgroundColor: COLORS.bg }}
      camera={{ fov: 38, position: [0, 0.08, 6.35], near: NEAR, far: FAR }}
      gl={{
        antialias: !preset.postprocessing,
        alpha: false,
        powerPreference: "high-performance",
      }}
    >
      <Stage
        t={t}
        preset={preset}
        focusDistance={focusDistance}
        dustCount={dustCount}
      />
    </ThreeCanvas>
  );
};
