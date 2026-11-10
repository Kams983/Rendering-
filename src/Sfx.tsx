import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { sec, USE_VOICEOVER, VOICEOVER_FILE } from "./config";

type Cue = { at: number; file: string; volume?: number };

/** Every sound effect, timed in seconds. Edit the numbers to retime. */
const CUES: Cue[] = [
  { at: 0.0, file: "whoosh_rise.wav", volume: 0.7 },
  { at: 1.3, file: "bass_hit.wav", volume: 0.8 },
  { at: 3.0, file: "hum.wav", volume: 0.35 },
  { at: 3.4, file: "pop.wav", volume: 0.7 },
  { at: 6.4, file: "riser.wav", volume: 0.6 },
  { at: 7.2, file: "chime.wav", volume: 0.7 },
  { at: 10.3, file: "ding.wav", volume: 0.5 },
  { at: 10.9, file: "ding.wav", volume: 0.5 },
  { at: 11.5, file: "ding.wav", volume: 0.5 },
  { at: 12.0, file: "crumple.wav", volume: 0.8 },
  { at: 14.6, file: "thud.wav", volume: 0.9 },
  ...Array.from({ length: 8 }, (_, i) => ({
    at: 15.2 + i * 0.85,
    file: "step_click.wav",
    volume: 0.6,
  })),
  { at: 18.3, file: "tick.wav", volume: 0.6 },
  { at: 19.8, file: "tick.wav", volume: 0.6 },
  { at: 21.3, file: "tick.wav", volume: 0.6 },
  { at: 21.6, file: "loop_whir.wav", volume: 0.5 },
  { at: 23.0, file: "swell.wav", volume: 0.6 },
  { at: 27.3, file: "final_hit.wav", volume: 0.9 },
  { at: 28.6, file: "shimmer.wav", volume: 0.5 },
];

export const Sfx: React.FC = () => {
  return (
    <>
      {USE_VOICEOVER && <Audio src={staticFile(VOICEOVER_FILE)} volume={1} />}
      {CUES.map((c, i) => (
        <Sequence key={i} from={sec(c.at)} layout="none">
          <Audio src={staticFile(`audio/${c.file}`)} volume={c.volume ?? 0.7} />
        </Sequence>
      ))}
    </>
  );
};
