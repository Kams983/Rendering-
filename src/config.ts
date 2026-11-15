export type Quality = "draft" | "final";

/** Every animation timing in the project is derived from these values. */
export const FPS = 30;
export const DURATION_SECONDS = 64;
export const DURATION_IN_FRAMES = FPS * DURATION_SECONDS;

/** Default tier. A render can override it with the quality input prop. */
export const QUALITY: Quality = "final";

export const resolveQuality = (value: unknown): Quality =>
  value === "draft" ? "draft" : QUALITY;

export type QualityPreset = {
  width: number;
  height: number;
  shadows: boolean;
  contactShadows: boolean;
  instanceScale: number;
  shadowMapSize: number;
  contactShadowResolution: number;
  environmentResolution: number;
  sphereSegments: number;
};

export const QUALITY_PRESETS: Record<Quality, QualityPreset> = {
  draft: {
    width: 720,
    height: 1280,
    shadows: false,
    contactShadows: false,
    instanceScale: 0.5,
    shadowMapSize: 512,
    contactShadowResolution: 128,
    environmentResolution: 96,
    sphereSegments: 24,
  },
  final: {
    width: 1080,
    height: 1920,
    shadows: true,
    contactShadows: true,
    instanceScale: 1,
    shadowMapSize: 2048,
    contactShadowResolution: 512,
    environmentResolution: 256,
    sphereSegments: 48,
  },
};

export const QUALITY_SETTINGS = QUALITY_PRESETS[QUALITY];

/** Master gain for all effects. The voice track is mixed above this later. */
export const SFX_MASTER_VOLUME = 0.35;

export const COLORS = {
  bg: "#050a18",
  navy: "#0a1330",
  panel: "#102446",
  cyan: "#5ce1ff",
  cyanDeep: "#0b7f9e",
  gold: "#ffc857",
  green: "#6dffb0",
  red: "#ff5f6d",
  white: "#f7fbff",
  dim: "#8fa3c8",
  ink: "#060b17",
} as const;

/** System font stack only. No web fonts are loaded anywhere. */
export const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "DejaVu Sans", sans-serif';

/** Converts a size designed at 1080x1920 to the current composition height. */
export const scaleForHeight = (value: number, height: number) =>
  (value * height) / 1920;

export const secondsToFrames = (seconds: number) => Math.round(seconds * FPS);
