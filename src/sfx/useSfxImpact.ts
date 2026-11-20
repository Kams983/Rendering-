import { spring, useCurrentFrame } from "remotion";
import { FPS } from "../config";
import { clamp01 } from "../utils/math";
import { BASS_CUE, CUES, ERROR_CUES, SLAM_CUES } from "./cues";

/**
 * Reads cues.ts and turns each one into a 0..1 decaying impact value.
 * This is the single driving signal behind camera shake, bloom spikes,
 * chromatic aberration, light flashes, glitch and cube detonations.
 */

const springDecay = (age: number, damping: number, stiffness: number): number => {
  if (age < 0) {
    return 0;
  }
  return spring({
    frame: age,
    fps: FPS,
    config: { damping, stiffness, mass: 0.55 },
    durationInFrames: 80,
  });
};

export const impactAt = (frame: number): number => {
  let value = 0;
  for (const cue of CUES) {
    if (typeof cue.weight !== "number") {
      continue;
    }
    const age = frame - cue.frame;
    if (age < 0 || age > 90) {
      continue;
    }
    // A spring gives the visual a tiny anticipation, then the exponential
    // tail keeps it from looking like a linear ramp down.
    const rise = springDecay(age, 22, 330);
    const tail = Math.pow(0.5, age / 14);
    value += cue.weight * rise * tail;
  }
  return clamp01(value);
};

export const errorPulseAt = (frame: number): number => {
  let value = 0;
  for (const cue of ERROR_CUES) {
    const age = frame - cue.frame;
    // "glitch post for 4 frames" at the 30 fps reference is 8 frames at 60.
    if (age < 0 || age > 8) {
      continue;
    }
    value = Math.max(value, (cue.weight ?? 0.5) * (1 - age / 8));
  }
  // The error flood is a sustained 90-reference-frame wall of errors.
  if (frame >= ERROR_CUES[ERROR_CUES.length - 1].frame) {
    const floodStart = ERROR_CUES[ERROR_CUES.length - 1].frame;
    const t = (frame - floodStart) / (90 * 2);
    if (t >= 0 && t <= 1) {
      value = Math.max(value, 0.55 + 0.35 * t);
    }
  }
  return clamp01(value);
};

export const slamPulseAt = (frame: number): number => {
  let value = 0;
  for (const cue of SLAM_CUES) {
    const age = frame - cue.frame;
    // The 8-frame caption shake at 60 fps.
    if (age < 0 || age > 8) {
      continue;
    }
    value = Math.max(value, (cue.weight ?? 0.5) * (1 - age / 8));
  }
  return clamp01(value);
};

export const bassPulseAt = (frame: number): number => {
  if (!BASS_CUE) {
    return 0;
  }
  const age = frame - BASS_CUE.frame;
  if (age < 0) {
    return 0;
  }
  return clamp01(springDecay(age, 18, 220) * Math.pow(0.5, age / 24));
};

export const useSfxImpact = (): number => impactAt(useCurrentFrame());
export const useErrorPulse = (): number => errorPulseAt(useCurrentFrame());
export const useSlamPulse = (): number => slamPulseAt(useCurrentFrame());
export const useBassPulse = (): number => bassPulseAt(useCurrentFrame());
