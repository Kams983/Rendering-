import React from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { noise3D } from "@remotion/noise";
import { useCurrentFrame } from "remotion";
import { VIDEO } from "../config";
import { BASS_CUE, SLAM_FRAMES } from "../sfx/cues";
import { errorPulseAt, impactAt, slamPulseAt } from "../sfx/useSfxImpact";
import { clamp, lerp, ramp, smoothstep } from "../utils/math";
import {
  cameraPathU,
  fovBlendAt,
  STATIONS,
} from "./timeline";

const positionCurve = new THREE.CatmullRomCurve3(
  STATIONS.map((station) => new THREE.Vector3(...station.camera)),
  false,
  "catmullrom",
  0.4,
);

const lookCurve = new THREE.CatmullRomCurve3(
  STATIONS.map((station) => new THREE.Vector3(...station.look)),
  false,
  "catmullrom",
  0.4,
);

const ORBIT_CENTER = new THREE.Vector3(0, 2.9, -56);

/**
 * A pure function of the frame number. No useFrame, no clock.
 * Camera path: CatmullRomCurve3 through the eight locations, sampled by frame.
 */
export const CameraRig: React.FC = () => {
  const frame = useCurrentFrame();
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;

  const u = clamp(cameraPathU(frame), 0, 1);
  const position = positionCurve.getPoint(u);
  const target = lookCurve.getPoint(u);

  const endStation = STATIONS[STATIONS.length - 1];
  const orbiting = frame >= endStation.start;

  let fov = fovBlendAt(frame);

  if (orbiting) {
    const orbit = smoothstep(ramp(frame, endStation.start, SLAM_FRAMES.end));
    const angle = orbit * Math.PI * 2;
    const radius = 6.4;
    position.set(
      ORBIT_CENTER.x + Math.sin(angle) * radius,
      ORBIT_CENTER.y + 0.35 + Math.sin(angle * 2) * 0.28,
      ORBIT_CENTER.z + Math.cos(angle) * radius,
    );
    target.copy(ORBIT_CENTER);
    fov = STATIONS[STATIONS.length - 1].fov;
  }

  const impact = impactAt(frame);
  const slam = slamPulseAt(frame);
  const error = errorPulseAt(frame);

  // Bass drop: dolly back and widen the lens, then cut to black.
  if (BASS_CUE && frame >= BASS_CUE.frame) {
    const back = smoothstep(ramp(frame, BASS_CUE.frame, VIDEO.durationInFrames));
    const away = position.clone().sub(target).normalize();
    position.addScaledVector(away, back * 5.2);
    position.y += back * 1.1;
    fov += back * 14;
  }

  // Handheld drift, always on.
  const drift = new THREE.Vector3(
    noise3D("drift-x", frame * 0.012, 0, 0) * 0.13,
    noise3D("drift-y", 0, frame * 0.011, 0) * 0.1,
    noise3D("drift-z", 0, 0, frame * 0.009) * 0.07,
  );

  // Impact shake on every bass hit and text slam.
  const shakeAmp = impact * 0.22 + slam * 0.1 + error * 0.03;
  const shake = new THREE.Vector3(
    noise3D("shake-x", frame * 1.8, 0, 0) * shakeAmp,
    noise3D("shake-y", 0, frame * 2.2, 0) * shakeAmp,
    noise3D("shake-z", 0, 0, frame * 1.4) * shakeAmp * 0.4,
  );

  camera.position.copy(position).add(drift).add(shake);
  camera.lookAt(target);

  // FOV punch-in 60 -> 40 on reveals.
  const punch = Math.max(slam, impact * 0.8);
  fov = lerp(fov, 40, punch * 0.7);
  camera.fov = fov;
  camera.near = 0.1;
  camera.far = 160;
  camera.updateProjectionMatrix();

  // Dutch tilt during chaos moments.
  camera.rotation.z += error * 0.1 + impact * 0.025;
  camera.rotation.z += noise3D("dutch", frame * 0.5, 0, 0) * 0.006;

  return null;
};
