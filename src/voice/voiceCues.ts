/**
 * Voice-over cues.
 *
 * Every value comes from src/voice/voiceManifest.json, which scripts/
 * prepare-voice.ts builds by measuring each clip with ffmpeg: audio start
 * (scene start minus leading silence), speech start/end and word timings.
 * Nothing here is a hardcoded frame.
 */
import { CLIP_TIMINGS, TIMING_ORDER, type ClipTiming } from "./timing";
import { SCENE_SCRIPT } from "./script";

export type VoiceClip = ClipTiming & {
  /** Path relative to public/, e.g. "voice/vo-02-mistake1.mp3". */
  file: string;
  transcript: string;
};

const SCRIPT_BY_ID = Object.fromEntries(
  SCENE_SCRIPT.map((scene) => [scene.id, scene]),
);

export const VOICE_CLIPS: VoiceClip[] = TIMING_ORDER.map((timing) => {
  const script = SCRIPT_BY_ID[timing.id];
  return {
    ...timing,
    file: timing.audio,
    transcript:
      script?.transcript ?? timing.words.map((word) => word.word).join(" "),
  };
});

export const CLIP_BY_ID: Record<string, VoiceClip> = Object.fromEntries(
  VOICE_CLIPS.map((clip) => [clip.id, clip]),
);

export const SPEECH_START = (id: string): number =>
  CLIP_TIMINGS[id]?.speechStartFrame ?? 0;

/** Absolute [start, end] of a clip's audible speech. */
export const voiceRange = (clip: VoiceClip): [number, number] => [
  clip.speechStartFrame,
  clip.speechEndFrame,
];

export const activeClipAt = (frame: number): VoiceClip | null => {
  for (const clip of VOICE_CLIPS) {
    if (frame >= clip.speechStartFrame && frame <= clip.speechEndFrame) {
      return clip;
    }
  }
  return null;
};

/** True while any narration is audible. Used for ducking. */
export const voiceActiveAt = (frame: number): boolean =>
  VOICE_CLIPS.some(
    (clip) => frame >= clip.speechStartFrame && frame <= clip.speechEndFrame,
  );

/** Clips whose speech runs past their scene window (reported at build time). */
export const OVERLONG_CLIPS = VOICE_CLIPS.filter((clip) => !clip.fits);
