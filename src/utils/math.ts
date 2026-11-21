export const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return Number.isFinite(min) ? min : 0;
  }
  return Math.min(max, Math.max(min, value));
};

export const clamp01 = (value: number): number => clamp(value, 0, 1);

/**
 * Post-processing and shader uniforms go black (or NaN and vanish) the moment a
 * single non-finite number reaches them. Everything that feeds bloom, DOF,
 * chromatic aberration, AO or camera shake goes through this.
 */
export const safe = (
  value: number,
  fallback: number,
  min = -Infinity,
  max = Infinity,
): number => {
  if (!Number.isFinite(value)) {
    return Number.isFinite(fallback) ? fallback : 0;
  }
  const low = Number.isFinite(min) ? min : -Infinity;
  const high = Number.isFinite(max) ? max : Infinity;
  return Math.min(high, Math.max(low, value));
};

export const lerp = (from: number, to: number, t: number): number =>
  from + (to - from) * t;

export const inverseLerp = (from: number, to: number, value: number): number =>
  from === to ? 0 : clamp01((value - from) / (to - from));

/** Linear 0..1 ramp between two frames, clamped. */
export const ramp = (frame: number, from: number, to: number): number =>
  inverseLerp(from, to, frame);

export const smoothstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

export const smootherstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

export const easeOutCubic = (t: number): number => {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
};

export const easeInCubic = (t: number): number => {
  const x = clamp01(t);
  return x * x * x;
};

export const easeInOutCubic = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/** Sharp attack, exponential decay. Returns 1 at `age = 0`. */
export const decay = (age: number, halfLife: number): number => {
  if (age < 0) {
    return 0;
  }
  return Math.pow(0.5, age / Math.max(0.0001, halfLife));
};

/** Deterministic value in [0, 1) from an integer frame and a salt. */
export const frameHash = (frame: number, salt = 0): number => {
  let h = Math.imul(frame ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt + 1, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};
