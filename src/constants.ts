export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION_IN_FRAMES = 1800;
export const SFX_VOLUME = 0.28;
export const USE_VOICEOVER = false;

export const COLORS = {
  night: "#07101d",
  water: "#102a40",
  waterLight: "#28617a",
  island: "#496b48",
  islandLight: "#789355",
  forest: "#254b3b",
  wood: "#9b6540",
  roof: "#503c37",
  gold: "#f6c867",
  text: "#fff5df",
  muted: "#bfd0cf",
  road: "#d8c6a0",
  glow: "#f2ae54",
};

export const SCENES = [
  { from: 0, duration: 105 },
  { from: 105, duration: 105 },
  { from: 210, duration: 90 },
  { from: 300, duration: 165 },
  { from: 465, duration: 195 },
  { from: 660, duration: 120 },
  { from: 780, duration: 120 },
  { from: 900, duration: 180 },
  { from: 1080, duration: 180 },
  { from: 1260, duration: 150 },
  { from: 1410, duration: 150 },
  { from: 1560, duration: 240 },
] as const;
