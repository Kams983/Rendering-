import React from "react";
import { Center, Text3D } from "@react-three/drei";
import { noise3D } from "@remotion/noise";
import { spring, staticFile, useCurrentFrame } from "remotion";
import { ASSETS, COLORS, FPS } from "../config";
import type { Station } from "./timeline";
import { clamp01 } from "../utils/math";

const SLAM_FRAMES = 8;

/**
 * Hero captions. Text3D geometry is generated once from the Helvetiker font
 * in /public/fonts, then slammed in with a spring on the cue frame.
 */
export const Caption3D: React.FC<{ station: Station }> = ({ station }) => {
  const frame = useCurrentFrame();
  const age = frame - station.slamFrame;
  const visible = age >= 0;

  const settled = visible
    ? spring({
        frame: age,
        fps: FPS,
        config: { damping: 12, stiffness: 190, mass: 0.6 },
        durationInFrames: 30,
      })
    : 0;

  const shake =
    visible && age <= SLAM_FRAMES
      ? (1 - age / SLAM_FRAMES) *
        noise3D(`caption-shake-${station.id}`, frame * 1.9, 0, 0) *
        0.06
      : 0;
  const float = Math.sin(frame * 0.022 + station.index * 1.3) * 0.025;

  const flash = visible ? clamp01(Math.exp(-age / 5)) : 0;
  const scale = visible ? 0.5 + settled * 0.5 : 0.0001;

  const emissive = flash > 0.35 ? COLORS.red : station.color;
  const emissiveIntensity = 0.18 + flash * 2.4;

  return (
    <group
      position={[
        station.caption[0] + shake,
        station.caption[1] + float,
        station.caption[2],
      ]}
      scale={scale}
    >
      <Center rotation={[0, station.captionYaw, 0]}>
        <Text3D
          font={staticFile(ASSETS.font3d)}
          size={station.size}
          height={0.085}
          bevelEnabled
          bevelThickness={0.012}
          bevelSize={0.008}
          bevelSegments={3}
          curveSegments={7}
          letterSpacing={0.015}
          lineHeight={1.18}
          castShadow
          receiveShadow
        >
          {station.lines.join("\n")}
          <meshStandardMaterial
            color={station.color}
            metalness={0.94}
            roughness={0.18}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            envMapIntensity={1.6}
          />
        </Text3D>
      </Center>
    </group>
  );
};
