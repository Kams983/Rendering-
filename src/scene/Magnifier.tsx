import React from "react";
import * as THREE from "three";
import { spring, useCurrentFrame } from "remotion";
import { COLORS, FPS, PACE, frames60 } from "../config";
import { CUE_FRAMES } from "../sfx/cues";
import { clamp01, lerp } from "../utils/math";

/**
 * Holographic detective lens: a wireframe torus, a glass lens, a handle and a
 * scan line. It springs in on the third detective zoom (reference frame 665).
 */
export const Magnifier: React.FC = () => {
  const frame = useCurrentFrame();
  const age = frame - CUE_FRAMES.detectiveZoom1;
  const entered =
    age >= 0
      ? spring({
          frame: age,
          fps: FPS,
          config: { damping: 13, stiffness: 160, mass: 0.7 },
          durationInFrames: frames60(34),
        })
      : 0;

  const float = Math.sin(frame * 0.03 * PACE) * 0.05;
  const scan = Math.sin(frame * 0.075 * PACE) * 0.62;
  const pulse =
    0.45 + 0.55 * clamp01(Math.abs(Math.sin(frame * 0.05 * PACE)));

  return (
    <group
      position={[0, 1.5 + float, -30.9]}
      rotation={[0.1 * (1 - entered), Math.sin(frame * 0.02 * PACE) * 0.14, 0]}
      scale={Math.max(0.0001, entered)}
    >
      <mesh>
        <torusGeometry args={[0.74, 0.026, 10, 96]} />
        <meshStandardMaterial
          color={COLORS.cyan}
          emissive={COLORS.cyan}
          emissiveIntensity={2.6}
          metalness={0.9}
          roughness={0.15}
          toneMapped={false}
        />
      </mesh>

      <mesh>
        <torusGeometry args={[0.8, 0.004, 6, 96]} />
        <meshBasicMaterial color={COLORS.cyan} wireframe transparent opacity={0.55} />
      </mesh>

      <mesh>
        <circleGeometry args={[0.72, 64]} />
        <meshStandardMaterial
          color="#9fd2ff"
          transparent
          opacity={0.18}
          roughness={0.04}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, scan, 0.015]}>
        <planeGeometry args={[1.34, 0.018]} />
        <meshBasicMaterial
          color={COLORS.cyan}
          transparent
          opacity={0.75 * pulse}
          toneMapped={false}
        />
      </mesh>

      <mesh
        position={[0.52, -0.52, 0]}
        rotation={[0, 0, -Math.PI / 4]}
      >
        <cylinderGeometry args={[0.055, 0.07, 0.95, 12]} />
        <meshStandardMaterial
          color="#1c2733"
          metalness={0.9}
          roughness={0.25}
          emissive={COLORS.cyan}
          emissiveIntensity={0.35}
        />
      </mesh>

      <mesh position={[0, 0, 0.02]}>
        <ringGeometry args={[0.9, 0.94, 96]} />
        <meshBasicMaterial
          color={COLORS.cyan}
          transparent
          opacity={lerp(0.1, 0.38, pulse)}
          side={2}
        />
      </mesh>

      <pointLight
        color={COLORS.cyan}
        intensity={6}
        distance={4}
        position={[0, 0, 0.6]}
      />
    </group>
  );
};
