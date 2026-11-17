import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { COLORS } from "./config";

export type V3 = [number, number, number];

export type SymbolKind = "triangle" | "ring" | "hexagon" | "wave";

/** Card size in world units. Kept small so three fit inside the phone screen. */
export const CARD_W = 1.02;
export const CARD_H = 1.38;
export const CARD_D = 0.058;

const hexToRgb = (hex: string) => {
  const value = parseInt(hex.replace("#", ""), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

export const rgba = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const roundRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

export const canvasTexture = (canvas: HTMLCanvasElement) => {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
};

/* -------------------------------------------------------------------- */
/* Geometry                                                              */
/* -------------------------------------------------------------------- */

const makeRoundedBox = (
  width: number,
  height: number,
  depth: number,
  radius: number,
): THREE.BufferGeometry => {
  const bevel = Math.min(radius * 0.55, depth * 0.32, width * 0.08);
  const innerW = Math.max(0.001, width - bevel * 2);
  const innerH = Math.max(0.001, height - bevel * 2);
  const innerD = Math.max(0.001, depth - bevel * 2);
  const r = Math.min(radius, innerW / 2, innerH / 2);

  const shape = new THREE.Shape();
  const halfW = innerW / 2;
  const halfH = innerH / 2;
  shape.moveTo(-halfW + r, -halfH);
  shape.lineTo(halfW - r, -halfH);
  shape.quadraticCurveTo(halfW, -halfH, halfW, -halfH + r);
  shape.lineTo(halfW, halfH - r);
  shape.quadraticCurveTo(halfW, halfH, halfW - r, halfH);
  shape.lineTo(-halfW + r, halfH);
  shape.quadraticCurveTo(-halfW, halfH, -halfW, halfH - r);
  shape.lineTo(-halfW, -halfH + r);
  shape.quadraticCurveTo(-halfW, -halfH, -halfW + r, -halfH);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: innerD,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 8,
    steps: 1,
  });
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
};

let cardGeometry: THREE.BufferGeometry | null = null;
let cardFaceGeometry: THREE.BufferGeometry | null = null;

export const getCardGeometry = (): THREE.BufferGeometry => {
  if (!cardGeometry) {
    cardGeometry = makeRoundedBox(CARD_W, CARD_H, CARD_D, 0.085);
  }
  return cardGeometry;
};

const getCardFaceGeometry = (): THREE.BufferGeometry => {
  if (!cardFaceGeometry) {
    const plane = new THREE.PlaneGeometry(CARD_W * 0.958, CARD_H * 0.958);
    plane.translate(0, 0, CARD_D / 2 + 0.0035);
    cardFaceGeometry = plane;
  }
  return cardFaceGeometry;
};

export const roundedBoxGeometry = makeRoundedBox;

/* -------------------------------------------------------------------- */
/* Procedural feed card art                                              */
/* -------------------------------------------------------------------- */

type CardPalette = {
  base: string;
  deep: string;
  glow: string;
  accent: string;
};

const CARD_PALETTES: CardPalette[] = [
  { base: "#0d3450", deep: "#050d18", glow: "#5fe3ff", accent: "#b6f0ff" },
  { base: "#123a34", deep: "#04100f", glow: "#7dffc4", accent: "#d2ffe9" },
  { base: "#3a2914", deep: "#120b04", glow: "#ffc471", accent: "#ffe4b5" },
  { base: "#241a44", deep: "#0a0714", glow: "#b79bff", accent: "#e2d7ff" },
  { base: "#0b2440", deep: "#040a14", glow: "#7fb6ff", accent: "#d3e4ff" },
  { base: "#33192a", deep: "#0e0509", glow: "#ff9fba", accent: "#ffd6e2" },
];

const drawCardArt = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: CardPalette,
  variant: number,
) => {
  const artBottom = height * 0.66;
  const base = ctx.createLinearGradient(0, 0, width, artBottom);
  base.addColorStop(0, palette.base);
  base.addColorStop(0.55, palette.deep);
  base.addColorStop(1, "#04080f");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const bloom = ctx.createRadialGradient(
    width * (0.3 + (variant % 3) * 0.14),
    artBottom * (0.36 + (variant % 2) * 0.12),
    8,
    width * 0.4,
    artBottom * 0.4,
    width * 0.85,
  );
  bloom.addColorStop(0, rgba(palette.glow, 0.42));
  bloom.addColorStop(0.45, rgba(palette.glow, 0.12));
  bloom.addColorStop(1, rgba(palette.glow, 0));
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 4; i += 1) {
    const x = width * (0.2 + ((i * 0.23 + variant * 0.07) % 0.62));
    const y = artBottom * (0.2 + ((i * 0.31 + variant * 0.11) % 0.6));
    const r = width * (0.16 + ((i * 7 + variant) % 5) * 0.035);
    const ring = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    ring.addColorStop(0, rgba(palette.accent, 0.28));
    ring.addColorStop(0.7, rgba(palette.glow, 0.1));
    ring.addColorStop(1, rgba(palette.glow, 0));
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Thin abstract glass shards, no readable marks.
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i += 1) {
    ctx.strokeStyle = rgba(palette.accent, 0.2 - i * 0.05);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(width * (0.08 + i * 0.06), artBottom * (0.86 - i * 0.14));
    ctx.quadraticCurveTo(
      width * 0.5,
      artBottom * (0.2 + i * 0.16),
      width * (0.94 - i * 0.05),
      artBottom * (0.7 - i * 0.2),
    );
    ctx.stroke();
  }

  // Soft icon: a simple abstract mark, deliberately not a glyph.
  ctx.strokeStyle = rgba(palette.accent, 0.75);
  ctx.lineWidth = 5;
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 32;
  const iconX = width * 0.5;
  const iconY = artBottom * 0.46;
  const iconR = width * 0.13;
  ctx.beginPath();
  if (variant % 3 === 0) {
    ctx.arc(iconX, iconY, iconR, 0.2, Math.PI * 1.55);
  } else if (variant % 3 === 1) {
    ctx.moveTo(iconX - iconR, iconY + iconR * 0.6);
    ctx.lineTo(iconX, iconY - iconR * 0.8);
    ctx.lineTo(iconX + iconR, iconY + iconR * 0.6);
    ctx.closePath();
  } else {
    ctx.moveTo(iconX - iconR, iconY);
    ctx.bezierCurveTo(
      iconX - iconR * 0.4,
      iconY - iconR,
      iconX + iconR * 0.4,
      iconY + iconR,
      iconX + iconR,
      iconY,
    );
  }
  ctx.stroke();
  ctx.restore();

  const fade = ctx.createLinearGradient(0, height * 0.5, 0, height);
  fade.addColorStop(0, "rgba(3,7,14,0)");
  fade.addColorStop(0.55, "rgba(3,7,14,0.55)");
  fade.addColorStop(1, "rgba(3,7,14,0.9)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, height * 0.5, width, height * 0.5);

  // Fake UI: avatar, blank caption bars, action dots. No text at all.
  ctx.fillStyle = rgba(COLORS.white, 0.16);
  ctx.beginPath();
  ctx.arc(width * 0.11, height * 0.79, width * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(palette.glow, 0.5);
  ctx.lineWidth = 2;
  ctx.stroke();

  const bars = [
    { y: 0.755, w: 0.5, a: 0.72, h: 9 },
    { y: 0.795, w: 0.36, a: 0.42, h: 8 },
    { y: 0.83, w: 0.24, a: 0.26, h: 8 },
  ];
  bars.forEach((bar) => {
    ctx.fillStyle = rgba(COLORS.white, bar.a);
    roundRectPath(
      ctx,
      width * 0.19,
      height * bar.y,
      width * bar.w,
      bar.h,
      bar.h / 2,
    );
    ctx.fill();
  });

  ctx.fillStyle = rgba(COLORS.white, 0.28);
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(width * (0.62 + i * 0.1), height * 0.86, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = rgba(COLORS.white, 0.14);
  ctx.lineWidth = 3;
  roundRectPath(ctx, 3, 3, width - 6, height - 6, width * 0.075);
  ctx.stroke();

  const sheen = ctx.createLinearGradient(0, 0, width, height * 0.5);
  sheen.addColorStop(0, "rgba(255,255,255,0.14)");
  sheen.addColorStop(0.35, "rgba(255,255,255,0.02)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  roundRectPath(ctx, 3, 3, width - 6, height - 6, width * 0.075);
  ctx.fill();
};

const cardTextures = new Map<number, THREE.Texture | null>();

export const getCardTexture = (variant = 0): THREE.Texture | null => {
  const key = ((variant % CARD_PALETTES.length) + CARD_PALETTES.length) % CARD_PALETTES.length;
  if (cardTextures.has(key)) {
    return cardTextures.get(key) ?? null;
  }
  if (typeof document === "undefined") {
    cardTextures.set(key, null);
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 704;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    cardTextures.set(key, null);
    return null;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  roundRectPath(ctx, 0, 0, canvas.width, canvas.height, 38);
  ctx.clip();
  drawCardArt(ctx, canvas.width, canvas.height, CARD_PALETTES[key], key);
  ctx.restore();
  const texture = canvasTexture(canvas);
  cardTextures.set(key, texture);
  return texture;
};

/* -------------------------------------------------------------------- */
/* Abstract symbols for the three hero cards                             */
/* -------------------------------------------------------------------- */

const symbolTextures = new Map<string, THREE.Texture | null>();

export const getSymbolTexture = (
  kind: SymbolKind,
  color: string = COLORS.cyan,
): THREE.Texture | null => {
  const key = `${kind}|${color}`;
  if (symbolTextures.has(key)) {
    return symbolTextures.get(key) ?? null;
  }
  if (typeof document === "undefined") {
    symbolTextures.set(key, null);
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    symbolTextures.set(key, null);
    return null;
  }
  ctx.clearRect(0, 0, 512, 512);
  const gradient = ctx.createLinearGradient(90, 90, 420, 430);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.55, color);
  gradient.addColorStop(1, rgba(color, 0.25));
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 20;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur = 46;

  if (kind === "triangle") {
    ctx.beginPath();
    ctx.moveTo(256, 108);
    ctx.lineTo(418, 392);
    ctx.lineTo(94, 392);
    ctx.closePath();
    ctx.stroke();
  } else if (kind === "ring") {
    ctx.beginPath();
    ctx.arc(256, 256, 148, 0.35, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(256, 256, 66, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === "hexagon") {
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const x = 256 + Math.cos(angle) * 156;
      const y = 256 + Math.sin(angle) * 156;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(74, 300);
    ctx.bezierCurveTo(148, 130, 214, 384, 286, 214);
    ctx.bezierCurveTo(330, 110, 380, 268, 438, 226);
    ctx.stroke();
  }

  const texture = canvasTexture(canvas);
  symbolTextures.set(key, texture);
  return texture;
};

/* -------------------------------------------------------------------- */
/* Hero card                                                             */
/* -------------------------------------------------------------------- */

export const HeroCard: React.FC<{
  position?: V3;
  rotation?: V3;
  scale?: number | V3;
  variant?: number;
  brightness?: number;
  tint?: string;
  symbol?: SymbolKind | null;
  symbolColor?: string;
  opacity?: number;
  shadows?: boolean;
}> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  variant = 0,
  brightness = 1,
  tint = "#ffffff",
  symbol = null,
  symbolColor = COLORS.cyan,
  opacity = 1,
  shadows = false,
}) => {
  const face = getCardTexture(variant);
  const symbolMap = symbol ? getSymbolTexture(symbol, symbolColor) : null;
  const faceColor = useMemo(
    () =>
      new THREE.Color(tint).multiplyScalar(Math.max(0.001, brightness)),
    [tint, brightness],
  );

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh
        geometry={getCardGeometry()}
        castShadow={shadows}
        receiveShadow={shadows}
      >
        <meshPhysicalMaterial
          color="#08131f"
          metalness={0.42}
          roughness={0.26}
          clearcoat={1}
          clearcoatRoughness={0.16}
          envMapIntensity={1.7}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
      {face ? (
        <mesh geometry={getCardFaceGeometry()}>
          <meshBasicMaterial
            map={face}
            color={faceColor}
            transparent
            opacity={opacity}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ) : null}
      {symbolMap ? (
        <mesh position={[0, 0.15, CARD_D / 2 + 0.016]}>
          <planeGeometry args={[CARD_W * 0.52, CARD_W * 0.52]} />
          <meshBasicMaterial
            map={symbolMap}
            transparent
            opacity={opacity}
            depthWrite={false}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ) : null}
    </group>
  );
};

/* -------------------------------------------------------------------- */
/* Instanced card stream                                                 */
/* -------------------------------------------------------------------- */

export type CardInstance = {
  position: V3;
  rotation?: V3;
  scale?: number | V3;
  brightness?: number;
  tint?: string;
};

export const CardInstances: React.FC<{
  items: CardInstance[];
  capacity: number;
  shadows?: boolean;
}> = ({ items, capacity, shadows = false }) => {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const faceRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const scratch = useMemo(() => new THREE.Color(), []);
  const faceMap = getCardTexture(0);

  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#07121e",
        metalness: 0.45,
        roughness: 0.3,
        clearcoat: 1,
        clearcoatRoughness: 0.2,
        envMapIntensity: 1.5,
      }),
    [],
  );

  const faceMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: faceMap ?? null,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [faceMap],
  );

  useEffect(
    () => () => {
      bodyMaterial.dispose();
      faceMaterial.dispose();
    },
    [bodyMaterial, faceMaterial],
  );

  useLayoutEffect(() => {
    const count = Math.min(capacity, items.length);
    const apply = (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) {
        return;
      }
      mesh.count = count;
      for (let i = 0; i < count; i += 1) {
        const item = items[i];
        dummy.position.set(
          item.position[0],
          item.position[1],
          item.position[2],
        );
        dummy.rotation.set(
          item.rotation?.[0] ?? 0,
          item.rotation?.[1] ?? 0,
          item.rotation?.[2] ?? 0,
        );
        const scale = item.scale ?? 1;
        if (typeof scale === "number") {
          dummy.scale.setScalar(Math.max(0.0001, scale));
        } else {
          dummy.scale.set(
            Math.max(0.0001, scale[0]),
            Math.max(0.0001, scale[1]),
            Math.max(0.0001, scale[2]),
          );
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        scratch
          .set(item.tint ?? "#ffffff")
          .multiplyScalar(Math.max(0, item.brightness ?? 1));
        mesh.setColorAt(i, scratch);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    };
    apply(bodyRef.current);
    apply(faceRef.current);
  });

  return (
    <group>
      <instancedMesh
        ref={bodyRef}
        args={[getCardGeometry(), bodyMaterial, capacity]}
        frustumCulled={false}
        castShadow={shadows}
        receiveShadow={shadows}
      />
      <instancedMesh
        ref={faceRef}
        args={[getCardFaceGeometry(), faceMaterial, capacity]}
        frustumCulled={false}
      />
    </group>
  );
};
