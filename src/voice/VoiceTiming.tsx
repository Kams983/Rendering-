import React, { PropsWithChildren, useEffect, useState } from "react";
import {
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
} from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { VOICE_CLIPS } from "./voiceCues";

/**
 * Holds the render until every measured voice file is readable. The durations
 * themselves are not measured here: they come from the build-time manifest
 * (npm run voice:prepare), so frame 0 already has correct timings.
 */
let verifyPromise: Promise<void> | null = null;

const verifyVoiceFiles = (): Promise<void> => {
  if (!verifyPromise) {
    verifyPromise = Promise.all(
      VOICE_CLIPS.map(async (clip) => {
        try {
          await getAudioDurationInSeconds(staticFile(clip.file));
        } catch {
          throw new Error(
            `[voice] Missing or unreadable voice clip: public/${clip.file}. ` +
              `Run \`npm run voice:prepare\` to measure and fit all eight VO clips.`,
          );
        }
      }),
    )
      .then(() => undefined)
      .catch((error) => {
        verifyPromise = null;
        throw error;
      });
  }
  return verifyPromise;
};

export const VoiceTimingProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const [handle] = useState(() => delayRender("Checking voice-over clips"));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    verifyVoiceFiles()
      .then(() => {
        if (alive) {
          setReady(true);
        }
        continueRender(handle);
      })
      .catch((error: Error) => {
        cancelRender(error);
      });
    return () => {
      alive = false;
    };
  }, [handle]);

  return ready ? <>{children}</> : null;
};
