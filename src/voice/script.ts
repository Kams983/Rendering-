/**
 * The narration script, its scene windows and the word each caption lands on.
 *
 * Pure data + pure functions: no imports, so scripts/prepare-voice.ts can load
 * it directly with Node's type stripping as well as the Remotion bundle.
 * Frames are authored at the 30 fps reference and scaled by S (60/30).
 */

export type SceneScript = {
  /** Also the key used by SLAM_FRAMES and the voice manifest. */
  id: string;
  /** Source clip inside public/voice. */
  file: string;
  /** 30 fps reference window of the scene. */
  refStart: number;
  refEnd: number;
  /**
   * The spoken phrase the caption slam must land on. Matching is by phrase,
   * not by a loose word: "error" in this script appears several times, and a
   * caption must not land on the wrong one.
   */
  anchor: {
    /** Consecutive words from the transcript, in order. */
    phrase: string;
    /** Index of the word inside the phrase that the caption lands on. */
    word?: number;
    /** Which occurrence of the phrase counts; defaults to the first. */
    occurrence?: "first" | "last";
  };
  transcript: string;
};

export const REFERENCE_FPS = 30;

export const SCENE_SCRIPT: SceneScript[] = [
  {
    id: "hook",
    file: "vo-01-hook.mp3",
    refStart: 0,
    refEnd: 90,
    anchor: { phrase: "Three hours", word: 0 },
    transcript:
      "Three hours. One bug. I just stared, learning nothing.",
  },
  {
    id: "m1",
    file: "vo-02-mistake1.mp3",
    refStart: 90,
    refEnd: 240,
    anchor: { phrase: "Ignoring the error", word: 2 },
    transcript:
      "Mistake one. Ignoring the error. The message isn't noise. It's telling you where to look.",
  },
  {
    id: "m2",
    file: "vo-03-mistake2.mp3",
    refStart: 240,
    refEnd: 450,
    anchor: { phrase: "Change one thing", word: 0, occurrence: "last" },
    transcript:
      "Mistake two. Changing five things at once. Now you do not know which change fixed it, or which one broke it. Change one thing, then test.",
  },
  {
    id: "m3",
    file: "vo-04-mistake3.mp3",
    refStart: 450,
    refEnd: 660,
    anchor: { phrase: "copy", word: 0, occurrence: "last" },
    transcript:
      "Mistake three. Copying code you don't understand. It runs, you smile, then it breaks. Don't just copy.",
  },
  {
    id: "m4",
    file: "vo-05-mistake4.mp3",
    refStart: 660,
    refEnd: 870,
    anchor: { phrase: "Check the basics first", word: 2 },
    transcript:
      "Mistake four. Ignoring the obvious. A missing bracket. A lowercase letter. Check the basics first.",
  },
  {
    id: "m5",
    file: "vo-06-mistake5.mp3",
    refStart: 870,
    refEnd: 1110,
    anchor: { phrase: "Ask. Search. Learn.", word: 0, occurrence: "last" },
    transcript:
      "Mistake five. Refusing to ask for help. You are not the first person on Earth to hit this error. Ask. Search. Learn.",
  },
  {
    id: "payoff",
    file: "vo-07-payoff.mp3",
    refStart: 1110,
    refEnd: 1320,
    anchor: { phrase: "Errors are part of coding", word: 0 },
    transcript: "Every error is a clue, not a verdict. Errors are part of coding.",
  },
  {
    id: "end",
    file: "vo-08-end.mp3",
    refStart: 1320,
    refEnd: 1410,
    anchor: { phrase: "Welcome to coding", word: 0 },
    transcript: "Welcome to coding. It gets easier.",
  },
];

export type WordTiming = {
  word: string;
  /** Frames from the start of speech. */
  startFrame: number;
  endFrame: number;
};

export const splitWords = (transcript: string): string[] =>
  transcript.split(/\s+/).filter(Boolean);

export const normalizeToken = (word: string): string =>
  word.toLowerCase().replace(/[^a-z0-9']/g, "");

/**
 * Index of the anchored word in the transcript, or -1 when the phrase is not
 * there. The phrase must match consecutive words; `occurrence: "last"` picks
 * the final match ("Don't just copy" is the last "copy", not "Copying").
 */
export const anchorWordIndex = (
  words: string[],
  anchor: SceneScript["anchor"],
): number => {
  const phrase = splitWords(anchor.phrase).map(normalizeToken);
  if (phrase.length === 0) {
    return -1;
  }
  const offset = anchor.word ?? 0;
  const matches: number[] = [];
  for (let index = 0; index + phrase.length <= words.length; index += 1) {
    if (
      phrase.every(
        (token, step) => normalizeToken(words[index + step]) === token,
      )
    ) {
      matches.push(index + offset);
    }
  }
  if (matches.length === 0) {
    return -1;
  }
  return anchor.occurrence === "last"
    ? matches[matches.length - 1]
    : matches[0];
};

/** A measured pause, in frames from the first spoken word. */
export type SilenceSpan = { start: number; end: number };

/**
 * Distribute words across the spoken (non-silent) parts of the clip by
 * character weight, with a pause after punctuation. Silence is never given to
 * a word, so a word's frame stays on the audio the narrator actually speaks
 * instead of drifting earlier across every pause.
 */
export const buildWordTimings = (
  words: string[],
  durationInFrames: number,
  silences: SilenceSpan[] = [],
): WordTiming[] => {
  const span = Math.max(1, durationInFrames);
  const weights = words.map((word) => {
    const punctuation = /[.,!?;:]$/.test(word) ? 3.2 : 0;
    return Math.max(2, word.length) + punctuation;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;

  const voiced: SilenceSpan[] = [];
  let cursor = 0;
  for (const silence of [...silences].sort((a, b) => a.start - b.start)) {
    const start = Math.max(0, Math.min(span, silence.start));
    const end = Math.max(0, Math.min(span, silence.end));
    if (end - start < 1) {
      continue;
    }
    if (start > cursor) {
      voiced.push({ start: cursor, end: start });
    }
    cursor = Math.max(cursor, end);
  }
  if (cursor < span) {
    voiced.push({ start: cursor, end: span });
  }
  const totalVoiced = voiced.reduce((sum, part) => sum + (part.end - part.start), 0);

  if (voiced.length === 0 || totalVoiced < 2) {
    let plain = 0;
    return words.map((word, index) => {
      const width = (weights[index] / total) * span;
      const start = plain;
      plain += width;
      return {
        word,
        startFrame: Math.round(start),
        endFrame: Math.round(plain),
      };
    });
  }

  const toRealFrame = (voicedFrames: number): number => {
    let left = voicedFrames;
    for (const part of voiced) {
      const length = part.end - part.start;
      if (left <= length) {
        return part.start + left;
      }
      left -= length;
    }
    return span;
  };

  let used = 0;
  let voicedCursor = 0;
  return words.map((word, index) => {
    const length =
      index === words.length - 1
        ? Math.max(1, totalVoiced - used)
        : (weights[index] / total) * totalVoiced;
    const start = toRealFrame(voicedCursor);
    voicedCursor += length;
    if (index !== words.length - 1) {
      used += length;
    }
    const end = toRealFrame(voicedCursor);
    return {
      word,
      startFrame: Math.round(start),
      endFrame: Math.max(Math.round(start) + 1, Math.round(end)),
    };
  });
};

export const sceneStartFrame = (scene: SceneScript, fps: number): number =>
  Math.round((scene.refStart * fps) / REFERENCE_FPS);

export const sceneWindowFrames = (scene: SceneScript, fps: number): number =>
  Math.round(((scene.refEnd - scene.refStart) * fps) / REFERENCE_FPS);
