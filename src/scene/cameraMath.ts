/**
 * Pure camera math for the dolly. No react-three-fiber, no hooks, so the
 * offline black-frame check (scripts/check-frame-safety.ts) can evaluate every
 * frame with exactly the code the renderer uses.
 *
 * A single non-finite position, target or FOV makes the view matrix NaN and
 * the whole canvas renders black, so every value is clamped here.
 */
import * as THREE from "three";
import { noise3D } from "@remotion/noise";
import { VIDEO } from "../config";
import { BASS_CUE, SLAM_FRAMES } from "../sfx/cues";
import { errorPulseAt, impactAt, slamPulseAt } from "../sfx/useSfxImpact";
import { clamp, lerp, ramp, safe, smoothstep } from "../utils/math";
import { cameraPathU, fovBlendAt, PUNCH_FOV, PUNCH_STRENGTH, STATIONS } from "./timeline";

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

export type CameraState = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  near: number;
  far: number;
  shakeAmp: number;
  shake: [number, number, number];
  drift: [number, number, number];
  /** Added to rotation.z after lookAt. */
  dutch: number;
  impact: number;
  slam: number;
  error: number;
};

export const cameraStateAt = (frame: number): CameraState => {
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
    fov = endStation.fov;
  }

  const impact = clamp(impactAt(frame), 0, 1);
  const slam = clamp(slamPulseAt(frame), 0, 1);
  const error = clamp(errorPulseAt(frame), 0, 1);

  // Bass drop: dolly back and widen the lens.
  if (BASS_CUE && frame >= BASS_CUE.frame) {
    const back = smoothstep(ramp(frame, BASS_CUE.frame, VIDEO.durationInFrames));
    const away = position.clone().sub(target).normalize();
    position.addScaledVector(away, back * 5.2);
    position.y += back * 1.1;
    fov += back * 14;
  }

  const drift = new THREE.Vector3(
    noise3D("drift-x", frame * 0.012, 0, 0) * 0.13,
    noise3D("drift-y", 0, frame * 0.011, 0) * 0.1,
    noise3D("drift-z", 0, 0, frame * 0.009) * 0.07,
  );

  const shakeAmp = safe(impact * 0.22 + slam * 0.1 + error * 0.03, 0, 0, 0.45);
  const shake = new THREE.Vector3(
    noise3D("shake-x", frame * 1.8, 0, 0) * shakeAmp,
    noise3D("shake-y", 0, frame * 2.2, 0) * shakeAmp,
    noise3D("shake-z", 0, 0, frame * 1.4) * shakeAmp * 0.4,
  );

  const finalPosition = position.clone().add(drift).add(shake);

  // FOV punch-in on reveals.
  const punch = clamp(Math.max(slam, impact * 0.8), 0, 1);
  fov = lerp(fov, PUNCH_FOV, punch * PUNCH_STRENGTH);

  const dutch =
    error * 0.1 +
    impact * 0.025 +
    noise3D("dutch", frame * 0.5, 0, 0) * 0.006;

  return {
    position: [finalPosition.x, finalPosition.y, finalPosition.z],
    target: [target.x, target.y, target.z],
    fov: safe(fov, 50, 20, 100),
    near: 0.1,
    far: 160,
    shakeAmp,
    shake: [shake.x, shake.y, shake.z],
    drift: [drift.x, drift.y, drift.z],
    dutch: safe(dutch, 0, -0.5, 0.5),
    impact,
    slam,
    error,
  };
};
