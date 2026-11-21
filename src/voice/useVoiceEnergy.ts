import { useCurrentFrame } from "remotion";
import { staticFile } from "remotion";
import { useAudioData, visualizeAudio } from "@remotion/media-utils";
import { FPS } from "../config";
import { clamp01 } from "../utils/math";
import { useVoiceDurations } from "./VoiceTiming";
import { activeClipAt, VOICE_CLIPS } from "./voiceCues";

/**
 * Uses @remotion/media-utils on the currently active clip. The eight
 * useAudioData calls are stable in count, so the hook order is constant.
 */
export const useVoiceEnergy = (): number => {
  const frame = useCurrentFrame();
  const durations = useVoiceDurations();
  const audio = VOICE_CLIPS.map((clip) =>
    useAudioData(staticFile(`voice/${clip.file}`)),
  );

  const active = activeClipAt(frame, durations);
  if (!active) {
    return 0;
  }

  const index = VOICE_CLIPS.findIndex((clip) => clip.id === active.id);
  const data = audio[index];
  if (!data) {
    return 0;
  }

  const localFrame = Math.round(frame - active.startFrame);
  if (localFrame < 0) {
    return 0;
  }

  const samples = visualizeAudio({
    audioData: data,
    frame: localFrame,
    fps: FPS,
    numberOfSamples: 32,
    smoothing: true,
  });

  if (samples.length === 0) {
    return 0;
  }

  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  return clamp01(mean * 3.4);
};
