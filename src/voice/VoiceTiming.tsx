import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { FPS } from "../config";
import { BAKED_VOICE_DURATION_FRAMES, VOICE_CLIPS } from "./voiceCues";

const VoiceDurationsContext = createContext<Record<string, number>>(
  BAKED_VOICE_DURATION_FRAMES,
);

let durationPromise: Promise<Record<string, number>> | null = null;

const loadVoiceDurations = (): Promise<Record<string, number>> => {
  if (!durationPromise) {
    durationPromise = Promise.all(
      VOICE_CLIPS.map(async (clip) => {
        try {
          const seconds = await getAudioDurationInSeconds(
            staticFile(`voice/${clip.file}`),
          );
          return [clip.id, Math.max(1, Math.round(seconds * FPS))] as const;
        } catch {
          throw new Error(
            `[voice] Missing or unreadable voice clip: public/voice/${clip.file}. ` +
              `All eight VO clips must exist before rendering.`,
          );
        }
      }),
    )
      .then((entries) => Object.fromEntries(entries))
      .catch((error) => {
        durationPromise = null;
        throw error;
      });
  }
  return durationPromise;
};

export const VoiceTimingProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [handle] = useState(() => delayRender("Loading voice-over durations"));
  const [durations, setDurations] = useState<Record<string, number>>(
    BAKED_VOICE_DURATION_FRAMES,
  );

  useEffect(() => {
    let alive = true;
    loadVoiceDurations()
      .then((loaded) => {
        if (alive) {
          setDurations(loaded);
        }
        continueRender(handle);
      })
      .catch((error: Error) => {
        // Fail the render with a message that names the missing file.
        cancelRender(error);
      });
    return () => {
      alive = false;
    };
  }, [handle]);

  return (
    <VoiceDurationsContext.Provider value={durations}>
      {children}
    </VoiceDurationsContext.Provider>
  );
};

export const useVoiceDurations = (): Record<string, number> =>
  useContext(VoiceDurationsContext);
