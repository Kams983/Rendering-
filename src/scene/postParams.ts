/**
 * Every value that reaches a postprocessing pass, computed as a pure function
 * of the frame. `safe()` (finite + range clamped) is applied to all of them:
 * a single NaN blanks the entire effect chain, which renders as a black frame.
 *
 * No react-three-fiber here, so scripts/check-frame-safety.ts can sweep the
 * whole timeline with exactly the code the renderer uses.
 */
import { safe } from "../utils/math";
import { stationForFrame } from "./timeline";

export type PostParams = {
  /** Depth of field, in world units. */
  focus: number;
  focusRange: number;
  bokeh: number;
  aoRadius: number;
  aoIntensity: number;
  aoFalloff: number;
  bloomIntensity: number;
  bloomThreshold: number;
  bloomSmoothing: number;
  bloomRadius: number;
  caX: number;
  caY: number;
  glitchActive: boolean;
  glitchX: number;
  glitchY: number;
  noiseOpacity: number;
  vignetteOffset: number;
  vignetteDarkness: number;
};

export const postParamsAt = (
  frame: number,
  impact: number,
  error: number,
  energy: number,
): PostParams => {
  const i = safe(impact, 0, 0, 1);
  const e = safe(error, 0, 0, 1);
  const en = safe(energy, 0, 0, 1);
  const station = stationForFrame(frame);

  // Focus pull: the lens tracks the hero prop of the active station and pulls
  // slightly closer on every impact. Never inside the near plane.
  const focus = safe(
    Math.hypot(
      station.camera[0] - station.caption[0],
      station.camera[1] - station.caption[1],
      station.camera[2] - station.caption[2],
    ) - i * 0.6,
    4,
    0.9,
    60,
  );

  return {
    focus,
    focusRange: safe(4.2 + i * 2, 4.2, 1.2, 30),
    bokeh: safe(2.2 + i * 2.4, 2.2, 0, 10),
    aoRadius: safe(1.4, 1.4, 0.8, 5),
    aoIntensity: safe(1.35, 1.35, 0.15, 4),
    aoFalloff: safe(1.2, 1.2, 0.25, 6),
    bloomIntensity: safe(1.15 + i * 2.4 + en * 0.35, 1.15, 0.15, 8),
    bloomThreshold: safe(0.22, 0.22, 0.02, 1),
    bloomSmoothing: safe(0.28, 0.28, 0, 1),
    bloomRadius: safe(0.72, 0.72, 0.05, 1.2),
    caX: safe(0.0007 + i * 0.0045 + e * 0.002, 0.0007, 0.0002, 0.02),
    caY: safe(0.0004 + i * 0.002, 0.0004, 0.0002, 0.02),
    glitchActive: e > 0.08,
    glitchX: safe(0.003 + e * 0.008, 0.003, 0.002, 0.02),
    glitchY: safe(0.008 + e * 0.03, 0.008, 0.005, 0.05),
    noiseOpacity: safe(0.045, 0.045, 0, 0.3),
    vignetteOffset: safe(0.2, 0.2, 0, 1),
    vignetteDarkness: safe(0.82, 0.82, 0, 1),
  };
};
