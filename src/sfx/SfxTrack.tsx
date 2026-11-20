import React, { useEffect, useState } from "react";
import {
  Audio,
  continueRender,
  delayRender,
  Sequence,
  staticFile,
} from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { dbToGain, VIDEO } from "../config";
import {
  ALL_SFX_FILES,
  BASS_CUE,
  BEDS,
  CUES,
  RISER_CUES,
  SWEEP_CUES,
  type SfxCue,
} from "./cues";
import { useVoiceDurations } from "../voice/VoiceTiming";
import { voiceActiveAt } from "../voice/voiceCues";

export const sfxPath = (file: string): string =>
  file === "music.wav" ? staticFile("music.wav") : staticFile(`sfx/${file}`);

let availabilityPromise: Promise<Set<string>> | null = null;

const loadAvailability = (): Promise<Set<string>> => {
  if (!availabilityPromise) {
    availabilityPromise = Promise.all(
      ALL_SFX_FILES.map(async (file) => {
        try {
          await getAudioDurationInSeconds(sfxPath(file));
          return file;
        } catch {
          console.warn(
            `[sfx] Missing sound "public/sfx/${file}" — skipping. Run \`npm run gen-audio\`.`,
          );
          return null;
        }
      }),
    ).then((files) => new Set(files.filter((file): file is string => file !== null)));
  }
  return availabilityPromise;
};

const useSfxAvailability = (): Set<string> | null => {
  const [handle] = useState(() => delayRender("Checking SFX assets"));
  const [available, setAvailable] = useState<Set<string> | null>(null);

  useEffect(() => {
    let alive = true;
    loadAvailability()
      .then((files) => {
        if (alive) {
          setAvailable(files);
        }
        continueRender(handle);
      })
      .catch(() => {
        if (alive) {
          setAvailable(new Set());
        }
        continueRender(handle);
      });
    return () => {
      alive = false;
    };
  }, [handle]);

  return available;
};

const BED_GAIN = dbToGain(-6);

/**
 * Every SFX is ducked to 0.35 while narration is audible, and the ambient beds
 * drop by -6 dB. The voice itself stays at 1.0.
 */
export const SfxTrack: React.FC = () => {
  const durations = useVoiceDurations();
  const available = useSfxAvailability();

  if (!available) {
    return null;
  }

  const playable = (cue: { file: string }) => available.has(cue.file);

  const cueVolume = (cue: SfxCue) => (localFrame: number): number => {
    const absolute = cue.frame + localFrame;
    const ducked =
      cue.duck !== false && voiceActiveAt(absolute, durations);
    return cue.volume * (ducked ? 0.35 : 1);
  };

  return (
    <>
      {BEDS.filter((bed) => available.has(bed.file)).map((bed) => (
        <Sequence
          key={bed.id}
          from={0}
          durationInFrames={VIDEO.durationInFrames}
          name={`bed ${bed.id}`}
        >
          <Audio
            src={sfxPath(bed.file)}
            loop={bed.loop}
            volume={(localFrame) => {
              const absolute = localFrame;
              const duck = voiceActiveAt(absolute, durations) ? BED_GAIN : 1;
              // Fade the bed out under the final bass drop.
              const fadeStart = BASS_CUE ? BASS_CUE.frame - 20 : 0;
              const fade =
                absolute > fadeStart
                  ? Math.max(0, 1 - (absolute - fadeStart) / 46)
                  : 1;
              return bed.volume * duck * fade;
            }}
          />
        </Sequence>
      ))}

      {CUES.filter(playable).map((cue) => (
        <Sequence
          key={`${cue.id}-${cue.frame}`}
          from={cue.frame}
          durationInFrames={cue.durationInFrames}
          name={`sfx ${cue.id}`}
        >
          <Audio
            src={sfxPath(cue.file)}
            loop={cue.loop}
            volume={cueVolume(cue)}
          />
        </Sequence>
      ))}

      {RISER_CUES.filter(playable).map((cue) => (
        <Sequence key={cue.id} from={cue.frame} name={`riser ${cue.id}`}>
          <Audio
            src={sfxPath(cue.file)}
            volume={(localFrame) =>
              cue.volume *
              (voiceActiveAt(cue.frame + localFrame, durations) ? 0.35 : 1)
            }
          />
        </Sequence>
      ))}

      {SWEEP_CUES.filter(playable).map((cue) => (
        <Sequence key={cue.id} from={cue.frame} name={`sweep ${cue.id}`}>
          <Audio
            src={sfxPath(cue.file)}
            volume={(localFrame) =>
              cue.volume *
              (voiceActiveAt(cue.frame + localFrame, durations) ? 0.35 : 1)
            }
          />
        </Sequence>
      ))}
    </>
  );
};
