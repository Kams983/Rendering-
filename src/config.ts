export type Quality = "draft" | "final";

/**
 * Project default tier. A render can override it with a quality prop.
 * Every timing in the project is derived from the values below.
 */
export const QUALITY: Quality = "final";

export const FPS = 30;
export const DURATION_SECONDS = 64;
export const DURATION_IN_FRAMES = FPS * DURATION_SECONDS;

export const resolveQuality = (value: unknown): Quality =>
  value === "draft" || value === "final" ? value : QUALITY;

export type QualityPreset = {
  width: number;
  height: number;
  shadows: boolean;
  contactShadows: boolean;
  postprocessing: boolean;
  bloom: boolean;
  depthOfField: boolean;
  transmission: boolean;
  reflectFloor: boolean;
  instanceScale: number;
  shadowMapSize: number;
  contactShadowResolution: number;
  environmentResolution: number;
  sphereSegments: number;
  ringSegments: number;
};

export const QUALITY_PRESETS: Record<Quality, QualityPreset> = {
  draft: {
    width: 720,
    height: 1280,
    shadows: false,
    contactShadows: false,
    postprocessing: false,
    bloom: false,
    depthOfField: false,
    transmission: false,
    reflectFloor: false,
    instanceScale: 0.45,
    shadowMapSize: 512,
    contactShadowResolution: 96,
    environmentResolution: 96,
    sphereSegments: 18,
    ringSegments: 64,
  },
  final: {
    width: 1080,
    height: 1920,
    shadows: true,
    contactShadows: true,
    postprocessing: true,
    bloom: true,
    depthOfField: true,
    transmission: true,
    reflectFloor: true,
    instanceScale: 1,
    shadowMapSize: 2048,
    contactShadowResolution: 512,
    environmentResolution: 256,
    sphereSegments: 40,
    ringSegments: 128,
  },
};

export const QUALITY_SETTINGS = QUALITY_PRESETS[QUALITY];

/** Master gain for the effects. The voice is mixed above this later. */
export const SFX_MASTER_VOLUME = 0.35;

export const COLORS = {
  bg: "#04070f",
  navy: "#081226",
  deepNavy: "#050b18",
  panel: "#0d1e36",
  metal: "#aab6c6",
  cyan: "#5fe3ff",
  cyanDeep: "#0d6f8c",
  gold: "#ffc471",
  violet: "#b79bff",
  green: "#7dffc4",
  white: "#f6fbff",
  dim: "#7e93b5",
} as const;

/** System font stack only. No font files are loaded anywhere. */
export const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "DejaVu Sans", sans-serif';

/** Converts a size designed at 1080x1920 to the current composition height. */
export const scaleForHeight = (value: number, height: number) =>
  (value * height) / 1920;

export const secondsToFrames = (seconds: number) => Math.round(seconds * FPS);
