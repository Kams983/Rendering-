/**
 * Voice-over cues.
 *
 * startFrame values are authored at the 30 fps reference and scaled by S.
 * Durations are loaded from the actual MP3s with getAudioDurationInSeconds
 * inside a delayRender/continueRender boundary (see VoiceTiming.tsx); the
 * baked values below are the measured fallback so ducking and subtitles are
 * correct on the very first frame.
 */
import { FPS, rf } from "../config";

export type VoiceClip = {
  id: string;
  file: string;
  startFrame: number;
  transcript: string;
  words: string[];
  durationInSeconds: number;
};

export const VOICE_CLIPS: VoiceClip[] = [
  {
    id: "hook",
    file: "vo-01-hook.mp3",
    startFrame: rf(0),
    transcript:
      "Three hours. One bug. I stared at the same line, changing nothing, learning nothing.",
    words: "Three hours. One bug. I stared at the same line, changing nothing, learning nothing.".split(" "),
    durationInSeconds: 3.7877551020408164,
  },
  {
    id: "m1",
    file: "vo-02-mistake1.mp3",
    startFrame: rf(90),
    transcript:
      "Mistake one. Ignoring the error. The message is not noise. It is telling you exactly where to look. Read the error.",
    words:
      "Mistake one. Ignoring the error. The message is not noise. It is telling you exactly where to look. Read the error.".split(" "),
    durationInSeconds: 8.986122448979591,
  },
  {
    id: "m2",
    file: "vo-03-mistake2.mp3",
    startFrame: rf(240),
    transcript:
      "Mistake two. Changing five things at once. Now you do not know which change fixed it, or which one broke it. Change one thing, then test.",
    words:
      "Mistake two. Changing five things at once. Now you do not know which change fixed it, or which one broke it. Change one thing, then test.".split(" "),
    durationInSeconds: 7.39265306122449,
  },
  {
    id: "m3",
    file: "vo-04-mistake3.mp3",
    startFrame: rf(450),
    transcript:
      "Mistake three. Copying code you do not understand. It runs. You smile. Then it breaks, and you have no idea why. Do not just copy.",
    words:
      "Mistake three. Copying code you do not understand. It runs. You smile. Then it breaks, and you have no idea why. Do not just copy.".split(" "),
    durationInSeconds: 12.51265306122449,
  },
  {
    id: "m4",
    file: "vo-05-mistake4.mp3",
    startFrame: rf(660),
    transcript:
      "Mistake four. Ignoring the obvious. A typo. A missing bracket. A lowercase letter. Check the basics first.",
    words:
      "Mistake four. Ignoring the obvious. A typo. A missing bracket. A lowercase letter. Check the basics first.".split(" "),
    durationInSeconds: 7.81061224489796,
  },
  {
    id: "m5",
    file: "vo-06-mistake5.mp3",
    startFrame: rf(870),
    transcript:
      "Mistake five. Refusing to ask for help. You are not the first person on Earth to hit this error. Ask. Search. Learn.",
    words:
      "Mistake five. Refusing to ask for help. You are not the first person on Earth to hit this error. Ask. Search. Learn.".split(" "),
    durationInSeconds: 12.199183673469388,
  },
  {
    id: "payoff",
    file: "vo-07-payoff.mp3",
    startFrame: rf(1110),
    transcript:
      "Every error is a clue, not a verdict. Errors are part of coding.",
    words: "Every error is a clue, not a verdict. Errors are part of coding.".split(" "),
    durationInSeconds: 6.2693877551020405,
  },
  {
    id: "end",
    file: "vo-08-end.mp3",
    startFrame: rf(1320),
    transcript:
      "So welcome to coding. It gets easier. Not because you stop breaking things, but because you learn how to fix them.",
    words:
      "So welcome to coding. It gets easier. Not because you stop breaking things, but because you learn how to fix them.".split(" "),
    durationInSeconds: 3.3959183673469386,
  },
];

export const BAKED_VOICE_DURATION_FRAMES: Record<string, number> = Object.fromEntries(
  VOICE_CLIPS.map((clip) => [
    clip.id,
    Math.max(1, Math.round(clip.durationInSeconds * FPS)),
  ]),
);

export type WordTiming = { word: string; start: number; end: number };

/**
 * Distribute words across the clip by character weight, with a pause after
 * punctuation. Deterministic and good enough for word-level subtitles.
 */
export const buildWordTimings = (
  clip: VoiceClip,
  durationInFrames: number,
): WordTiming[] => {
  const weights = clip.words.map((word) => {
    const punctuation = /[.,!?;:]$/.test(word) ? 3.2 : 0;
    return Math.max(2, word.length) + punctuation;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;
  return clip.words.map((word, index) => {
    const span = (weights[index] / total) * durationInFrames;
    const start = cursor;
    cursor += span;
    return { word, start, end: cursor };
  });
};

export const activeClipAt = (
  frame: number,
  durations: Record<string, number>,
): VoiceClip | null => {
  let active: VoiceClip | null = null;
  for (const clip of VOICE_CLIPS) {
    if (frame < clip.startFrame) {
      continue;
    }
    const length = durations[clip.id] ?? BAKED_VOICE_DURATION_FRAMES[clip.id];
    if (frame <= clip.startFrame + length) {
      active = clip;
    }
  }
  return active;
};

export const voiceRange = (
  clip: VoiceClip,
  durations: Record<string, number>,
): [number, number] => [
  clip.startFrame,
  clip.startFrame + (durations[clip.id] ?? BAKED_VOICE_DURATION_FRAMES[clip.id]),
];

/** True while any narration is audible. Used for ducking. */
export const voiceActiveAt = (
  frame: number,
  durations: Record<string, number>,
): boolean => {
  for (const clip of VOICE_CLIPS) {
    const [start, end] = voiceRange(clip, durations);
    if (frame >= start && frame <= end) {
      return true;
    }
  }
  return false;
};
