/**
 * Single source of truth for scene timing, captions and every sound cue.
 * Times are in seconds. To retime the video, edit start and end here only.
 * Each scene starts about 0.2s before its voice line and its key visual
 * moment lands inside the voice window.
 */
export type Scene = {
  id: string;
  start: number;
  end: number;
  caption: string;
};

export const SCENES: Scene[] = [
  { id: "next-one", start: 0, end: 2.4, caption: "THE NEXT ONE" },
  { id: "what-comes-next", start: 2.4, end: 6.4, caption: "WHAT COMES NEXT?" },
  { id: "maybe-this-one", start: 6.4, end: 11.2, caption: "MAYBE THIS ONE" },
  {
    id: "unpredictable-reward",
    start: 11.2,
    end: 15.2,
    caption: "UNPREDICTABLE REWARD",
  },
  {
    id: "uncertainty-matters",
    start: 15.2,
    end: 20.4,
    caption: "UNCERTAINTY MATTERS",
  },
  { id: "dopamine", start: 20.4, end: 26.8, caption: "DOPAMINE ISN'T JOY" },
  {
    id: "wanting-next-reward",
    start: 26.8,
    end: 34,
    caption: "WANTING THE NEXT REWARD",
  },
  {
    id: "no-stopping-point",
    start: 34,
    end: 42.8,
    caption: "NO STOPPING POINT",
  },
  {
    id: "another-reason",
    start: 42.8,
    end: 48.4,
    caption: "ANOTHER REASON TO CHECK",
  },
  {
    id: "more-scrolling",
    start: 48.4,
    end: 53.6,
    caption: "MORE SCROLLING, MORE BOREDOM",
  },
  { id: "one-more-swipe", start: 53.6, end: 57.6, caption: "ONE MORE SWIPE" },
  {
    id: "stopping-cue",
    start: 57.6,
    end: 62,
    caption: "CREATE A STOPPING CUE",
  },
  { id: "break-the-loop", start: 62, end: 64, caption: "BREAK THE LOOP" },
];

export const getScene = (id: string): Scene => {
  const scene = SCENES.find((item) => item.id === id);
  if (!scene) {
    throw new Error(`Unknown scene id: ${id}`);
  }
  return scene;
};

export const sceneStart = (id: string) => getScene(id).start;

export const sceneEnd = (id: string) => getScene(id).end;

/** Scene local time in seconds. */
export const localTime = (t: number, id: string) => t - sceneStart(id);

export const clampScene = (t: number, id: string) => {
  const scene = getScene(id);
  return Math.min(scene.end, Math.max(scene.start, t));
};

export const sceneAt = (t: number): Scene => {
  let current = SCENES[0];
  for (const scene of SCENES) {
    if (t >= scene.start) {
      current = scene;
    }
  }
  return current;
};

/** Voice windows, used only to keep sustained effects quiet under the voice. */
export const VOICE_WINDOWS = [
  { start: 0.3, end: 2.4 },
  { start: 2.5, end: 6.3 },
  { start: 6.5, end: 11.1 },
  { start: 11.3, end: 15.1 },
  { start: 15.3, end: 20.3 },
  { start: 20.5, end: 26.7 },
  { start: 26.9, end: 33.9 },
  { start: 34.1, end: 42.6 },
  { start: 42.9, end: 48.2 },
  { start: 48.5, end: 53.5 },
  { start: 53.7, end: 57.5 },
  { start: 57.7, end: 61.9 },
  { start: 62.1, end: 64 },
];
