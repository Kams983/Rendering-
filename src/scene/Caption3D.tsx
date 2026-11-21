import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Center, Text3D } from "@react-three/drei";
import { noise3D } from "@remotion/noise";
import { spring, staticFile, useCurrentFrame } from "remotion";
import { ASSETS, COLORS, FPS, PACE, VIDEO, frames60 } from "../config";
import type { Station } from "./timeline";
import { captionFov } from "./timeline";
import { clamp01, safe } from "../utils/math";
import { balanceLines, fitScale } from "./captionFit";

const SLAM_FRAMES = frames60(8);
const ASPECT = VIDEO.width / VIDEO.height;

/** Measured once per station; geometry never changes at runtime. */
const FIT_CACHE = new Map<string, number>();

const depthOf = (station: Station): number =>
  Math.hypot(
    station.camera[0] - station.caption[0],
    station.camera[1] - station.caption[1],
    station.camera[2] - station.caption[2],
  );

/**
 * Hero captions. Text3D is generated once from the Helvetiker font in
 * /public/fonts, measure-fitted against the visible frustum at its own depth
 * and slammed in on the measured cue frame.
 */
export const Caption3D: React.FC<{ station: Station }> = ({ station }) => {
  const frame = useCurrentFrame();
  const mesh = useRef<THREE.Mesh>(null);
  const text = useMemo(() => balanceLines(station.lines).join("\n"), [station.lines]);
  // Worst-case FOV over the caption's life, including the 60 -> 40 punch-in.
  const fov = useMemo(() => captionFov(station), [station]);
  const [fit, setFit] = useState(() => FIT_CACHE.get(station.id) ?? 1);

  useLayoutEffect(() => {
    const object = mesh.current;
    if (!object || !object.geometry) {
      return;
    }
    object.geometry.computeBoundingBox();
    const box = object.geometry.boundingBox;
    if (!box) {
      return;
    }
    const size = new THREE.Vector3();
    box.getSize(size);
    if (!Number.isFinite(size.x) || !Number.isFinite(size.y) || size.x <= 0.001) {
      return;
    }
    const next = fitScale(
      { width: size.x, height: size.y },
      depthOf(station),
      fov,
      ASPECT,
    );
    FIT_CACHE.set(station.id, next);
    setFit((previous) =>
      Math.abs(previous - next) > 0.002 ? next : previous,
    );
  }, [station, fov, text]);

  const age = frame - station.slamFrame;
  const visible = age >= 0;

  const settled = visible
    ? spring({
        frame: age,
        fps: FPS,
        config: { damping: 12, stiffness: 190, mass: 0.6 },
        durationInFrames: frames60(30),
      })
    : 0;

  const shake =
    visible && age <= SLAM_FRAMES
      ? (1 - age / SLAM_FRAMES) *
        noise3D(`caption-shake-${station.id}`, frame * 1.9 * PACE, 0, 0) *
        0.06
      : 0;
  const float =
    Math.sin(frame * 0.022 * PACE + station.index * 1.3) * 0.025;

  const flash = visible ? clamp01(Math.exp(-age / frames60(5))) : 0;
  const scale = visible ? (0.5 + settled * 0.5) * fit : 0.0001;

  const emissive = flash > 0.35 ? COLORS.red : station.color;
  const emissiveIntensity = safe(0.18 + flash * 2.4, 0.18, 0.05, 4);

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
          ref={mesh}
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
          {text}
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
