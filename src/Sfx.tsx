import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { DURATION_IN_FRAMES, SFX_MASTER_VOLUME, secondsToFrames } from "./config";
import { getScene, sceneStart } from "./timeline";

type Cue = {
  at: number;
  file: string;
  volume: number;
  label: string;
};

const seconds = (id: string, offset: number) => sceneStart(id) + offset;

/**
 * One constants array for the whole sound bed. Every time is relative to a
 * scene start in timeline.ts, so retiming a scene also retimes its sound.
 */
const SWIPE_TIMES = [
  seconds("next-one", 0.55),
  seconds("next-one", 1.35),
  seconds("what-comes-next", 0.12),
  seconds("maybe-this-one", 0.3),
  seconds("maybe-this-one", 0.6),
  seconds("maybe-this-one", 0.9),
  seconds("one-more-swipe", 0.7),
];

const TICK_TIMES = [0, 1, 2, 3, 4].map((index) =>
  seconds("uncertainty-matters", 0.5 + index * 0.4),
);

const DULL_SWIPE_TIMES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) =>
  seconds("more-scrolling", 0.18 + index * 0.46),
);

const TIMER_TIMES = [0, 1, 2, 3].map((index) =>
  seconds("stopping-cue", 1.0 + index * 0.72),
);

const CUES: Cue[] = [
  { at: 0, file: "low_hit.wav", volume: 0.44, label: "opening low hit" },
  { at: 0.06, file: "swish.wav", volume: 0.28, label: "opening card swish" },
  ...SWIPE_TIMES.map((at) => ({
    at,
    file: "swish.wav",
    volume: 0.3,
    label: "card swipe",
  })),
  {
    at: seconds("unpredictable-reward", 1.15),
    file: "chime.wav",
    volume: 0.5,
    label: "reward chime",
  },
  ...TICK_TIMES.map((at) => ({
    at,
    file: "tick.wav",
    volume: 0.26,
    label: "uncertainty tick",
  })),
  {
    at: seconds("uncertainty-matters", 3.05),
    file: "flash.wav",
    volume: 0.4,
    label: "unexpected flash",
  },
  {
    at: seconds("dopamine", 0.3),
    file: "pulse_hum.wav",
    volume: 0.26,
    label: "pulse hum",
  },
  {
    at: seconds("wanting-next-reward", 3.15),
    file: "swell.wav",
    volume: 0.44,
    label: "wanting swell",
  },
  {
    at: seconds("no-stopping-point", 0.2),
    file: "tunnel.wav",
    volume: 0.3,
    label: "endless tunnel air",
  },
  {
    at: seconds("another-reason", 0.55),
    file: "ping.wav",
    volume: 0.42,
    label: "notification ping",
  },
  ...DULL_SWIPE_TIMES.map((at) => ({
    at,
    file: "dull_swipe.wav",
    volume: 0.26,
    label: "flat swipe",
  })),
  {
    at: seconds("stopping-cue", 0.28),
    file: "glass_tap.wav",
    volume: 0.44,
    label: "barrier tap",
  },
  ...TIMER_TIMES.map((at) => ({
    at,
    file: "timer_tick.wav",
    volume: 0.3,
    label: "timer tick",
  })),
  {
    at: seconds("break-the-loop", 0),
    file: "low_hit.wav",
    volume: 0.42,
    label: "closing low hit",
  },
  {
    at: seconds("break-the-loop", 0.04),
    file: "decay.wav",
    volume: 0.4,
    label: "final decay",
  },
];

/** Audio clock length for each cue, so no tail is cut off by a Sequence. */
const CUE_LENGTHS: Record<string, number> = {
  "low_hit.wav": 2.5,
  "swish.wav": 0.6,
  "dull_swipe.wav": 0.5,
  "chime.wav": 2.65,
  "tick.wav": 0.2,
  "flash.wav": 1,
  "pulse_hum.wav": 3.85,
  "swell.wav": 2.95,
  "tunnel.wav": 9.55,
  "ping.wav": 1.55,
  "glass_tap.wav": 1.05,
  "timer_tick.wav": 0.22,
  "decay.wav": 4.05,
};

export const Sfx: React.FC = () => {
  const end = getScene("break-the-loop").end;

  return (
    <>
      {CUES.filter((cue) => cue.at < end).map((cue, index) => {
        const from = Math.max(0, secondsToFrames(cue.at));
        const length = Math.min(
          secondsToFrames(CUE_LENGTHS[cue.file] ?? 1),
          DURATION_IN_FRAMES - from,
        );
        if (length <= 0) {
          return null;
        }
        return (
          <Sequence
            key={`${cue.label}-${index}`}
            from={from}
            durationInFrames={length}
            name={`SFX ${cue.label}`}
          >
            <Audio
              src={staticFile(`audio/${cue.file}`)}
              volume={SFX_MASTER_VOLUME * cue.volume}
            />
          </Sequence>
        );
      })}
    </>
  );
};
