import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { FPS, SFX_MASTER_VOLUME } from "./config";
import { sceneStart } from "./timeline";

type Cue = {
  at: number;
  file: string;
  volume: number;
  label: string;
};

/**
 * Every cue is derived from scene starts in timeline.ts, so retiming a scene
 * also retimes its sound. The master gain keeps the mix under the voice.
 */
const POP_TIMES = Array.from(
  { length: 8 },
  (_, i) => sceneStart("assemble") + 0.38 + i * 0.33,
);

const BAR_TICK_TIMES = Array.from(
  { length: 5 },
  (_, i) => sceneStart("predict") + 0.7 + i * 0.18,
);

const SNAP_TIMES = Array.from(
  { length: 7 },
  (_, i) => sceneStart("loop") + 0.5 + i * 0.72,
);

const FAST_TICK_TIMES = Array.from(
  { length: 14 },
  (_, i) => sceneStart("loop") + 0.85 + i * 0.36,
);

const CHECK_TIMES = [0.75, 1.45, 2.15].map((offset) => sceneStart("feedback") + offset);
const CROSS_TIMES = [1.1, 1.8, 2.5].map((offset) => sceneStart("feedback") + offset);

const CUES: Cue[] = [
  { at: 0, file: "bass_hit.wav", volume: 0.62, label: "bass hit" },
  { at: 0.03, file: "key_click.wav", volume: 0.5, label: "keyboard click" },
  ...POP_TIMES.map((at) => ({ at, file: "pop.wav", volume: 0.34, label: "block pop" })),
  { at: sceneStart("tokens"), file: "chime.wav", volume: 0.48, label: "token chime" },
  {
    at: sceneStart("question") + 0.06,
    file: "typing.wav",
    volume: 0.34,
    label: "question typing",
  },
  {
    at: sceneStart("question") + 0.72,
    file: "whoosh.wav",
    volume: 0.4,
    label: "split whoosh",
  },
  ...BAR_TICK_TIMES.map((at) => ({ at, file: "tick.wav", volume: 0.26, label: "bar tick" })),
  {
    at: sceneStart("predict") + 1.55,
    file: "riser.wav",
    volume: 0.4,
    label: "probability riser",
  },
  {
    at: sceneStart("predict") + 3.05,
    file: "tick.wav",
    volume: 0.32,
    label: "winner tick",
  },
  ...SNAP_TIMES.map((at) => ({ at, file: "snap.wav", volume: 0.36, label: "chain snap" })),
  ...FAST_TICK_TIMES.map((at) => ({
    at,
    file: "tick.wav",
    volume: 0.11,
    label: "loop tick",
  })),
  { at: sceneStart("training"), file: "rush.wav", volume: 0.48, label: "training swell" },
  {
    at: sceneStart("attention") + 0.05,
    file: "shimmer.wav",
    volume: 0.34,
    label: "attention shimmer",
  },
  {
    at: sceneStart("attention") + 0.05,
    file: "hum.wav",
    volume: 0.28,
    label: "attention hum",
  },
  ...CHECK_TIMES.map((at) => ({ at, file: "ding.wav", volume: 0.38, label: "check ding" })),
  ...CROSS_TIMES.map((at) => ({ at, file: "thud.wav", volume: 0.42, label: "cross thud" })),
  { at: sceneStart("answer"), file: "crack.wav", volume: 0.46, label: "glass crack" },
  {
    at: sceneStart("answer") + 0.01,
    file: "bass_hit.wav",
    volume: 0.48,
    label: "answer bass",
  },
  {
    at: sceneStart("wrong") + 0.05,
    file: "dissonant.wav",
    volume: 0.4,
    label: "wrong tone",
  },
  { at: sceneStart("helper"), file: "warm_swell.wav", volume: 0.42, label: "helper swell" },
  {
    at: sceneStart("final"),
    file: "shimmer.wav",
    volume: 0.32,
    label: "final shimmer",
  },
  {
    at: sceneStart("final") + 0.02,
    file: "bass_hit.wav",
    volume: 0.32,
    label: "final soft bass",
  },
].sort((a, b) => a.at - b.at);

export const Sfx: React.FC = () => {
  return (
    <>
      {CUES.map((cue, index) => (
        <Sequence
          key={`${cue.file}-${cue.at}-${index}`}
          from={Math.round(cue.at * FPS)}
          layout="none"
        >
          <Audio
            src={staticFile(`audio/${cue.file}`)}
            volume={Math.min(1, cue.volume * SFX_MASTER_VOLUME)}
          />
        </Sequence>
      ))}
    </>
  );
};
