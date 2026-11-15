import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  RoundedBox,
} from "@react-three/drei";
import {
  Easing,
  getStaticFiles,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as THREE from "three";
import { COLORS, FONT_STACK, QUALITY_PRESETS, resolveQuality } from "./config";
import type { Quality, QualityPreset } from "./config";
import { getScene, sceneAt } from "./timeline";

type V3 = [number, number, number];

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
  range(t, at, at + duration, Easing.out(Easing.back(1.7)));

/* ------------------------------------------------------------------ */
/* Camera                                                              */
/* ------------------------------------------------------------------ */

type CameraKey = { at: number; v: V3 };

const CAM_POS: CameraKey[] = [
  { at: 0, v: [0, 0.1, 6.25] },
  { at: 2.4, v: [0.12, 0.14, 6.05] },
  { at: 4.4, v: [-0.08, 0.2, 5.85] },
  { at: 6.4, v: [0.1, 0.18, 5.75] },
  { at: 8.8, v: [-0.14, 0.22, 5.55] },
  { at: 11.2, v: [0.16, 0.18, 5.8] },
  { at: 13.6, v: [0, 0.12, 6.1] },
  { at: 15.2, v: [-0.1, 0.16, 5.95] },
  { at: 18.4, v: [0.1, 0.12, 5.8] },
  { at: 20.4, v: [0, 0.14, 5.9] },
  { at: 23.6, v: [-0.14, 0.18, 5.7] },
  { at: 26.8, v: [0.12, 0.22, 6.3] },
  { at: 30.4, v: [-0.12, 0.26, 6.6] },
  { at: 34, v: [0.1, 0.2, 6.4] },
  { at: 38.4, v: [-0.1, 0.22, 6.15] },
  { at: 42.8, v: [0.08, 0.18, 6.1] },
  { at: 45.8, v: [-0.08, 0.16, 5.85] },
  { at: 48.4, v: [0.06, 0.12, 5.55] },
  { at: 51, v: [0, 0.1, 5.35] },
  { at: 53.6, v: [0.1, 0.12, 5.45] },
  { at: 57.6, v: [-0.06, 0.14, 5.6] },
  { at: 60, v: [0.08, 0.16, 5.5] },
  { at: 62, v: [0, 0.18, 6.4] },
  { at: 64, v: [0, 0.18, 6.6] },
];

const CAM_TARGET: CameraKey[] = [
  { at: 0, v: [0, 0.02, 0] },
  { at: 2.4, v: [0, 0.04, 0] },
  { at: 4.4, v: [0, 0.08, 0] },
  { at: 6.4, v: [0, 0.05, 0] },
  { at: 8.8, v: [0, 0.05, 0] },
  { at: 11.2, v: [0, 0.06, 0] },
  { at: 13.6, v: [0, 0.04, 0] },
  { at: 15.2, v: [0, 0, 0] },
  { at: 18.4, v: [0, -0.05, 0] },
  { at: 20.4, v: [0, 0.02, 0] },
  { at: 23.6, v: [0, 0.05, 0] },
  { at: 26.8, v: [0, 0.08, 0] },
  { at: 30.4, v: [0, 0.12, 0] },
  { at: 34, v: [0, 0.1, 0] },
  { at: 38.4, v: [0, 0.08, 0] },
  { at: 42.8, v: [0, 0.05, 0] },
  { at: 45.8, v: [0, 0.02, 0] },
  { at: 48.4, v: [0, 0.02, 0] },
  { at: 51, v: [0, 0, 0] },
  { at: 53.6, v: [0, 0.02, 0] },
  { at: 57.6, v: [0, 0.05, 0] },
  { at: 60, v: [0, 0.05, 0] },
  { at: 62, v: [0, 0.08, 0] },
  { at: 64, v: [0, 0.08, 0] },
];

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
        (2 * k0.v[axis] - 5 * k1.v[axis] + 4 * k2.v[axis] - k3.v[axis]) *
          u2 +
        (-k0.v[axis] +
          3 * k1.v[axis] -
          3 * k2.v[axis] +
          k3.v[axis]) *
          u3);
  }
  return out;
};

const CameraRig: React.FC<{ t: number }> = ({ t }) => {
  const { camera } = useThree();
  const position = catmullRom(CAM_POS, t);
  const target = catmullRom(CAM_TARGET, t);
  const swayX = Math.sin(t * 0.63) * 0.035;
  const swayY = Math.cos(t * 0.49) * 0.028;
  camera.position.set(position[0] + swayX, position[1] + swayY, position[2]);
  camera.lookAt(
    target[0] + Math.sin(t * 0.37) * 0.015,
    target[1] + Math.cos(t * 0.43) * 0.012,
    target[2],
  );
  return null;
};

/* ------------------------------------------------------------------ */
/* Procedural textures                                                 */
/* ------------------------------------------------------------------ */

const hexToRgb = (hex: string) => {
  const value = parseInt(hex.replace("#", ""), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const rgba = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const roundRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

const textCache = new Map<string, THREE.Texture | null>();

const getTextTexture = (
  text: string,
  color: string,
  wide = false,
  fontPx?: number,
): THREE.Texture | null => {
  const fontSize = fontPx ?? (wide ? 110 : 152);
  const key = `${wide ? "wide" : "standard"}|${color}|${text}|${fontSize}`;
  if (textCache.has(key)) {
    return textCache.get(key) ?? null;
  }
  if (typeof document === "undefined") {
    textCache.set(key, null);
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = wide ? 1024 : 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    textCache.set(key, null);
    return null;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `800 ${fontSize}px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2, canvas.width - 56);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  textCache.set(key, texture);
  return texture;
};

const glyphCache = new Map<string, THREE.Texture | null>();

const getGlyphTexture = (text: string, color: string): THREE.Texture | null => {
  const key = `${color}|${text}`;
  if (glyphCache.has(key)) {
    return glyphCache.get(key) ?? null;
  }
  if (typeof document === "undefined") {
    glyphCache.set(key, null);
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    glyphCache.set(key, null);
    return null;
  }
  ctx.clearRect(0, 0, 512, 512);
  ctx.font = `800 380px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 36;
  ctx.fillText(text, 256, 250, 430);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  glyphCache.set(key, texture);
  return texture;
};

type MarkKind = "check" | "cross";

const markCache = new Map<string, THREE.Texture | null>();

const getMarkTexture = (kind: MarkKind, color: string): THREE.Texture | null => {
  const key = `${kind}|${color}`;
  if (markCache.has(key)) {
    return markCache.get(key) ?? null;
  }
  if (typeof document === "undefined") {
    markCache.set(key, null);
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    markCache.set(key, null);
    return null;
  }
  ctx.clearRect(0, 0, 256, 256);
  ctx.strokeStyle = color;
  ctx.lineWidth = kind === "check" ? 18 : 16;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur = 22;
  ctx.beginPath();
  if (kind === "check") {
    ctx.moveTo(62, 132);
    ctx.lineTo(106, 176);
    ctx.lineTo(196, 80);
  } else {
    ctx.moveTo(74, 74);
    ctx.lineTo(182, 182);
    ctx.moveTo(182, 74);
    ctx.lineTo(74, 182);
  }
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  markCache.set(key, texture);
  return texture;
};

type IconKind = "page" | "window" | "code";

const iconCache = new Map<string, THREE.Texture | null>();

const getIconTexture = (kind: IconKind): THREE.Texture | null => {
  if (iconCache.has(kind)) {
    return iconCache.get(kind) ?? null;
  }
  if (typeof document === "undefined") {
    iconCache.set(kind, null);
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    iconCache.set(kind, null);
    return null;
  }
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = "rgba(4, 12, 26, 0.72)";
  ctx.strokeStyle = rgba(COLORS.cyan, 0.85);
  ctx.lineWidth = 8;
  roundRectPath(ctx, 26, 26, 204, 204, 30);
  ctx.fill();
  ctx.stroke();

  if (kind === "page") {
    ctx.strokeStyle = rgba(COLORS.white, 0.9);
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    const widths = [150, 120, 136, 96];
    widths.forEach((width, index) => {
      const y = 78 + index * 28;
      ctx.beginPath();
      ctx.moveTo(54, y);
      ctx.lineTo(54 + width, y);
      ctx.stroke();
    });
  } else if (kind === "window") {
    ctx.strokeStyle = rgba(COLORS.white, 0.55);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(40, 86);
    ctx.lineTo(216, 86);
    ctx.stroke();
    ctx.fillStyle = COLORS.gold;
    [52, 74, 96].forEach((x) => {
      ctx.beginPath();
      ctx.arc(x, 58, 7, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.strokeStyle = rgba(COLORS.white, 0.85);
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(52, 118);
    ctx.lineTo(204, 118);
    ctx.moveTo(52, 148);
    ctx.lineTo(168, 148);
    ctx.moveTo(52, 178);
    ctx.lineTo(190, 178);
    ctx.stroke();
  } else {
    ctx.fillStyle = rgba(COLORS.gold, 0.95);
    ctx.font = `800 92px ${FONT_STACK}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("</>", 128, 138, 176);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  iconCache.set(kind, texture);
  return texture;
};

const haloCache = new Map<string, THREE.Texture | null>();

const getHaloTexture = (color: string): THREE.Texture | null => {
  if (haloCache.has(color)) {
    return haloCache.get(color) ?? null;
  }
  if (typeof document === "undefined") {
    haloCache.set(color, null);
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    haloCache.set(color, null);
    return null;
  }
  const gradient = ctx.createRadialGradient(128, 128, 4, 128, 128, 128);
  gradient.addColorStop(0, rgba(color, 0.85));
  gradient.addColorStop(0.32, rgba(color, 0.28));
  gradient.addColorStop(0.7, rgba(color, 0.07));
  gradient.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  haloCache.set(color, texture);
  return texture;
};

/* ------------------------------------------------------------------ */
/* Reusable scene pieces                                               */
/* ------------------------------------------------------------------ */

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

const TextPlane: React.FC<{
  text: string;
  color?: string;
  size?: [number, number];
  wide?: boolean;
  fontPx?: number;
  position?: V3;
  rotation?: V3;
  opacity?: number;
}> = ({
  text,
  color = COLORS.white,
  size = [0.4, 0.2],
  wide = false,
  fontPx,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  opacity = 1,
}) => {
  const map = getTextTexture(text, color, wide, fontPx);
  if (!map) {
    return null;
  }
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshBasicMaterial
        map={map}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

const Mark: React.FC<{
  kind: MarkKind;
  color: string;
  size: number;
  position?: V3;
  opacity?: number;
  scale?: number;
}> = ({ kind, color, size, position = [0, 0, 0], opacity = 1, scale = 1 }) => {
  const map = getMarkTexture(kind, color);
  if (!map) {
    return null;
  }
  return (
    <mesh position={position} scale={Math.max(0.001, scale)}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        map={map}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

const Glyph: React.FC<{
  text: string;
  color: string;
  size: number;
  position?: V3;
  opacity?: number;
  scale?: number;
}> = ({ text, color, size, position = [0, 0, 0], opacity = 1, scale = 1 }) => {
  const map = getGlyphTexture(text, color);
  if (!map) {
    return null;
  }
  return (
    <mesh position={position} scale={Math.max(0.001, scale)}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        map={map}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

const TokenCube: React.FC<{
  label?: string;
  size?: number;
  depth?: number;
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  position?: V3;
  rotation?: V3;
  scale?: number | V3;
  labelColor?: string;
  labelWidth?: number;
  shadows?: boolean;
}> = ({
  label,
  size = 0.52,
  depth = 0.34,
  color = COLORS.panel,
  emissive = COLORS.cyan,
  emissiveIntensity = 0.5,
  roughness = 0.2,
  metalness = 0.35,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  labelColor = COLORS.white,
  labelWidth,
  shadows = false,
}) => {
  const width = labelWidth ?? size * 0.74;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <RoundedBox
        args={[size, size, depth]}
        radius={0.06}
        smoothness={4}
        castShadow={shadows}
        receiveShadow={shadows}
      >
        <meshPhysicalMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          roughness={roughness}
          metalness={metalness}
          clearcoat={1}
          clearcoatRoughness={0.1}
          envMapIntensity={1.6}
        />
      </RoundedBox>
      {label ? (
        <TextPlane
          text={label}
          color={labelColor}
          size={[width, width * 0.5]}
          position={[0, 0, depth / 2 + 0.004]}
        />
      ) : null}
    </group>
  );
};

const GlowSphere: React.FC<{
  radius: number;
  segments: number;
  position?: V3;
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  shadows?: boolean;
  scale?: number;
}> = ({
  radius,
  segments,
  position = [0, 0, 0],
  color = "#082033",
  emissive = COLORS.cyan,
  emissiveIntensity = 0.8,
  roughness = 0.16,
  metalness = 0.4,
  opacity = 1,
  shadows = false,
  scale = 1,
}) => (
  <mesh
    position={position}
    scale={scale}
    castShadow={shadows}
    receiveShadow={shadows}
  >
    <sphereGeometry args={[radius, segments, segments]} />
    <meshPhysicalMaterial
      color={color}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      roughness={roughness}
      metalness={metalness}
      clearcoat={1}
      clearcoatRoughness={0.08}
      envMapIntensity={1.8}
      transparent={opacity < 1}
      opacity={opacity}
    />
  </mesh>
);

/* ------------------------------------------------------------------ */
/* Instancing                                                          */
/* ------------------------------------------------------------------ */

type InstanceItem = {
  position: V3;
  rotation?: V3;
  scale: number | V3;
  color?: string;
};

const Instanced: React.FC<{
  geometry: THREE.BufferGeometry;
  items: InstanceItem[];
  capacity: number;
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  shadows?: boolean;
}> = ({
  geometry,
  items,
  capacity,
  color = "#ffffff",
  emissive = "#000000",
  emissiveIntensity = 0,
  roughness = 0.35,
  metalness = 0.2,
  opacity = 1,
  shadows = false,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummyRef = useRef(new THREE.Object3D());
  const colorRef = useRef(new THREE.Color());

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        emissive,
        emissiveIntensity,
        roughness,
        metalness,
        transparent: opacity < 1,
        opacity,
      }),
    [color, emissive, roughness, metalness, opacity],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }
    material.emissiveIntensity = emissiveIntensity;
    const count = Math.min(capacity, items.length);
    mesh.count = count;
    const dummy = dummyRef.current;
    const scratch = colorRef.current;
    for (let i = 0; i < count; i += 1) {
      const item = items[i];
      dummy.position.set(item.position[0], item.position[1], item.position[2]);
      dummy.rotation.set(
        item.rotation?.[0] ?? 0,
        item.rotation?.[1] ?? 0,
        item.rotation?.[2] ?? 0,
      );
      if (typeof item.scale === "number") {
        dummy.scale.setScalar(Math.max(0.0001, item.scale));
      } else {
        dummy.scale.set(
          Math.max(0.0001, item.scale[0]),
          Math.max(0.0001, item.scale[1]),
          Math.max(0.0001, item.scale[2]),
        );
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      scratch.set(item.color ?? "#ffffff");
      mesh.setColorAt(i, scratch);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  });

  const meshArgs = useMemo<
    [THREE.BufferGeometry, THREE.Material, number]
  >(() => [geometry, material, capacity], [geometry, material, capacity]);

  useEffect(() => {
    return () => material.dispose();
  }, [material]);

  return (
    <instancedMesh
      ref={meshRef}
      args={meshArgs}
      frustumCulled={false}
      castShadow={shadows}
    />
  );
};

const makeRoundedUnitBox = (): THREE.BufferGeometry => {
  const half = 0.5;
  const radius = 0.12;
  const shape = new THREE.Shape();
  shape.moveTo(-half + radius, -half);
  shape.lineTo(half - radius, -half);
  shape.quadraticCurveTo(half, -half, half, -half + radius);
  shape.lineTo(half, half - radius);
  shape.quadraticCurveTo(half, half, half - radius, half);
  shape.lineTo(-half + radius, half);
  shape.quadraticCurveTo(-half, half, -half, half - radius);
  shape.lineTo(-half, -half + radius);
  shape.quadraticCurveTo(-half, -half, -half + radius, -half);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.6,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: radius * 0.55,
    bevelThickness: 0.08,
    curveSegments: 4,
  });
  geometry.center();
  geometry.computeBoundingBox();
  const boundingBox = geometry.boundingBox;
  if (boundingBox) {
    const size = boundingBox.getSize(new THREE.Vector3());
    geometry.scale(1 / size.x, 1 / size.y, 1 / size.z);
  }
  geometry.computeVertexNormals();
  return geometry;
};

let roundedUnitBox: THREE.BufferGeometry | null = null;
const getRoundedUnitBox = () => {
  if (!roundedUnitBox) {
    roundedUnitBox = makeRoundedUnitBox();
  }
  return roundedUnitBox;
};

/* ------------------------------------------------------------------ */
/* Lighting, environment, floor, dust                                  */
/* ------------------------------------------------------------------ */

const hasStudioHdr = (() => {
  try {
    return getStaticFiles().some(
      (file) => file.name.replace(/\\/g, "/") === "hdri/studio.hdr",
    );
  } catch {
    return false;
  }
})();

const StudioEnvironment: React.FC<{ settings: QualityPreset }> = ({
  settings,
}) => {
  if (hasStudioHdr) {
    return (
      <Environment
        files={staticFile("hdri/studio.hdr")}
        background={false}
        resolution={settings.environmentResolution}
      />
    );
  }
  return (
    <Environment
      resolution={settings.environmentResolution}
      frames={1}
      background={false}
    >
      <color attach="background" args={["#020611"]} />
      <Lightformer
        form="rect"
        intensity={2.6}
        color="#ffffff"
        scale={[10, 5, 1]}
        position={[0, 5, -7]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        intensity={1.9}
        color={COLORS.cyan}
        scale={[8, 4, 1]}
        position={[-6, 1.5, 2]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        intensity={1.3}
        color={COLORS.gold}
        scale={[5, 3, 1]}
        position={[6, -1, 1]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="circle"
        intensity={1.4}
        color="#dff6ff"
        scale={3}
        position={[0, 0, 6]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="ring"
        intensity={0.9}
        color={COLORS.cyan}
        scale={4}
        position={[2, 5, 2]}
        target={[0, 0, 0]}
      />
    </Environment>
  );
};

const Lighting: React.FC<{ settings: QualityPreset }> = ({ settings }) => (
  <>
    <ambientLight intensity={0.32} />
    <directionalLight
      position={[4.5, 7, 5]}
      intensity={1.6}
      castShadow={settings.shadows}
      shadow-mapSize-width={settings.shadowMapSize}
      shadow-mapSize-height={settings.shadowMapSize}
      shadow-camera-near={0.5}
      shadow-camera-far={24}
      shadow-camera-left={-6}
      shadow-camera-right={6}
      shadow-camera-top={7}
      shadow-camera-bottom={-7}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
    />
    <pointLight
      position={[-3, 1.5, 3]}
      color={COLORS.cyan}
      intensity={8}
      distance={14}
      decay={2}
    />
    <pointLight
      position={[3, -1, 2]}
      color={COLORS.gold}
      intensity={5}
      distance={12}
      decay={2}
    />
  </>
);

const Floor: React.FC<{ settings: QualityPreset }> = ({ settings }) => (
  <mesh
    rotation={[-Math.PI / 2, 0, 0]}
    position={[0, -2.05, 0]}
    receiveShadow={settings.shadows}
  >
    <planeGeometry args={[40, 40]} />
    <meshPhysicalMaterial
      color="#040a16"
      roughness={0.16}
      metalness={0.72}
      clearcoat={1}
      clearcoatRoughness={0.16}
      envMapIntensity={1.2}
      transparent
      opacity={0.55}
    />
  </mesh>
);

const Dust: React.FC<{ t: number; count: number }> = ({ t, count }) => {
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      values[i * 3] = (hash(i, 21) - 0.5) * 7;
      values[i * 3 + 1] = -1.4 + hash(i, 22) * 3.4;
      values[i * 3 + 2] = -2.5 + hash(i, 23) * 4.5;
    }
    return values;
  }, [count]);

  return (
    <points position={[0, Math.sin(t * 0.18) * 0.05, 0]} rotation={[0, t * 0.025, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#9fdcff"
        size={0.018}
        sizeAttenuation
        transparent
        opacity={0.42}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
};

const SceneGroup: React.FC<{
  id: string;
  t: number;
  children: React.ReactNode;
}> = ({ id, t, children }) => {
  const scene = getScene(id);
  if (t < scene.start || t >= scene.end) {
    return null;
  }
  const enter =
    id === "void" ? 1 : popIn(t, scene.start - 0.3, 0.55);
  const exit =
    id === "void" || id === "final"
      ? 1
      : 1 - range(t, scene.end - 0.18, scene.end, Easing.in(Easing.cubic));
  const scale = Math.max(0.001, enter * exit);
  if (scale < 0.01) {
    return null;
  }
  return <group scale={scale}>{children}</group>;
};

/* ------------------------------------------------------------------ */
/* Scene 0: dark void cursor                                           */
/* ------------------------------------------------------------------ */

const VoidCursorScene: React.FC<{ t: number }> = ({ t }) => {
  const start = getScene("void").start;
  const local = t - start;
  const blinkPhase = 0.5 + 0.5 * Math.sin(local * 7.4);
  const blink = 0.18 + 0.82 * smooth(0.08, 0.22, blinkPhase);
  const ringA = range(local, 0.5, 1.9, Easing.out(Easing.cubic));
  const ringB = range(local, 1.15, 2.4, Easing.out(Easing.cubic));

  return (
    <group position={[0, 0.02, 0]}>
      <Halo color={COLORS.cyan} size={2.3} opacity={0.32 + blink * 0.28} />
      <RoundedBox args={[0.1, 0.64, 0.1]} radius={0.03} smoothness={4}>
        <meshPhysicalMaterial
          color={COLORS.white}
          emissive={COLORS.cyan}
          emissiveIntensity={1 + blink * 2.4}
          roughness={0.08}
          metalness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.04}
        />
      </RoundedBox>
      {[ringA, ringB].map((progress, index) =>
        progress > 0.001 && progress < 0.999 ? (
          <mesh key={index} scale={0.3 + progress * 1.5}>
            <ringGeometry args={[0.965, 1, 80]} />
            <meshBasicMaterial
              color={COLORS.cyan}
              transparent
              opacity={(1 - progress) * 0.28}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        ) : null,
      )}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 1: a sentence assembles from blocks                           */
/* ------------------------------------------------------------------ */

const ASSEMBLY_BLOCKS = [
  { x: -0.735, y: 0.32, w: 0.46, h: 0.28, d: 0.18, color: COLORS.cyan },
  { x: -0.265, y: 0.32, w: 0.34, h: 0.28, d: 0.16, color: COLORS.gold },
  { x: 0.185, y: 0.32, w: 0.42, h: 0.28, d: 0.2, color: COLORS.cyan },
  { x: 0.715, y: 0.32, w: 0.5, h: 0.28, d: 0.22, color: COLORS.white },
  { x: -0.665, y: -0.02, w: 0.38, h: 0.28, d: 0.17, color: COLORS.gold },
  { x: -0.175, y: -0.02, w: 0.46, h: 0.28, d: 0.18, color: COLORS.cyan },
  { x: 0.285, y: -0.02, w: 0.32, h: 0.28, d: 0.16, color: COLORS.white },
  { x: 0.685, y: -0.02, w: 0.34, h: 0.28, d: 0.18, color: COLORS.cyan },
];

const AssembleScene: React.FC<{ t: number; shadows: boolean }> = ({
  t,
  shadows,
}) => {
  const start = getScene("assemble").start;

  return (
    <group>
      <Halo
        color={COLORS.cyan}
        size={2.6}
        opacity={0.16}
        position={[0, 0.15, -0.7]}
      />
      {ASSEMBLY_BLOCKS.map((block, index) => {
        const appear = start + 0.38 + index * 0.33;
        const progress = popIn(t, appear, 0.55);
        if (progress < 0.001) {
          return null;
        }
        const scatter: V3 = [
          (hash(index, 1) - 0.5) * 2,
          (hash(index, 2) - 0.5) * 1.8 + 0.2,
          1.1 + hash(index, 3) * 1.4,
        ];
        const position: V3 = [
          mix(block.x, scatter[0], 1 - progress),
          mix(block.y, scatter[1], 1 - progress),
          mix(0, scatter[2], 1 - progress),
        ];
        const pulse = Math.exp(
          -Math.pow((t - (start + 2.72 + index * 0.05)) / 0.14, 2),
        );
        return (
          <RoundedBox
            key={index}
            args={[block.w, block.h, block.d]}
            radius={0.06}
            smoothness={4}
            position={position}
            rotation={[
              (1 - progress) * hash(index, 4) * 2,
              (1 - progress) * hash(index, 5) * 2,
              (1 - progress) * hash(index, 6) * 1.5,
            ]}
            scale={Math.max(0.001, progress)}
            castShadow={shadows}
            receiveShadow={shadows}
          >
            <meshPhysicalMaterial
              color={block.color}
              emissive={block.color}
              emissiveIntensity={0.45 + pulse * 2}
              roughness={0.2 + hash(index, 7) * 0.25}
              metalness={0.35}
              clearcoat={1}
              clearcoatRoughness={0.1}
              envMapIntensity={1.6}
            />
          </RoundedBox>
        );
      })}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 2: labeled token cubes                                        */
/* ------------------------------------------------------------------ */

const TOKEN_LABELS = ["Hel", "lo", "world"];

const TokensScene: React.FC<{
  t: number;
  shadows: boolean;
}> = ({ t, shadows }) => {
  const start = getScene("tokens").start;
  const flash = smooth(start + 1.5, start + 2.1, t);

  return (
    <group>
      <Halo
        color={COLORS.cyan}
        size={2.8}
        opacity={0.14 + flash * 0.08}
        position={[0, 0.05, -0.8]}
      />
      <mesh
        position={[0, 0.02, -0.55]}
        rotation={[0, 0, t * 0.14]}
        scale={[1.42, 0.82, 1]}
      >
        <torusGeometry args={[0.95, 0.008, 8, 120]} />
        <meshBasicMaterial
          color={COLORS.gold}
          transparent
          opacity={0.24 + flash * 0.2}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      {TOKEN_LABELS.map((label, index) => {
        const appear = start + 0.15 + index * 0.4;
        const progress = popIn(t, appear, 0.55);
        if (progress < 0.001) {
          return null;
        }
        const isHero = index === 2;
        return (
          <TokenCube
            key={label}
            label={label}
            size={0.62}
            depth={0.42}
            position={[index * 0.78 - 0.78, 0.02, 0]}
            rotation={[0.03, Math.sin(t * 0.6 + index) * 0.13, 0]}
            scale={Math.max(0.001, progress)}
            color={isHero ? "#2b2413" : COLORS.panel}
            emissive={isHero ? COLORS.gold : COLORS.cyan}
            emissiveIntensity={(isHero ? 0.7 : 0.5) + flash * 0.7}
            roughness={0.16 + index * 0.05}
            metalness={0.4}
            shadows={shadows}
          />
        );
      })}
      {TOKEN_LABELS.map((_, index) => (
        <TextPlane
          key={`index-${index}`}
          text={`0${index + 1}`}
          color={COLORS.dim}
          size={[0.16, 0.08]}
          position={[index * 0.78 - 0.78, 0.52, 0.02]}
          opacity={
            0.2 +
            0.6 * Math.min(1, popIn(t, start + 0.15 + index * 0.4, 0.55))
          }
        />
      ))}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 3: a question splits into a row of tokens                     */
/* ------------------------------------------------------------------ */

const QUESTION_TOKENS = ["Why", "is", "the", "sky", "blue", "?"];

const QuestionScene: React.FC<{ t: number; shadows: boolean }> = ({
  t,
  shadows,
}) => {
  const start = getScene("question").start;
  const plateLife = 1 - range(t, start + 0.85, start + 1.9, Easing.inOut(Easing.cubic));
  const platePop = popIn(t, start + 0.05, 0.45);
  const underline = range(t, start + 2.15, start + 2.75, Easing.out(Easing.cubic));

  return (
    <group>
      <Halo
        color={COLORS.cyan}
        size={2.7}
        opacity={0.14}
        position={[0, -0.1, -0.7]}
      />
      {plateLife > 0.01 ? (
        <group
          position={[0, 0.62 + (1 - plateLife) * 0.3, 0]}
          scale={Math.max(0.001, plateLife * platePop)}
        >
          <RoundedBox
            args={[1.95, 0.52, 0.15]}
            radius={0.06}
            smoothness={4}
            castShadow={shadows}
          >
            <meshPhysicalMaterial
              color={COLORS.panel}
              emissive={COLORS.cyan}
              emissiveIntensity={0.35}
              roughness={0.2}
              metalness={0.4}
              clearcoat={1}
              clearcoatRoughness={0.12}
            />
          </RoundedBox>
          <TextPlane
            text="Why is the sky blue?"
            wide
            color={COLORS.white}
            size={[1.82, 0.455]}
            position={[0, 0, 0.078]}
          />
        </group>
      ) : null}
      {QUESTION_TOKENS.map((label, index) => {
        const appear = start + 0.78 + index * 0.1;
        const progress = popIn(t, appear, 0.6);
        if (progress < 0.001) {
          return null;
        }
        const startPosition: V3 = [(index - 2.5) * 0.22, 0.62, 0.12];
        const endPosition: V3 = [(index - 2.5) * 0.4, -0.36, 0];
        return (
          <group
            key={label}
            position={[
              mix(startPosition[0], endPosition[0], progress),
              mix(startPosition[1], endPosition[1], progress),
              mix(startPosition[2], endPosition[2], progress),
            ]}
            rotation={[0, (1 - progress) * 0.6, (1 - progress) * 0.3]}
            scale={Math.max(0.001, progress)}
          >
            <RoundedBox
              args={[0.38, 0.38, 0.3]}
              radius={0.06}
              smoothness={4}
              castShadow={shadows}
            >
              <meshPhysicalMaterial
                color={index === 4 ? "#2b2413" : COLORS.panel}
                emissive={index === 4 ? COLORS.gold : COLORS.cyan}
                emissiveIntensity={index === 4 ? 0.75 : 0.42}
                roughness={0.18}
                metalness={0.4}
                clearcoat={1}
                clearcoatRoughness={0.1}
              />
            </RoundedBox>
            <TextPlane
              text={label}
              size={[0.29, 0.145]}
              position={[0, 0, 0.155]}
              color={COLORS.white}
            />
          </group>
        );
      })}
      <mesh
        position={[0, -0.64, 0.02]}
        scale={[Math.max(0.001, underline), 1, 1]}
      >
        <boxGeometry args={[1.9, 0.016, 0.016]} />
        <meshBasicMaterial color={COLORS.gold} toneMapped={false} />
      </mesh>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 4: candidate tokens and probability bars                      */
/* ------------------------------------------------------------------ */

const CANDIDATES = [
  { label: "air", probability: 0.14 },
  { label: "dark", probability: 0.21 },
  { label: "blue", probability: 0.46 },
  { label: "clear", probability: 0.11 },
  { label: "sea", probability: 0.08 },
];

const PredictScene: React.FC<{ t: number; shadows: boolean }> = ({
  t,
  shadows,
}) => {
  const start = getScene("predict").start;
  const winner = 2;
  const winnerGlow = smooth(start + 2.4, start + 3.2, t);
  const dim = 1 - 0.18 * smooth(start + 4.1, start + 4.6, t);
  const baseY = -1.18;

  return (
    <group>
      <Halo
        color={COLORS.gold}
        size={1.5}
        opacity={0.24 * winnerGlow}
        position={[0, 0.5, -0.35]}
      />
      <mesh position={[0, baseY, -0.08]}>
        <boxGeometry args={[2.28, 0.02, 0.1]} />
        <meshStandardMaterial
          color="#16223f"
          emissive={COLORS.cyan}
          emissiveIntensity={0.16}
          roughness={0.4}
          metalness={0.4}
        />
      </mesh>
      {CANDIDATES.map((candidate, index) => {
        const x = (index - 2) * 0.45;
        const cubePop = popIn(t, start + 0.35 + index * 0.14, 0.5);
        if (cubePop < 0.001) {
          return null;
        }
        const isWinner = index === winner;
        const rise = range(
          t,
          start + 0.7 + index * 0.18,
          start + 1.4 + index * 0.18,
          Easing.out(Easing.cubic),
        );
        const height = 0.2 + candidate.probability * 2;
        const visibleHeight = Math.max(0.001, height * rise);
        return (
          <group key={candidate.label}>
            <TokenCube
              label={candidate.label}
              size={0.36}
              depth={0.28}
              position={[
                x,
                0.48 + Math.sin(t * 1.4 + index) * 0.025,
                0,
              ]}
              scale={Math.max(0.001, cubePop * (isWinner ? 1 + winnerGlow * 0.06 : dim))}
              color={isWinner ? "#2b2413" : COLORS.panel}
              emissive={isWinner ? COLORS.gold : COLORS.cyan}
              emissiveIntensity={0.45 + (isWinner ? winnerGlow * 1.15 : 0)}
              roughness={0.18}
              metalness={0.4}
              shadows={shadows}
            />
            <RoundedBox
              args={[0.26, height, 0.12]}
              radius={0.05}
              smoothness={4}
              position={[x, baseY + visibleHeight / 2, -0.1]}
              scale={[1, Math.max(0.001, rise), 1]}
              castShadow={shadows}
              receiveShadow={shadows}
            >
              <meshPhysicalMaterial
                color={isWinner ? COLORS.gold : "#16405a"}
                emissive={isWinner ? COLORS.gold : COLORS.cyan}
                emissiveIntensity={isWinner ? 0.85 + winnerGlow * 0.5 : 0.35}
                roughness={0.18}
                metalness={0.4}
                clearcoat={1}
                clearcoatRoughness={0.1}
              />
            </RoundedBox>
            <TextPlane
              text={`${Math.round(candidate.probability * 100)}%`}
              color={isWinner ? COLORS.gold : COLORS.dim}
              size={[0.28, 0.14]}
              position={[x, baseY - 0.17, 0.02]}
              opacity={0.15 + 0.65 * rise}
            />
            {isWinner ? (
              <mesh
                position={[x, 0.48, -0.25]}
                scale={0.48 + winnerGlow * 0.16}
              >
                <torusGeometry args={[0.42, 0.008, 8, 96]} />
                <meshBasicMaterial
                  color={COLORS.gold}
                  transparent
                  opacity={0.35 + winnerGlow * 0.45}
                  toneMapped={false}
                  depthWrite={false}
                />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 5: growing chain and loop rings                               */
/* ------------------------------------------------------------------ */

const CHAIN_TOKENS = ["The", "sky", "is", "blue", "be", "cause", "light"];

const LoopScene: React.FC<{
  t: number;
  shadows: boolean;
}> = ({ t, shadows }) => {
  const start = getScene("loop").start;
  const beadAngle = t * 1.5;

  return (
    <group>
      <Halo
        color={COLORS.gold}
        size={2.5}
        opacity={0.12}
        position={[0, 0.05, -0.8]}
      />
      <mesh
        position={[0, 0.05, -0.55]}
        rotation={[0.12, 0, t * 0.55]}
        scale={[1, 0.82, 1]}
      >
        <torusGeometry args={[1.04, 0.012, 10, 140]} />
        <meshBasicMaterial
          color={COLORS.gold}
          transparent
          opacity={0.48}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh
        position={[0, 0.05, -0.7]}
        rotation={[-0.1, 0, -t * 0.42]}
        scale={[0.92, 0.92, 1]}
      >
        <torusGeometry args={[1.16, 0.008, 10, 140]} />
        <meshBasicMaterial
          color={COLORS.cyan}
          transparent
          opacity={0.32}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh
        position={[
          Math.cos(beadAngle) * 1.04,
          0.05 + Math.sin(beadAngle) * 0.85,
          -0.5,
        ]}
      >
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color={COLORS.white} toneMapped={false} />
      </mesh>
      {CHAIN_TOKENS.map((label, index) => {
        const appear = start + 0.5 + index * 0.72;
        if (t < appear) {
          return null;
        }
        const x = 1.05 - (t - appear) * 0.46;
        if (x < -1.2) {
          return null;
        }
        const pop = popIn(t, appear, 0.4);
        const edge = smooth(-1.2, -0.95, x);
        const isHero = label === "blue";
        return (
          <TokenCube
            key={`${label}-${index}`}
            label={label}
            size={0.32}
            depth={0.24}
            position={[x, 0.03, 0]}
            rotation={[0.02, Math.sin(t * 0.8 + index) * 0.1, 0]}
            scale={Math.max(0.001, pop * edge)}
            color={isHero ? "#2b2413" : COLORS.panel}
            emissive={isHero ? COLORS.gold : COLORS.cyan}
            emissiveIntensity={isHero ? 0.8 : 0.42}
            roughness={0.18}
            metalness={0.4}
            shadows={shadows}
          />
        );
      })}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 6: training streams into a glowing sphere                     */
/* ------------------------------------------------------------------ */

const TRAINING_ICONS: IconKind[] = ["page", "window", "code"];

const IconTile: React.FC<{
  kind: IconKind;
  position: V3;
  rotation?: V3;
  scale?: number;
  shadows?: boolean;
}> = ({ kind, position, rotation = [0, 0, 0], scale = 1, shadows = false }) => {
  const map = getIconTexture(kind);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <RoundedBox
        args={[0.44, 0.38, 0.14]}
        radius={0.06}
        smoothness={4}
        castShadow={shadows}
      >
        <meshPhysicalMaterial
          color="#0b1d36"
          emissive={COLORS.cyan}
          emissiveIntensity={0.3}
          roughness={0.2}
          metalness={0.5}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </RoundedBox>
      {map ? (
        <mesh position={[0, 0, 0.072]}>
          <planeGeometry args={[0.34, 0.34]} />
          <meshBasicMaterial
            map={map}
            transparent
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ) : null}
    </group>
  );
};

const TrainingScene: React.FC<{
  t: number;
  shadows: boolean;
  settings: QualityPreset;
}> = ({ t, shadows, settings }) => {
  const start = getScene("training").start;
  const local = t - start;
  const count = Math.max(12, Math.round(110 * settings.instanceScale));
  const geometry = getRoundedUnitBox();
  const flare =
    smooth(start + 4, start + 4.8, t) * (1 - smooth(start + 5, start + 5.8, t));

  const tiles = useMemo<InstanceItem[]>(() => {
    const items: InstanceItem[] = [];
    for (let i = 0; i < count; i += 1) {
      const phase = hash(i, 1);
      const speed = 0.16 + hash(i, 2) * 0.12;
      const cycle = ((local * speed + phase) % 1 + 1) % 1;
      const theta =
        hash(i, 3) * Math.PI * 2 +
        local * (0.25 + hash(i, 4) * 0.5) +
        cycle * 2.4;
      const phi = Math.acos(2 * hash(i, 5) - 1);
      const radius = mix(3.2, 0.92, cycle);
      const scale =
        (0.075 + hash(i, 6) * 0.055) *
        (0.45 + cycle * 0.55) *
        (1 - smooth(0.9, 1, cycle));
      const direction = [
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi) * 0.7,
        Math.sin(phi) * Math.sin(theta) * 0.55,
      ];
      items.push({
        position: [
          direction[0] * radius,
          direction[1] * radius + 0.02,
          direction[2] * radius,
        ],
        rotation: [
          hash(i, 7) * 6.28 + local * 1.1,
          hash(i, 8) * 6.28 + local * 0.7,
          hash(i, 9) * 6.28,
        ],
        scale: [scale, scale * 0.72, scale * 0.16],
        color:
          i % 9 === 0
            ? COLORS.gold
            : i % 4 === 0
              ? COLORS.white
              : COLORS.cyan,
      });
    }
    return items;
  }, [count, local]);

  return (
    <group>
      <Halo color={COLORS.cyan} size={3.4} opacity={0.2} position={[0, 0, -0.8]} />
      <GlowSphere
        radius={0.9}
        segments={settings.sphereSegments}
        position={[0, -0.05, 0]}
        color="#082033"
        emissive={COLORS.cyan}
        emissiveIntensity={0.7 + 0.18 * Math.sin(local * 1.7) + flare * 0.8}
        roughness={0.14}
        metalness={0.45}
        shadows={shadows}
      />
      <GlowSphere
        radius={0.52}
        segments={Math.max(16, settings.sphereSegments - 12)}
        position={[0, -0.05, 0]}
        color="#dff7ff"
        emissive={COLORS.white}
        emissiveIntensity={2.1}
        roughness={0.08}
        metalness={0.1}
        opacity={0.32}
      />
      <mesh position={[0, -0.05, 0]} scale={1.04}>
        <icosahedronGeometry args={[0.9, 2]} />
        <meshBasicMaterial
          color={COLORS.cyan}
          wireframe
          transparent
          opacity={0.15}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh
        position={[0, -0.05, 0]}
        rotation={[0.7, t * 0.22, 0]}
        scale={[1, 0.94, 1]}
      >
        <torusGeometry args={[1.14, 0.01, 8, 140]} />
        <meshBasicMaterial
          color={COLORS.cyan}
          transparent
          opacity={0.4}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh
        position={[0, -0.05, 0]}
        rotation={[-0.5, -t * 0.18, 0.3]}
        scale={[1.08, 1, 1]}
      >
        <torusGeometry args={[1.32, 0.008, 8, 140]} />
        <meshBasicMaterial
          color={COLORS.gold}
          transparent
          opacity={0.28}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <Instanced
        geometry={geometry}
        items={tiles}
        capacity={Math.max(12, Math.round(140 * settings.instanceScale))}
        color="#ffffff"
        emissive={COLORS.cyan}
        emissiveIntensity={0.55}
        roughness={0.3}
        metalness={0.35}
        shadows={shadows}
      />
      {TRAINING_ICONS.map((kind, index) => {
        const rate = 0.1 + index * 0.012;
        const cycle = ((local * rate + index / TRAINING_ICONS.length) % 1 + 1) % 1;
        const angle = local * 0.4 + index * 2.1;
        const radius = mix(2.5, 1.02, cycle);
        const scale =
          (0.95 - 0.22 * cycle) * (1 - smooth(0.82, 1, cycle));
        if (scale < 0.01) {
          return null;
        }
        return (
          <IconTile
            key={kind}
            kind={kind}
            position={[
              Math.cos(angle) * radius,
              Math.sin(angle) * radius * 0.55,
              0.7 + Math.sin(angle) * 0.15,
            ]}
            rotation={[0, 0, Math.sin(angle) * 0.22]}
            scale={scale}
            shadows={shadows}
          />
        );
      })}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 7: attention between word nodes                               */
/* ------------------------------------------------------------------ */

const ATTENTION_WORDS = ["The", "cat", "sat", "on", "the", "mat"];

const ATTENTION_EDGES: [number, number, number][] = [
  [0, 1, 0.9],
  [1, 2, 0.85],
  [2, 3, 0.5],
  [3, 4, 0.3],
  [4, 5, 0.6],
  [1, 5, 0.22],
  [0, 5, 0.18],
  [1, 3, 0.4],
  [2, 4, 0.35],
  [1, 4, 0.55],
  [0, 2, 0.3],
  [2, 5, 0.45],
  [0, 4, 0.2],
  [3, 5, 0.28],
  [0, 3, 0.12],
];

const ATTENTION_NODE_GEOMETRY = new THREE.SphereGeometry(1, 18, 18);

const ATTENTION_NODES = ATTENTION_WORDS.map((word, index) => {
  const angle = Math.PI / 2 + (index * Math.PI * 2) / ATTENTION_WORDS.length;
  return {
    word,
    angle,
    x: Math.cos(angle) * 0.78,
    y: Math.sin(angle) * 0.78,
  };
});

const AttentionScene: React.FC<{ t: number; shadows: boolean }> = ({ t }) => {
  const start = getScene("attention").start;
  const geometry = getRoundedUnitBox();
  const edgeIn = smooth(start + 0.5, start + 2.2, t);

  const nodes = useMemo<InstanceItem[]>(() => {
    return ATTENTION_NODES.map((node, index) => {
      const pop = popIn(t, start + 0.15 + index * 0.1, 0.45);
      const bob = Math.sin(t * 0.8 + index) * 0.015;
      return {
        position: [node.x, node.y + bob, 0],
        scale: 0.11 * Math.max(0.001, pop),
      };
    });
  }, [t, start]);

  const goldNodes = nodes.filter((_, index) => index % 3 === 0);
  const cyanNodes = nodes.filter((_, index) => index % 3 !== 0);

  const strongEdges = useMemo<InstanceItem[]>(() => {
    return ATTENTION_EDGES.filter((edge) => edge[2] >= 0.5).map((edge) => {
      const a = ATTENTION_NODES[edge[0]];
      const b = ATTENTION_NODES[edge[1]];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const thickness = (0.008 + edge[2] * 0.03) * edgeIn;
      return {
        position: [(a.x + b.x) / 2, (a.y + b.y) / 2, -0.02],
        rotation: [0, 0, Math.atan2(dy, dx)],
        scale: [length, Math.max(0.0001, thickness), Math.max(0.0001, thickness)],
      };
    });
  }, [edgeIn]);

  const weakEdges = useMemo<InstanceItem[]>(() => {
    return ATTENTION_EDGES.filter((edge) => edge[2] < 0.5).map((edge) => {
      const a = ATTENTION_NODES[edge[0]];
      const b = ATTENTION_NODES[edge[1]];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const thickness = (0.007 + edge[2] * 0.022) * edgeIn;
      return {
        position: [(a.x + b.x) / 2, (a.y + b.y) / 2, -0.02],
        rotation: [0, 0, Math.atan2(dy, dx)],
        scale: [length, Math.max(0.0001, thickness), Math.max(0.0001, thickness)],
      };
    });
  }, [edgeIn]);

  return (
    <group>
      <Halo color={COLORS.cyan} size={2.8} opacity={0.14} position={[0, 0, -0.7]} />
      <mesh position={[0, 0, -0.35]} scale={[1, 1, 1]}>
        <torusGeometry args={[0.78, 0.006, 8, 120]} />
        <meshBasicMaterial
          color={COLORS.cyan}
          transparent
          opacity={0.14}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <Instanced
        geometry={geometry}
        items={weakEdges}
        capacity={ATTENTION_EDGES.length}
        color="#0a2c38"
        emissive={COLORS.cyan}
        emissiveIntensity={1.5}
        roughness={0.3}
        metalness={0.4}
      />
      <Instanced
        geometry={geometry}
        items={strongEdges}
        capacity={ATTENTION_EDGES.length}
        color="#3a2a0e"
        emissive={COLORS.gold}
        emissiveIntensity={1.5}
        roughness={0.3}
        metalness={0.4}
      />
      <Instanced
        geometry={ATTENTION_NODE_GEOMETRY}
        items={cyanNodes}
        capacity={ATTENTION_WORDS.length}
        color="#0a2a33"
        emissive={COLORS.cyan}
        emissiveIntensity={1.7}
        roughness={0.22}
        metalness={0.35}
        shadows={false}
      />
      <Instanced
        geometry={ATTENTION_NODE_GEOMETRY}
        items={goldNodes}
        capacity={ATTENTION_WORDS.length}
        color="#3a2a0e"
        emissive={COLORS.gold}
        emissiveIntensity={1.7}
        roughness={0.22}
        metalness={0.35}
        shadows={false}
      />
      {ATTENTION_NODES.map((node, index) => {
        const labelOpacity = smooth(
          start + 0.25 + index * 0.08,
          start + 0.7 + index * 0.08,
          t,
        );
        return (
          <group key={node.word}>
            <TextPlane
              text={node.word}
              size={[0.38, 0.19]}
              position={[
                Math.cos(node.angle) * 1.03,
                Math.sin(node.angle) * 1.03,
                0.06,
              ]}
              opacity={labelOpacity}
            />
            <Halo
              color={index % 3 === 0 ? COLORS.gold : COLORS.cyan}
              size={0.46}
              opacity={0.3 * labelOpacity}
              position={[node.x, node.y, 0.12]}
            />
          </group>
        );
      })}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 8: checks and crosses tune the sphere                         */
/* ------------------------------------------------------------------ */

const FEEDBACK_HITS: { offset: number; kind: MarkKind; from: V3 }[] = [
  { offset: 0.75, kind: "check", from: [-2.1, 1, 0.6] },
  { offset: 1.1, kind: "cross", from: [2.15, -0.8, 0.5] },
  { offset: 1.45, kind: "check", from: [1.9, 1.2, -0.4] },
  { offset: 1.8, kind: "cross", from: [-1.9, -1.1, 0.4] },
  { offset: 2.15, kind: "check", from: [-0.4, 1.8, 0.8] },
  { offset: 2.5, kind: "cross", from: [0.6, -1.8, 0.7] },
];

const FeedbackScene: React.FC<{
  t: number;
  shadows: boolean;
  segments: number;
}> = ({ t, shadows, segments }) => {
  const start = getScene("feedback").start;
  const hits = FEEDBACK_HITS.map((hit) => ({
    ...hit,
    at: start + hit.offset,
  }));
  const impact = hits.reduce(
    (sum, hit) => sum + Math.exp(-Math.pow((t - hit.at) / 0.12, 2)),
    0,
  );

  return (
    <group>
      <Halo
        color={COLORS.cyan}
        size={3}
        opacity={0.16 + Math.min(0.25, impact * 0.12)}
        position={[0, 0, -0.7]}
      />
      <GlowSphere
        radius={0.82}
        segments={segments}
        position={[0, 0, 0]}
        color="#082033"
        emissive={impact > 0.2 ? COLORS.gold : COLORS.cyan}
        emissiveIntensity={0.75 + Math.min(1.6, impact * 0.7) + 0.12 * Math.sin(t * 2)}
        roughness={0.15}
        metalness={0.45}
        shadows={shadows}
      />
      <mesh position={[0, 0, 0]} scale={1.05}>
        <icosahedronGeometry args={[0.82, 2]} />
        <meshBasicMaterial
          color={COLORS.gold}
          wireframe
          transparent
          opacity={0.12}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      {[
        { radius: 1.02, tilt: 0.4, speed: 0.5, color: COLORS.cyan, opacity: 0.45 },
        { radius: 1.16, tilt: -0.55, speed: -0.36, color: COLORS.gold, opacity: 0.35 },
        { radius: 1.3, tilt: 0.2, speed: 0.24, color: COLORS.white, opacity: 0.18 },
      ].map((ring, index) => (
        <mesh
          key={index}
          position={[0, 0, 0]}
          rotation={[ring.tilt, t * ring.speed, index * 0.6]}
        >
          <torusGeometry args={[ring.radius, 0.008, 8, 140]} />
          <meshBasicMaterial
            color={ring.color}
            transparent
            opacity={ring.opacity}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}
      {hits.map((hit, index) => {
        const progress = range(
          t,
          hit.at - 0.55,
          hit.at,
          Easing.in(Easing.cubic),
        );
        const appear = popIn(t, hit.at - 0.62, 0.35);
        const after = smooth(hit.at + 0.02, hit.at + 0.34, t);
        const scale = appear * (1 - after);
        const targetLength = Math.sqrt(
          hit.from[0] * hit.from[0] +
            hit.from[1] * hit.from[1] +
            hit.from[2] * hit.from[2],
        );
        const target: V3 = [
          (hit.from[0] / targetLength) * 0.88,
          (hit.from[1] / targetLength) * 0.88,
          (hit.from[2] / targetLength) * 0.88,
        ];
        const position: V3 = [
          mix(hit.from[0], target[0], progress),
          mix(hit.from[1], target[1], progress),
          mix(hit.from[2], target[2], progress),
        ];
        const color = hit.kind === "check" ? COLORS.green : COLORS.red;
        const ringProgress = smooth(hit.at, hit.at + 0.55, t);
        return (
          <group key={index}>
            {scale > 0.01 ? (
              <group
                position={position}
                rotation={[
                  0.2 * Math.sin(t * 2 + index),
                  0.25 * Math.cos(t * 1.7 + index),
                  0.1 * Math.sin(t * 3 + index),
                ]}
                scale={Math.max(0.001, scale)}
              >
                <RoundedBox
                  args={[0.3, 0.3, 0.3]}
                  radius={0.06}
                  smoothness={4}
                  castShadow={shadows}
                >
                  <meshPhysicalMaterial
                    color={hit.kind === "check" ? "#0d2a22" : "#2a0f18"}
                    emissive={color}
                    emissiveIntensity={1.1}
                    roughness={0.16}
                    metalness={0.35}
                    clearcoat={1}
                    clearcoatRoughness={0.08}
                  />
                </RoundedBox>
                <Mark
                  kind={hit.kind}
                  color={color}
                  size={0.2}
                  position={[0, 0, 0.155]}
                />
              </group>
            ) : null}
            {t > hit.at && ringProgress < 0.999 ? (
              <mesh
                position={[0, 0, 0]}
                scale={0.85 + ringProgress * 1.15}
              >
                <ringGeometry args={[0.985, 1, 72]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={(1 - ringProgress) * 0.42}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                  toneMapped={false}
                />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 9: a confident answer with a spreading crack                  */
/* ------------------------------------------------------------------ */

const CRACK_POINTS: [number, number][] = [
  [-0.72, 0.3],
  [-0.5, 0.2],
  [-0.56, 0.06],
  [-0.32, -0.04],
  [-0.38, -0.18],
  [-0.1, -0.24],
  [0.02, -0.1],
  [0.2, -0.18],
  [0.26, -0.32],
  [0.48, -0.3],
  [0.66, -0.16],
];

const CRACK_SEGMENTS = CRACK_POINTS.slice(1).map((point, index) => {
  const previous = CRACK_POINTS[index];
  const dx = point[0] - previous[0];
  const dy = point[1] - previous[1];
  return {
    x: (point[0] + previous[0]) / 2,
    y: (point[1] + previous[1]) / 2,
    length: Math.sqrt(dx * dx + dy * dy),
    angle: Math.atan2(dy, dx),
  };
});

const AnswerScene: React.FC<{ t: number; shadows: boolean }> = ({
  t,
  shadows,
}) => {
  const start = getScene("answer").start;
  const blockPop = popIn(t, start + 0.15, 0.5);

  return (
    <group>
      <Halo color={COLORS.gold} size={2.8} opacity={0.18} position={[0, 0, -0.8]} />
      <group scale={Math.max(0.001, blockPop)}>
        <RoundedBox
          args={[1.78, 0.93, 0.16]}
          radius={0.06}
          smoothness={5}
          position={[0, 0, -0.06]}
          castShadow={shadows}
        >
          <meshPhysicalMaterial
            color="#3a2a10"
            emissive={COLORS.gold}
            emissiveIntensity={0.35}
            roughness={0.24}
            metalness={0.6}
            clearcoat={1}
            clearcoatRoughness={0.12}
          />
        </RoundedBox>
        <RoundedBox
          args={[1.7, 0.85, 0.18]}
          radius={0.08}
          smoothness={5}
          castShadow={shadows}
          receiveShadow={shadows}
        >
          <meshPhysicalMaterial
            color="#dfe8ff"
            emissive={COLORS.gold}
            emissiveIntensity={0.16 + 0.08 * Math.sin(t * 2)}
            roughness={0.18}
            metalness={0.15}
            clearcoat={1}
            clearcoatRoughness={0.08}
            envMapIntensity={1.6}
          />
        </RoundedBox>
        <TextPlane
          text="ANSWER"
          color={COLORS.gold}
          size={[0.55, 0.1375]}
          wide
          fontPx={190}
          position={[0, 0.29, 0.1]}
        />
        <Mark
          kind="check"
          color={COLORS.green}
          size={0.44}
          position={[0, -0.06, 0.101]}
        />
        {CRACK_SEGMENTS.map((segment, index) => {
          const grow = range(
            t,
            start + 2.1 + index * 0.17,
            start + 2.24 + index * 0.17,
            Easing.out(Easing.cubic),
          );
          if (grow < 0.001) {
            return null;
          }
          return (
            <group key={index}>
              <mesh
                position={[segment.x, segment.y, 0.096]}
                rotation={[0, 0, segment.angle]}
                scale={[Math.max(0.001, grow), 1, 1]}
              >
                <boxGeometry args={[segment.length, 0.034, 0.012]} />
                <meshBasicMaterial color="#1a0a14" />
              </mesh>
              <mesh
                position={[segment.x, segment.y, 0.104]}
                rotation={[0, 0, segment.angle]}
                scale={[Math.max(0.001, grow), 1, 1]}
              >
                <boxGeometry args={[segment.length, 0.009, 0.012]} />
                <meshBasicMaterial color={COLORS.red} toneMapped={false} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 10: green confidence, then the red question                   */
/* ------------------------------------------------------------------ */

const WrongScene: React.FC<{ t: number; shadows: boolean }> = ({
  t,
  shadows,
}) => {
  const start = getScene("wrong").start;
  const green =
    range(t, start + 0.35, start + 0.75) *
    (1 - range(t, start + 1.35, start + 1.75));
  const red = range(t, start + 1.5, start + 2);
  const shake = red * 0.012 * Math.sin(t * 46);
  const blockColor = new THREE.Color("#dfe8ff")
    .lerp(new THREE.Color("#123528"), green * 0.55)
    .lerp(new THREE.Color("#2a0c15"), red * 0.7);
  const emissive = new THREE.Color(COLORS.gold)
    .lerp(new THREE.Color(COLORS.green), green)
    .lerp(new THREE.Color(COLORS.red), red);
  const questionScale = popIn(t, start + 1.55, 0.35);
  const flicker = 0.55 + 0.45 * (Math.sin(t * 33) > 0 ? 1 : 0.18);
  const greenRing = range(t, start + 0.6, start + 1.5, Easing.out(Easing.cubic));
  const redRing = range(t, start + 1.9, start + 2.6, Easing.out(Easing.cubic));

  return (
    <group position={[shake, 0, 0]}>
      <Halo
        color={red > 0.2 ? COLORS.red : COLORS.green}
        size={2.8}
        opacity={0.12 + green * 0.14 + red * 0.16}
        position={[0, 0, -0.8]}
      />
      <group scale={Math.max(0.001, popIn(t, start + 0.05, 0.4))}>
        <RoundedBox
          args={[1.68, 0.92, 0.16]}
          radius={0.06}
          smoothness={5}
          position={[0, 0, -0.06]}
          castShadow={shadows}
        >
          <meshPhysicalMaterial
            color="#3a2a10"
            emissive={emissive}
            emissiveIntensity={0.35 + green * 0.5 + red * 0.4}
            roughness={0.24}
            metalness={0.6}
            clearcoat={1}
            clearcoatRoughness={0.12}
          />
        </RoundedBox>
        <RoundedBox
          args={[1.6, 0.84, 0.18]}
          radius={0.08}
          smoothness={5}
          castShadow={shadows}
          receiveShadow={shadows}
        >
          <meshPhysicalMaterial
            color={blockColor}
            emissive={emissive}
            emissiveIntensity={0.22 + green * 1.05 + red * 0.95}
            roughness={0.18}
            metalness={0.15}
            clearcoat={1}
            clearcoatRoughness={0.08}
            envMapIntensity={1.6}
          />
        </RoundedBox>
        <TextPlane
          text="ANSWER"
          color={red > 0.4 ? COLORS.red : COLORS.gold}
          size={[0.55, 0.1375]}
          wide
          fontPx={190}
          position={[0, 0.28, 0.1]}
        />
        <Mark
          kind="check"
          color={COLORS.green}
          size={0.44}
          position={[0, -0.06, 0.101]}
          opacity={1 - smooth(start + 1.35, start + 1.7, t)}
        />
        {questionScale > 0.01 ? (
          <Glyph
            text="?"
            color={COLORS.red}
            size={0.56}
            position={[0, -0.04, 0.105]}
            opacity={flicker}
            scale={questionScale}
          />
        ) : null}
        {CRACK_SEGMENTS.map((segment, index) => (
          <group key={index}>
            <mesh
              position={[segment.x, segment.y, 0.096]}
              rotation={[0, 0, segment.angle]}
            >
              <boxGeometry args={[segment.length, 0.034, 0.012]} />
              <meshBasicMaterial color="#1a0a14" />
            </mesh>
            <mesh
              position={[segment.x, segment.y, 0.104]}
              rotation={[0, 0, segment.angle]}
            >
              <boxGeometry args={[segment.length, 0.009, 0.012]} />
              <meshBasicMaterial
                color={red > 0.2 ? COLORS.red : "#7a2030"}
                toneMapped={false}
              />
            </mesh>
          </group>
        ))}
      </group>
      {greenRing > 0.001 && greenRing < 0.999 ? (
        <mesh scale={0.6 + greenRing * 1.7}>
          <ringGeometry args={[0.985, 1, 80]} />
          <meshBasicMaterial
            color={COLORS.green}
            transparent
            opacity={(1 - greenRing) * 0.36}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ) : null}
      {redRing > 0.001 && redRing < 0.999 ? (
        <mesh scale={0.6 + redRing * 1.9}>
          <ringGeometry args={[0.985, 1, 80]} />
          <meshBasicMaterial
            color={COLORS.red}
            transparent
            opacity={(1 - redRing) * 0.4}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ) : null}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 11: small helper orb and verify ring                          */
/* ------------------------------------------------------------------ */

const HelperScene: React.FC<{ t: number; segments: number; shadows: boolean }> = ({
  t,
  segments,
  shadows,
}) => {
  const start = getScene("helper").start;
  const shrink = smooth(start, start + 0.9, t);
  const orbScale = mix(1, 0.3, shrink);
  const orbX = mix(0, -0.6, shrink);
  const orbY = mix(0, -0.12, shrink);
  const ringIn = smooth(start + 0.35, start + 1, t);
  const checkPop = popIn(t, start + 1.45, 0.45);
  const beadAngle = t * 1.7;

  return (
    <group>
      <Halo
        color={COLORS.cyan}
        size={2.6 * orbScale}
        opacity={0.14 + 0.14 * shrink}
        position={[orbX, orbY, -0.8]}
      />
      <Halo
        color={COLORS.cyan}
        size={1.1 * orbScale}
        opacity={0.35}
        position={[orbX, orbY, -0.1]}
      />
      <GlowSphere
        radius={0.9}
        segments={segments}
        position={[orbX, orbY, 0]}
        scale={Math.max(0.001, orbScale)}
        color="#0d2b3c"
        emissive={COLORS.cyan}
        emissiveIntensity={0.9 + 0.4 * shrink}
        roughness={0.12}
        metalness={0.4}
        shadows={shadows}
      />
      <mesh position={[-0.18, -0.16, 0]} rotation={[0, 0, 0.08]}>
        <boxGeometry args={[0.54, 0.012, 0.012]} />
        <meshBasicMaterial
          color={COLORS.gold}
          transparent
          opacity={0.5 * ringIn}
          toneMapped={false}
        />
      </mesh>
      <group position={[0.58, 0.02, 0]} scale={Math.max(0.001, ringIn)}>
        <mesh rotation={[0.18, 0, beadAngle]}>
          <torusGeometry args={[0.4, 0.016, 10, 110]} />
          <meshPhysicalMaterial
            color={COLORS.gold}
            emissive={COLORS.gold}
            emissiveIntensity={0.9}
            roughness={0.18}
            metalness={0.6}
            clearcoat={1}
          />
        </mesh>
        <mesh
          position={[
            Math.cos(beadAngle) * 0.4,
            Math.sin(beadAngle) * 0.4,
            0.02,
          ]}
        >
          <sphereGeometry args={[0.034, 14, 14]} />
          <meshBasicMaterial color={COLORS.white} toneMapped={false} />
        </mesh>
        {checkPop > 0.01 ? (
          <Mark
            kind="check"
            color={COLORS.green}
            size={0.36}
            position={[0, 0, 0.05]}
            scale={checkPop}
            opacity={0.95}
          />
        ) : null}
      </group>
      <TextPlane
        text="Verify"
        color={COLORS.gold}
        size={[0.62, 0.155]}
        wide
        fontPx={190}
        position={[0.58, 0.62, 0.02]}
        opacity={ringIn}
      />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 12: final 3D flourish behind the end card                     */
/* ------------------------------------------------------------------ */

const FinalScene: React.FC<{ t: number; segments: number }> = ({
  t,
  segments,
}) => {
  const local = t - 62;
  const pulse = 0.5 + 0.5 * Math.sin(local * 4);
  const appear = popIn(t, 62, 0.6);

  return (
    <group position={[0, -0.85, 0]} scale={Math.max(0.001, appear)}>
      <Halo color={COLORS.cyan} size={2} opacity={0.2 + pulse * 0.1} />
      <GlowSphere
        radius={0.22}
        segments={segments}
        color="#0d2b3c"
        emissive={COLORS.cyan}
        emissiveIntensity={1.1 + pulse * 0.6}
        roughness={0.12}
        metalness={0.4}
      />
      <mesh position={[0.45, 0, 0]} rotation={[0.18, 0, t * 0.8]}>
        <torusGeometry args={[0.3, 0.011, 10, 96]} />
        <meshBasicMaterial
          color={COLORS.gold}
          transparent
          opacity={0.7}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <Mark
        kind="check"
        color={COLORS.green}
        size={0.28}
        position={[0.45, 0, 0.03]}
        opacity={0.9}
      />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Scene switch                                                        */
/* ------------------------------------------------------------------ */

const Content: React.FC<{ t: number; settings: QualityPreset }> = ({
  t,
  settings,
}) => {
  const scene = sceneAt(t);
  let content: React.ReactNode = null;

  switch (scene.id) {
    case "void":
      content = <VoidCursorScene t={t} />;
      break;
    case "assemble":
      content = <AssembleScene t={t} shadows={settings.shadows} />;
      break;
    case "tokens":
      content = (
        <TokensScene t={t} shadows={settings.shadows} />
      );
      break;
    case "question":
      content = <QuestionScene t={t} shadows={settings.shadows} />;
      break;
    case "predict":
      content = <PredictScene t={t} shadows={settings.shadows} />;
      break;
    case "loop":
      content = (
        <LoopScene t={t} shadows={settings.shadows} />
      );
      break;
    case "training":
      content = (
        <TrainingScene t={t} shadows={settings.shadows} settings={settings} />
      );
      break;
    case "attention":
      content = <AttentionScene t={t} shadows={settings.shadows} />;
      break;
    case "feedback":
      content = (
        <FeedbackScene
          t={t}
          shadows={settings.shadows}
          segments={settings.sphereSegments}
        />
      );
      break;
    case "answer":
      content = <AnswerScene t={t} shadows={settings.shadows} />;
      break;
    case "wrong":
      content = <WrongScene t={t} shadows={settings.shadows} />;
      break;
    case "helper":
      content = (
        <HelperScene
          t={t}
          segments={settings.sphereSegments}
          shadows={settings.shadows}
        />
      );
      break;
    case "final":
      content = <FinalScene t={t} segments={settings.sphereSegments} />;
      break;
    default:
      content = null;
  }

  return (
    <SceneGroup id={scene.id} t={t}>
      {content}
    </SceneGroup>
  );
};

/* ------------------------------------------------------------------ */
/* Composition canvas                                                  */
/* ------------------------------------------------------------------ */

export const Scene3D: React.FC<{ quality: Quality }> = ({ quality }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const settings = QUALITY_PRESETS[resolveQuality(quality)];

  return (
    <ThreeCanvas
      width={width}
      height={height}
      dpr={1}
      shadows={settings.shadows}
      camera={{ fov: 40, near: 0.1, far: 80, position: [0, 0.12, 6.2] }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[COLORS.bg]} />
      <fog attach="fog" args={[COLORS.bg, 8, 24]} />
      <CameraRig t={t} />
      <Lighting settings={settings} />
      <StudioEnvironment settings={settings} />
      <Floor settings={settings} />
      <Dust t={t} count={settings.instanceScale > 0.6 ? 64 : 26} />
      <Content t={t} settings={settings} />
      {settings.contactShadows ? (
        <ContactShadows
          position={[0, -2.03, 0]}
          scale={11}
          resolution={settings.contactShadowResolution}
          blur={2.6}
          far={3.4}
          opacity={0.5}
          color="#01040c"
          frames={Infinity}
        />
      ) : null}
    </ThreeCanvas>
  );
};
