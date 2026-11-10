export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION_SECONDS = 30;
export const DURATION_FRAMES = FPS * DURATION_SECONDS;

/** seconds -> frames */
export const sec = (s: number) => Math.round(s * FPS);

/**
 * Set to true after you drop your ElevenLabs file at:
 *   public/audio/voiceover.mp3
 */
export const USE_VOICEOVER = false;
export const VOICEOVER_FILE = "audio/voiceover.mp3";

export const COLORS = {
  bg: "#070a14",
  cyan: "#4fd1ff",
  gold: "#ffc94d",
  white: "#f4f7ff",
  dim: "#6d7a99",
};
