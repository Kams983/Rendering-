import React from "react";
import { RoundedBox } from "@react-three/drei";
import { useCurrentFrame } from "remotion";
import { COLORS, PACE } from "../config";
import { TYPING_WINDOWS } from "../sfx/cues";
import type { Vec3 } from "./timeline";

const ROWS = 5;
const COLS = 12;
const KEY_SIZE = 0.155;
const GAP = 0.028;

type KeyProps = {
  index: number;
  x: number;
  z: number;
  frame: number;
  typing: number;
};

const Key: React.FC<KeyProps> = ({ index, x, z, frame, typing }) => {
  // Each key has its own deterministic rhythm inside the typing window.
  const phase = (frame * 0.85 * PACE + index * 2.71) % 9;
  const press = Math.exp(-phase / 1.35) * typing;
  const jitter = 0.55 + 0.45 * Math.sin(index * 1.7);
  return (
    <group position={[x, 0, z]}>
      <RoundedBox
        args={[KEY_SIZE, 0.06, KEY_SIZE]}
        radius={0.018}
        smoothness={2}
        position={[0, 0.92 - press * 0.028 * jitter, 0]}
        castShadow
      >
        <meshStandardMaterial
          color={press > 0.55 ? "#2a3a4a" : "#1b2430"}
          metalness={0.72}
          roughness={0.32}
          emissive={COLORS.cyan}
          emissiveIntensity={press * 0.35}
        />
      </RoundedBox>
    </group>
  );
};

/**
 * The keyboard sits under the hook monitor. Typing runs at the 30 fps
 * reference frames 0-62 and 245-330 (the two typing windows).
 */
export const Keyboard: React.FC<{ position: Vec3 }> = ({ position }) => {
  const frame = useCurrentFrame();

  const typing = TYPING_WINDOWS.reduce((level, [start, end]) => {
    if (frame < start || frame > end) {
      return level;
    }
    return Math.max(level, 1);
  }, 0);

  const keys: React.ReactNode[] = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const index = row * COLS + col;
      const x = (col - (COLS - 1) / 2) * (KEY_SIZE + GAP);
      const z = (row - (ROWS - 1) / 2) * (KEY_SIZE + GAP);
      keys.push(
        <Key key={index} index={index} x={x} z={z} frame={frame} typing={typing} />,
      );
    }
  }

  return (
    <group position={position} rotation={[0.06, 0, 0]}>
      <mesh position={[0, 0.86, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.35, 0.13, 1.06]} />
        <meshStandardMaterial color="#0f151c" metalness={0.85} roughness={0.32} />
      </mesh>

      <mesh position={[0, 0.905, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.2, 0.94]} />
        <meshStandardMaterial
          color={COLORS.cyan}
          emissive={COLORS.cyan}
          emissiveIntensity={typing * 1.1 + 0.25}
          toneMapped={false}
        />
      </mesh>

      {keys}
    </group>
  );
};
