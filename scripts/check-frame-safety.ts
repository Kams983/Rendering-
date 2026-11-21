/**
 * Offline black-frame check. No rendering, no WebGL.
 *
 *   npm run check:safety
 *
 * Sweeps every composition frame through the same pure functions the scene
 * uses (impact pulses, camera math, postprocessing parameters) and reports any
 * NaN, Infinity, negative or zero-where-invalid value. A single one of those
 * blanks the effect chain or the view matrix, which is a black frame.
 */
import { VIDEO } from "../src/config";
import { cameraStateAt } from "../src/scene/cameraMath";
import { postParamsAt } from "../src/scene/postParams";
import { errorPulseAt, impactAt, slamPulseAt } from "../src/sfx/useSfxImpact";

type FrameValues = Record<string, number>;

/** Frames that went black in the previous render. */
const SUSPECT_FRAMES = [288, 318, 378, 2394, 2418, 2592, 2814];

const collect = (frame: number, energy: number): FrameValues => {
  const cam = cameraStateAt(frame);
  const impact = impactAt(frame);
  const error = errorPulseAt(frame);
  const slam = slamPulseAt(frame);
  const p = postParamsAt(frame, impact, error, energy);
  return {
    impact,
    error,
    slam,
    fov: cam.fov,
    near: cam.near,
    far: cam.far,
    camX: cam.position[0],
    camY: cam.position[1],
    camZ: cam.position[2],
    targetX: cam.target[0],
    targetY: cam.target[1],
    targetZ: cam.target[2],
    shakeAmp: cam.shakeAmp,
    shakeX: cam.shake[0],
    shakeY: cam.shake[1],
    shakeZ: cam.shake[2],
    dutch: cam.dutch,
    focus: p.focus,
    focusRange: p.focusRange,
    bokeh: p.bokeh,
    aoRadius: p.aoRadius,
    aoIntensity: p.aoIntensity,
    aoFalloff: p.aoFalloff,
    bloomIntensity: p.bloomIntensity,
    bloomThreshold: p.bloomThreshold,
    caX: p.caX,
    caY: p.caY,
    glitchX: p.glitchX,
    glitchY: p.glitchY,
    noiseOpacity: p.noiseOpacity,
    vignetteDarkness: p.vignetteDarkness,
  };
};

type Rule = {
  key: string;
  min?: number;
  max?: number;
  /** 0 is an invalid value for this parameter. */
  zeroInvalid?: boolean;
};

const RULES: Rule[] = [
  { key: "impact", min: 0, max: 1 },
  { key: "error", min: 0, max: 1 },
  { key: "slam", min: 0, max: 1 },
  { key: "fov", min: 20, max: 100 },
  { key: "near", min: 0.001, zeroInvalid: true },
  { key: "far", min: 1 },
  { key: "camX", min: -120, max: 120 },
  { key: "camY", min: -120, max: 120 },
  { key: "camZ", min: -200, max: 200 },
  { key: "targetX", min: -120, max: 120 },
  { key: "targetY", min: -120, max: 120 },
  { key: "targetZ", min: -200, max: 200 },
  { key: "shakeAmp", min: 0, max: 0.45 },
  { key: "dutch", min: -0.5, max: 0.5 },
  // Depth of field focus distance and N8AO radius must never reach 0.
  { key: "focus", min: 0.9, zeroInvalid: true },
  { key: "focusRange", min: 1.2, zeroInvalid: true },
  { key: "bokeh", min: 0, max: 10 },
  { key: "aoRadius", min: 0.8, zeroInvalid: true },
  { key: "aoIntensity", min: 0.15, max: 4 },
  { key: "aoFalloff", min: 0.25, max: 6 },
  { key: "bloomIntensity", min: 0.15, max: 8 },
  { key: "bloomThreshold", min: 0.02, max: 1 },
  { key: "caX", min: 0.0002, max: 0.02 },
  { key: "caY", min: 0.0002, max: 0.02 },
  { key: "glitchX", min: 0.002, max: 0.02 },
  { key: "glitchY", min: 0.005, max: 0.05 },
  { key: "noiseOpacity", min: 0, max: 0.3 },
  { key: "vignetteDarkness", min: 0, max: 1 },
];

const violations = (values: FrameValues): string[] => {
  const out: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    if (!Number.isFinite(value)) {
      out.push(`${key}=${value}`);
    }
  }
  for (const rule of RULES) {
    const value = values[rule.key];
    if (!Number.isFinite(value)) {
      continue;
    }
    if (rule.zeroInvalid && value === 0) {
      out.push(`${rule.key}=0 (must be > 0)`);
      continue;
    }
    if (typeof rule.min === "number" && value < rule.min) {
      out.push(`${rule.key}=${value} < ${rule.min}`);
    }
    if (typeof rule.max === "number" && value > rule.max) {
      out.push(`${rule.key}=${value} > ${rule.max}`);
    }
  }
  return out;
};

const energies = [0, 0.5, 1];
const flags: Array<{ frame: number; energy: number; problems: string[] }> = [];
let scanned = 0;

for (let frame = 0; frame < VIDEO.durationInFrames; frame += 1) {
  for (const energy of energies) {
    scanned += 1;
    const problems = violations(collect(frame, energy));
    if (problems.length > 0) {
      flags.push({ frame, energy, problems });
    }
  }
}

console.log(
  `[safety] scanned ${VIDEO.durationInFrames} frames x ${energies.length} energy states ` +
    `(${scanned} evaluations), fps ${VIDEO.fps}`,
);

if (flags.length === 0) {
  console.log("[safety] OK: every value is finite and inside its valid range.\n");
} else {
  console.error(`[safety] FAIL: ${flags.length} frame(s) with bad values:`);
  for (const flag of flags.slice(0, 40)) {
    console.error(
      `  frame ${String(flag.frame).padStart(5)} (energy ${flag.energy}): ${flag.problems.join(", ")}`,
    );
  }
  if (flags.length > 40) {
    console.error(`  ... ${flags.length - 40} more`);
  }
  console.error("");
}

const format = (values: FrameValues, keys: string[]): string =>
  keys.map((key) => `${key}=${values[key].toFixed(4)}`).join("  ");

const KEYS = [
  "impact",
  "error",
  "fov",
  "focus",
  "aoRadius",
  "bloomIntensity",
  "glitchX",
  "camY",
  "camZ",
];

console.log("[safety] values around the frames that went black previously:");
for (const suspect of SUSPECT_FRAMES) {
  console.log(`  -- frame ${suspect} --`);
  for (let frame = suspect - 3; frame <= suspect + 3; frame += 1) {
    if (frame < 0 || frame >= VIDEO.durationInFrames) {
      continue;
    }
    const values = collect(frame, 1);
    const bad = violations(values).length > 0 ? "  <-- FLAGGED" : "";
    console.log(
      `    ${String(frame).padStart(5)}  ${format(values, KEYS)}${bad}`,
    );
  }
}

process.exit(flags.length === 0 ? 0 : 1);
