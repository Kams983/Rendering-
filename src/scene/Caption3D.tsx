import React from "react";
import { Center, Text3D } from "@react-three/drei";
import { noise3D } from "@remotion/noise";
import { spring, staticFile, useCurrentFrame } from "remotion";
import { ASSETS, COLORS, FPS, rf } from "../config";
import { STATIONS, type Station } from "./timeline";
import { clamp01 } from "../utils/math";
import { FADE_OUT_FRAMES, fitCaption } from "./captionFit";
import { getTypeface } from "./typeface";

const SLAM_FRAMES = rf(8);
const LETTER_SPACING = 0.015;

/**
 * Hero captions. Text3D geometry is generated once from the Helvetiker font
 * in /public/fonts, sized so it always fits the frame, then slammed in at a
 * fixed frame after its scene starts and faded out before the scene ends.
 */
export const Caption3D: React.FC<{ station: Station }> = ({ station }) => {
  const frame = useCurrentFrame();
  if (frame < station.inFrame || frame >= station.outFrame) {
    return null;
  }

  const typeface = getTypeface();
  const fit = typeface
    ? fitCaption(typeface, STATIONS, station, LETTER_SPACING)
    : null;
  const fitScale = fit ? fit.scale : 1;

  const age = frame - station.inFrame;
  const settled = spring({
    frame: age,
    fps: FPS,
    config: { damping: 12, stiffness: 190, mass: 0.6 },
    durationInFrames: rf(30),
  });

  const shake =
    age <= SLAM_FRAMES
      ? (1 - age / SLAM_FRAMES) *
        noise3D(`caption-shake-${station.id}`, frame * 1.9, 0, 0) *
        0.06
      : 0;
  const float = Math.sin(frame * 0.022 + station.index * 1.3) * 0.025;

  const flash = clamp01(Math.exp(-age / 5));
  const scale = 0.5 + settled * 0.5;

  const fadeStart = station.outFrame - FADE_OUT_FRAMES;
  const opacity =
    frame >= fadeStart ? clamp01((station.outFrame - frame) / FADE_OUT_FRAMES) : 1;

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
          size={station.size * fitScale}
          height={0.085}
          bevelEnabled
          bevelThickness={0.012}
          bevelSize={0.008}
          bevelSegments={3}
          curveSegments={7}
          letterSpacing={LETTER_SPACING}
          lineHeight={1.18}
          castShadow
          receiveShadow
        >
          {station.lines.slice(0, 2).join("\n")}
          <meshStandardMaterial
            color={station.color}
            metalness={0.94}
            roughness={0.18}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            envMapIntensity={1.6}
            transparent
            opacity={opacity}
          />
        </Text3D>
      </Center>
    </group>
  );
};
