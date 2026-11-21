import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { spring, useCurrentFrame } from "remotion";
import { COLORS, FPS, frames60 } from "../config";
import { CUE_FRAMES } from "../sfx/cues";
import { clamp01, easeInOutCubic, ramp } from "../utils/math";

const START = CUE_FRAMES.payoffStart;
const COMPLETE = CUE_FRAMES.fix;

/**
 * A tube geometry whose index draw range grows with the frame. No morph
 * targets, no animation mixer, fully deterministic.
 */
export const Checkmark: React.FC = () => {
  const frame = useCurrentFrame();
  const mesh = useRef<THREE.Mesh>(null);

  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.95, 0.22, 0),
        new THREE.Vector3(-0.58, -0.12, 0),
        new THREE.Vector3(-0.26, -0.48, 0),
        new THREE.Vector3(0.12, -0.12, 0),
        new THREE.Vector3(0.95, 0.78, 0),
      ]),
    [],
  );

  const progress = easeInOutCubic(ramp(frame, START, COMPLETE));

  useLayoutEffect(() => {
    const geometry = mesh.current?.geometry;
    if (!geometry) {
      return;
    }
    const total = geometry.index ? geometry.index.count : geometry.attributes.position.count;
    const drawn = Math.floor((total * progress) / 3) * 3;
    geometry.setDrawRange(0, Math.max(0, drawn));
  }, [progress]);

  const doneAge = frame - COMPLETE;
  const pop =
    doneAge >= 0
      ? spring({
          frame: doneAge,
          fps: FPS,
          config: { damping: 10, stiffness: 150, mass: 0.5 },
          durationInFrames: frames60(34),
        })
      : 0;
  const ring = clamp01(
    doneAge >= 0 ? Math.exp(-doneAge / frames60(18)) : 0,
  );

  return (
    <group position={[0.05, 1.7, -48]} scale={1.25}>
      <mesh ref={mesh} castShadow>
        <tubeGeometry args={[curve, 180, 0.075, 14, false]} />
        <meshStandardMaterial
          color={COLORS.green}
          emissive={COLORS.green}
          emissiveIntensity={2.2}
          metalness={0.55}
          roughness={0.22}
          toneMapped={false}
        />
      </mesh>

      <mesh
        position={[0.95, 0.78, 0]}
        scale={progress > 0.985 ? 1 + pop * 0.25 : 0.0001}
      >
        <sphereGeometry args={[0.11, 20, 20]} />
        <meshBasicMaterial color="#b6ffd0" toneMapped={false} />
      </mesh>

      <mesh scale={1 + ring * 1.6} rotation={[0, 0, 0]}>
        <torusGeometry args={[1.55, 0.012, 8, 128]} />
        <meshBasicMaterial
          color={COLORS.green}
          transparent
          opacity={ring * 0.6}
          toneMapped={false}
        />
      </mesh>

      <pointLight
        color={COLORS.green}
        intensity={14 + pop * 30}
        distance={9}
        position={[0, 1.2, 1.4]}
      />
    </group>
  );
};
