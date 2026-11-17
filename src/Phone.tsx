import React from "react";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { COLORS } from "./config";
import type { QualityPreset } from "./config";
import { canvasTexture, rgba, roundRectPath } from "./Cards";
import type { V3 } from "./Cards";

export const PHONE_W = 1.34;
export const PHONE_H = 2.7;
export const PHONE_D = 0.125;

const SCREEN_W = PHONE_W - 0.17;
const SCREEN_H = PHONE_H - 0.17;

/* -------------------------------------------------------------------- */
/* Procedural phone screen: abstract feed UI, no text                    */
/* -------------------------------------------------------------------- */

const drawFeedTile = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  glow: string,
  accent: string,
) => {
  const base = ctx.createLinearGradient(x, y, x + w, y + h);
  base.addColorStop(0, "#0a2138");
  base.addColorStop(0.6, "#071322");
  base.addColorStop(1, "#040c16");
  ctx.fillStyle = base;
  roundRectPath(ctx, x, y, w, h, 44);
  ctx.fill();

  const bloom = ctx.createRadialGradient(
    x + w * 0.34,
    y + h * 0.3,
    10,
    x + w * 0.34,
    y + h * 0.3,
    w * 0.8,
  );
  bloom.addColorStop(0, rgba(glow, 0.34));
  bloom.addColorStop(0.5, rgba(glow, 0.1));
  bloom.addColorStop(1, rgba(glow, 0));
  ctx.fillStyle = bloom;
  roundRectPath(ctx, x, y, w, h, 44);
  ctx.fill();

  ctx.strokeStyle = rgba(accent, 0.55);
  ctx.lineWidth = 4;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(x + w * 0.5, y + h * 0.31, w * 0.14, 0.3, Math.PI * 1.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + w * 0.5, y + h * 0.31, w * 0.055, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  const bars = [
    { w: 0.56, a: 0.66 },
    { w: 0.4, a: 0.36 },
    { w: 0.26, a: 0.22 },
  ];
  bars.forEach((bar, index) => {
    ctx.fillStyle = rgba(COLORS.white, bar.a);
    roundRectPath(
      ctx,
      x + w * 0.07,
      y + h * 0.78 + index * 26,
      w * bar.w,
      10,
      5,
    );
    ctx.fill();
  });

  ctx.fillStyle = rgba(COLORS.white, 0.2);
  ctx.beginPath();
  ctx.arc(x + w * 0.06, y + h * 0.94, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = rgba(COLORS.white, 0.1);
  ctx.lineWidth = 3;
  roundRectPath(ctx, x + 2, y + 2, w - 4, h - 4, 44);
  ctx.stroke();
};

const screenTextures = new Map<string, THREE.Texture | null>();

export const getScreenTexture = (glow = COLORS.cyan): THREE.Texture | null => {
  if (screenTextures.has(glow)) {
    return screenTextures.get(glow) ?? null;
  }
  if (typeof document === "undefined") {
    screenTextures.set(glow, null);
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 880;
  canvas.height = 1760;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    screenTextures.set(glow, null);
    return null;
  }
  const w = canvas.width;
  const h = canvas.height;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#07172b");
  bg.addColorStop(0.5, "#040c17");
  bg.addColorStop(1, "#050f1c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const ambient = ctx.createRadialGradient(w * 0.2, h * 0.04, 10, w * 0.2, h * 0.04, w);
  ambient.addColorStop(0, rgba(glow, 0.16));
  ambient.addColorStop(1, rgba(glow, 0));
  ctx.fillStyle = ambient;
  ctx.fillRect(0, 0, w, h);

  // Status row: two blank pills, no digits.
  ctx.fillStyle = rgba(COLORS.white, 0.5);
  roundRectPath(ctx, 54, 56, 92, 16, 8);
  ctx.fill();
  ctx.fillStyle = rgba(COLORS.white, 0.32);
  [0, 1, 2].forEach((index) => {
    ctx.beginPath();
    ctx.arc(w - 62 - index * 36, 64, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  // Story rail.
  for (let i = 0; i < 4; i += 1) {
    const cx = 92 + i * 128;
    const ring = ctx.createLinearGradient(cx - 44, 150, cx + 44, 250);
    ring.addColorStop(0, i % 2 === 0 ? rgba(glow, 0.9) : rgba(COLORS.gold, 0.9));
    ring.addColorStop(1, "rgba(255,255,255,0.15)");
    ctx.strokeStyle = ring;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, 196, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = rgba(COLORS.white, 0.12);
    ctx.beginPath();
    ctx.arc(cx, 196, 32, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFeedTile(ctx, 48, 286, w - 96, 620, glow, "#dff6ff");
  drawFeedTile(ctx, 48, 934, w - 96, 620, COLORS.gold, "#ffe7c2");

  // Bottom navigation.
  ctx.fillStyle = "rgba(6,14,24,0.86)";
  roundRectPath(ctx, 40, h - 152, w - 80, 104, 40);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let i = 0; i < 4; i += 1) {
    ctx.fillStyle = rgba(COLORS.white, i === 0 ? 0.55 : 0.18);
    ctx.beginPath();
    ctx.arc(120 + i * 96, h - 100, 11, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgba(COLORS.cyan, 0.7);
  roundRectPath(ctx, w - 218, h - 118, 96, 36, 18);
  ctx.fill();

  const texture = canvasTexture(canvas);
  screenTextures.set(glow, texture);
  return texture;
};

/* -------------------------------------------------------------------- */
/* Phone                                                                 */
/* -------------------------------------------------------------------- */

export const Phone: React.FC<{
  preset: QualityPreset;
  position?: V3;
  rotation?: V3;
  scale?: number;
  glow?: number;
  ghost?: number;
  shadows?: boolean;
}> = ({
  preset,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  glow = 1,
  ghost = 0,
  shadows = false,
}) => {
  const screen = getScreenTexture();
  const shellOpacity = 1 - 0.82 * Math.min(1, Math.max(0, ghost));

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <RoundedBox
        args={[PHONE_W, PHONE_H, PHONE_D]}
        radius={0.08}
        smoothness={8}
        castShadow={shadows}
        receiveShadow={shadows}
      >
        <meshPhysicalMaterial
          color="#b9c4d2"
          metalness={1}
          roughness={0.3}
          clearcoat={0.4}
          clearcoatRoughness={0.22}
          envMapIntensity={2.1}
          transparent={ghost > 0}
          opacity={shellOpacity}
          depthWrite={ghost === 0}
        />
      </RoundedBox>

      <RoundedBox
        args={[PHONE_W - 0.042, PHONE_H - 0.042, PHONE_D * 0.6]}
        radius={0.07}
        smoothness={6}
        position={[0, 0, 0.006]}
      >
        <meshPhysicalMaterial
          color="#050a12"
          metalness={0.55}
          roughness={0.42}
          clearcoat={0.7}
          clearcoatRoughness={0.3}
          envMapIntensity={1.2}
          transparent={ghost > 0}
          opacity={shellOpacity}
          depthWrite={ghost === 0}
        />
      </RoundedBox>

      {screen ? (
        <mesh position={[0, 0, PHONE_D / 2 - 0.004]}>
          <planeGeometry args={[SCREEN_W, SCREEN_H]} />
          <meshBasicMaterial
            map={screen}
            transparent={ghost > 0}
            opacity={Math.min(1, shellOpacity + 0.1)}
            color={new THREE.Color(COLORS.white).multiplyScalar(glow)}
            toneMapped={false}
          />
        </mesh>
      ) : null}

      <RoundedBox
        args={[PHONE_W - 0.075, PHONE_H - 0.075, 0.014]}
        radius={0.055}
        smoothness={6}
        position={[0, 0, PHONE_D / 2 + 0.002]}
      >
        {preset.transmission && ghost === 0 ? (
          <meshPhysicalMaterial
            color="#0d1b2b"
            metalness={0}
            roughness={0.055}
            clearcoat={1}
            clearcoatRoughness={0.035}
            transmission={0.9}
            thickness={0.05}
            ior={1.5}
            envMapIntensity={2.4}
            specularIntensity={1}
            transparent
            opacity={0.94}
          />
        ) : (
          <meshPhysicalMaterial
            color="#0b1826"
            metalness={0.1}
            roughness={0.08}
            clearcoat={1}
            clearcoatRoughness={0.05}
            envMapIntensity={2}
            transparent
            opacity={0.34}
            depthWrite={false}
          />
        )}
      </RoundedBox>

      {/* Side buttons. */}
      <RoundedBox
        args={[0.014, 0.34, 0.045]}
        radius={0.006}
        smoothness={4}
        position={[PHONE_W / 2 + 0.002, 0.62, 0]}
      >
        <meshPhysicalMaterial
          color="#9aa6b5"
          metalness={1}
          roughness={0.28}
          envMapIntensity={2}
        />
      </RoundedBox>
      <RoundedBox
        args={[0.014, 0.52, 0.045]}
        radius={0.006}
        smoothness={4}
        position={[-PHONE_W / 2 - 0.002, 0.5, 0]}
      >
        <meshPhysicalMaterial
          color="#9aa6b5"
          metalness={1}
          roughness={0.28}
          envMapIntensity={2}
        />
      </RoundedBox>

      {/* Camera bump on the back. */}
      <group position={[-0.32, PHONE_H / 2 - 0.55, -PHONE_D / 2 - 0.012]}>
        <RoundedBox args={[0.56, 0.56, 0.05]} radius={0.055} smoothness={6}>
          <meshPhysicalMaterial
            color="#1a2431"
            metalness={0.85}
            roughness={0.32}
            clearcoat={1}
            clearcoatRoughness={0.18}
            envMapIntensity={1.6}
          />
        </RoundedBox>
        {[
          [-0.12, 0.12],
          [0.12, -0.12],
        ].map(([x, y], index) => (
          <group key={index} position={[x, y, -0.03]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.105, 0.105, 0.035, 32]} />
              <meshPhysicalMaterial
                color="#080d15"
                metalness={0.7}
                roughness={0.12}
                clearcoat={1}
                clearcoatRoughness={0.05}
                envMapIntensity={2.4}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.012]}>
              <torusGeometry args={[0.082, 0.012, 8, 40]} />
              <meshPhysicalMaterial
                color="#c8d2df"
                metalness={1}
                roughness={0.24}
                envMapIntensity={2.2}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};

/* -------------------------------------------------------------------- */
/* Scene 12 and 13 glass barrier                                         */
/* -------------------------------------------------------------------- */

export const GlassBarrier: React.FC<{
  preset: QualityPreset;
  position?: V3;
  rotation?: V3;
  width?: number;
  depth?: number;
  glow?: number;
}> = ({
  preset,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 2.1,
  depth = 0.92,
  glow = 1,
}) => {
  const edge = 0.012;
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[width, 0.055, depth]} radius={0.024} smoothness={5}>
        {preset.transmission ? (
          <meshPhysicalMaterial
            color="#123243"
            metalness={0}
            roughness={0.06}
            clearcoat={1}
            clearcoatRoughness={0.04}
            transmission={0.92}
            thickness={0.16}
            ior={1.48}
            envMapIntensity={2.4}
          />
        ) : (
          <meshPhysicalMaterial
            color="#123243"
            metalness={0.2}
            roughness={0.12}
            clearcoat={1}
            transparent
            opacity={0.42}
            envMapIntensity={1.8}
          />
        )}
      </RoundedBox>
      {[
        { position: [0, 0, depth / 2] as V3, size: [width, edge, edge] as V3 },
        { position: [0, 0, -depth / 2] as V3, size: [width, edge, edge] as V3 },
        { position: [width / 2, 0, 0] as V3, size: [edge, edge, depth] as V3 },
        { position: [-width / 2, 0, 0] as V3, size: [edge, edge, depth] as V3 },
      ].map((bar, index) => (
        <mesh key={index} position={bar.position}>
          <boxGeometry args={bar.size} />
          <meshBasicMaterial
            color={COLORS.cyan}
            transparent
            opacity={0.5 * glow}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.032, 0]}>
        <planeGeometry args={[width * 0.94, depth * 0.94]} />
        <meshBasicMaterial
          color={COLORS.cyan}
          transparent
          opacity={0.1 * glow}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};
