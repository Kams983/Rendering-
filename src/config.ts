/**
 * Global constants for "5 Beginner Coding Mistakes That Cost Me Hours."
 *
 * All timing in this project is authored against a 30 fps reference and then
 * scaled by S. Cue files are the only place a raw reference frame is allowed.
 */

export const FPS = 30;
/** Composition fps over the 30 fps reference. 1.0 at 30 fps. */
export const S = FPS / 30;

/**
 * Per-frame rate multiplier for motion authored at 60 fps (noise drift, shake,
 * swing). Multiplying a `frame * k` term by PACE keeps its speed in seconds
 * identical to the 60 fps cut instead of halving it.
 */
export const PACE = 60 / FPS;

/** Convert a frame count authored at 60 fps into this composition's frames. */
export const frames60 = (frames: number): number =>
  Math.max(1, Math.round((frames * FPS) / 60));

export type Quality = "preview" | "ci" | "final";

/**
 * Default quality tier. `ci` is the cheap CPU-profile used by CI: no AO, no
 * depth of field, no transmission/reflection, no motion blur, no shadows.
 */
export const QUALITY: Quality = "ci";

/** Independent of QUALITY, exactly as requested. */
export const SHOW_SUBTITLES = true;

export const VIDEO = {
  id: "CodingMistakes3D",
  width: 1080,
  height: 1920,
  fps: FPS,
  durationInFrames: 1410, // 47 seconds at 30 fps
} as const;

export type PostSettings = {
  ao: boolean;
  dof: boolean;
  bloom: boolean;
  glitch: boolean;
  noise: boolean;
  vignette: boolean;
  smaa: boolean;
  chromatic: boolean;
};

export type QualitySettings = {
  /** Instanced glitch cubes. */
  cubes: number;
  /** Instanced spark / debris cubes. */
  particles: number;
  sparkles: number;
  shadows: boolean;
  contactShadows: boolean;
  transmission: boolean;
  reflector: boolean;
  post: PostSettings;
  motionBlurSamples: number;
  /** Motion blur costs one WebGL canvas per sample. Keep this conservative. */
  dpr: number;
  /** Reserved for the path-traced hero pass (not enabled in this build). */
  pathTracingSamples: number;
};

export const QUALITY_SETTINGS: Record<Quality, QualitySettings> = {
  preview: {
    cubes: 180,
    particles: 800,
    sparkles: 90,
    shadows: false,
    contactShadows: false,
    transmission: false,
    reflector: false,
    post: {
      ao: false,
      dof: false,
      bloom: true,
      glitch: true,
      noise: false,
      vignette: true,
      smaa: false,
      chromatic: true,
    },
    motionBlurSamples: 1,
    dpr: 1,
    pathTracingSamples: 0,
  },
  // CPU-only profile for GitHub Actions: bloom + vignette + mild chromatic
  // aberration + SMAA, and nothing that renders offscreen buffers per material.
  ci: {
    cubes: 1000,
    particles: 500,
    sparkles: 80,
    shadows: false,
    contactShadows: false,
    transmission: false,
    reflector: false,
    post: {
      ao: false,
      dof: false,
      bloom: true,
      glitch: false,
      noise: false,
      vignette: true,
      smaa: true,
      chromatic: true,
    },
    motionBlurSamples: 1,
    dpr: 1,
    pathTracingSamples: 0,
  },
  final: {
    cubes: 420,
    particles: 2500,
    sparkles: 240,
    shadows: true,
    contactShadows: true,
    transmission: true,
    reflector: true,
    post: {
      ao: true,
      dof: true,
      bloom: true,
      glitch: true,
      noise: true,
      vignette: true,
      smaa: true,
      chromatic: true,
    },
    // 16 samples would open 16 simultaneous WebGL contexts (and 16 copies of
    // the scene) through @remotion/motion-blur. 6 is the safe ceiling here.
    motionBlurSamples: 6,
    dpr: 1.5,
    pathTracingSamples: 0,
  },
};

export const COLORS = {
  bg: "#0d1117",
  bgDeep: "#05070a",
  red: "#ff3b3b",
  green: "#3fb950",
  cyan: "#58a6ff",
  amber: "#d29922",
  ink: "#e6edf3",
  muted: "#8b949e",
  purple: "#bc8cff",
} as const;

export type Color = (typeof COLORS)[keyof typeof COLORS];

export const FONT = {
  display: "'Inter Black', Inter, system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

export const ASSETS = {
  font3d: "fonts/helvetiker_bold.typeface.json",
  voice: (file: string) => `voice/${file}`,
  sfx: (file: string) => `sfx/${file}`,
  music: "music.wav",
} as const;

/** Convert a 30 fps reference frame into a composition frame. */
export const rf = (referenceFrame: number): number =>
  Math.round(referenceFrame * S);

/** Convert a 30 fps reference duration into composition frames. */
export const rfDuration = (referenceFrames: number): number =>
  Math.round(referenceFrames * S);

/** dB helper for the mix. gain(-6) === 0.501. */
export const dbToGain = (db: number): number => Math.pow(10, db / 20);
