import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useCurrentFrame } from "remotion";
import { COLORS, FPS } from "../config";
import { clamp01, easeInOutCubic, lerp, ramp } from "../utils/math";
import { displayFont } from "./drawText";
import { STATIONS, type Vec3 } from "./timeline";

const format = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

/**
 * Neon odometer: 00:15 rolls up to 03:00 while the hook plays. Drawn to a
 * canvas texture, framed by rotating torus rings, and lifted by bloom.
 */
export const Timer: React.FC<{ position: Vec3; rotationY?: number }> = ({
  position,
  rotationY = 0,
}) => {
  const frame = useCurrentFrame();
  const ring = useRef<THREE.Group>(null);

  const canvas = useMemo(() => {
    const element = document.createElement("canvas");
    element.width = 640;
    element.height = 320;
    return element;
  }, []);

  const texture = useMemo(() => {
    const element = new THREE.CanvasTexture(canvas);
    element.colorSpace = THREE.SRGBColorSpace;
    return element;
  }, [canvas]);

  useEffect(() => () => texture.dispose(), [texture]);

  const progress = easeInOutCubic(ramp(frame, 0, STATIONS[0].end));
  const seconds = lerp(15, 180, progress);
  const danger = clamp01((seconds - 120) / 60);
  const color = danger > 0.5 ? COLORS.red : COLORS.cyan;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 640, 320);
    ctx.fillStyle = "rgba(5,7,10,0.72)";
    ctx.fillRect(0, 0, 640, 320);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = displayFont(170);
    ctx.shadowColor = color;
    ctx.shadowBlur = 48;
    ctx.fillStyle = color;
    ctx.fillText(format(seconds), 320, 166);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = displayFont(48);
    ctx.fillText("TIME LOST", 320, 276);
  }
  texture.needsUpdate = true;

  if (ring.current) {
    ring.current.rotation.z = frame * 0.012;
  }

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group ref={ring}>
        <mesh>
          <torusGeometry args={[1.42, 0.018, 8, 96]} />
          <meshStandardMaterial
            color={COLORS.cyan}
            emissive={COLORS.cyan}
            emissiveIntensity={2.2}
            toneMapped={false}
          />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 3]}>
          <torusGeometry args={[1.6, 0.006, 6, 96]} />
          <meshStandardMaterial
            color={danger > 0.5 ? COLORS.red : COLORS.cyan}
            emissive={danger > 0.5 ? COLORS.red : COLORS.cyan}
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
      </group>

      <mesh>
        <planeGeometry args={[2.6, 1.3]} />
        <meshStandardMaterial
          map={texture}
          emissiveMap={texture}
          emissive="#ffffff"
          emissiveIntensity={1.8}
          toneMapped={false}
          transparent
        />
      </mesh>
    </group>
  );
};
