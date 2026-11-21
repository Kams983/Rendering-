/**
 * The single source of truth for every sound and every visual impact.
 *
 * `frame` values are authored at the 30 fps reference and multiplied by S.
 * Nothing outside this file (and the scene timeline) contains a raw cue frame.
 */
import { rf, rfDuration } from "../config";
import { SLAM_FRAME } from "../voice/timing";

export type ImpactTrigger = "impact" | "error" | "slam" | "bass";

export type SfxCue = {
  id: string;
  frame: number;
  file: string;
  /** 0.35 - 0.6, per the mix brief. */
  volume: number;
  /** Whether the voice-over ducks this cue. Defaults to true. */
  duck?: boolean;
  trigger?: ImpactTrigger;
  /** 0..1 strength for the visual systems. */
  weight?: number;
  durationInFrames?: number;
  loop?: boolean;
};

const at = (referenceFrame: number): number => rf(referenceFrame);

/**
 * Caption slam frames. These are not authored: each one is the measured spoken
 * keyword of its clip (scripts/prepare-voice.ts), so a slam can never land
 * before the voice reaches the word it belongs to.
 */
export const SLAM_FRAMES = {
  hook: SLAM_FRAME.hook,
  m1: SLAM_FRAME.m1,
  m2: SLAM_FRAME.m2,
  m3: SLAM_FRAME.m3,
  m4: SLAM_FRAME.m4,
  m5: SLAM_FRAME.m5,
  payoff: SLAM_FRAME.payoff,
  end: SLAM_FRAME.end,
} as const;

export const CUE_FRAMES = {
  hookKeyboard: at(0),
  hookError: at(45),
  hookBass: at(60),
  hookErrorLoud: at(95),
  mistake1: at(130),
  rapidTyping: at(245),
  glitchStutter: at(330),
  mistake2: at(360),
  mouseClick: at(455),
  pasteThud: at(470),
  runWhoosh: at(485),
  errorBoom: at(520),
  mistake3: at(600),
  detectiveZoom1: at(665),
  detectiveZoom2: at(690),
  detectiveZoom3: at(710),
  reveal: at(760),
  mistake4: at(840),
  clockSpin: at(875),
  search: at(1000),
  mistake5: at(1080),
  payoffStart: at(1115),
  fix: at(1250),
  errorFlood: at(1325),
  endSlam: at(1395),
  bassDrop: at(1396),
  silence: at(1400),
  blackout: at(1404),
} as const;

/** Keyboard typing windows, at 60 fps. */
export const TYPING_WINDOWS: Array<[number, number]> = [
  [at(0), at(62)],
  [at(245), at(330)],
];

export const CUES: SfxCue[] = [
  // ---------------------------------------------------------------- hook
  { id: "kb-burst", frame: at(0), file: "keyboard-burst.wav", volume: 0.5, trigger: "impact", weight: 0.4 },
  { id: "beep-1", frame: at(45), file: "error-beep.wav", volume: 0.5, trigger: "error", weight: 0.5 },
  { id: "bass-1", frame: SLAM_FRAMES.hook, file: "bass-hit.wav", volume: 0.6, trigger: "impact", weight: 0.9 },
  {
    id: "timer-roll",
    frame: SLAM_FRAMES.hook,
    file: "timer-tick-roll.wav",
    volume: 0.4,
    durationInFrames: rfDuration(30),
    trigger: "impact",
    weight: 0.25,
  },
  { id: "beep-2", frame: at(95), file: "error-beep.wav", volume: 0.6, trigger: "error", weight: 0.75 },
  { id: "scratch", frame: at(130), file: "record-scratch.wav", volume: 0.5, trigger: "impact", weight: 0.55 },
  { id: "slam-1", frame: SLAM_FRAMES.m1, file: "text-slam.wav", volume: 0.55, trigger: "slam", weight: 1 },

  // ----------------------------------------------------------- mistake 01
  {
    id: "typing-1",
    frame: at(245),
    file: "rapid-typing.wav",
    volume: 0.35,
    durationInFrames: rfDuration(85),
  },
  { id: "glitch-1", frame: at(330), file: "glitch-stutter.wav", volume: 0.5, trigger: "error", weight: 0.65 },

  // ----------------------------------------------------------- mistake 02
  { id: "glass-1", frame: at(360), file: "glass-crack.wav", volume: 0.5, trigger: "impact", weight: 0.6 },
  { id: "slam-2", frame: SLAM_FRAMES.m2, file: "text-slam.wav", volume: 0.55, trigger: "slam", weight: 1 },
  { id: "click", frame: at(455), file: "mouse-click.wav", volume: 0.4 },
  { id: "paste", frame: at(470), file: "paste-thud.wav", volume: 0.45, trigger: "impact", weight: 0.4 },
  { id: "run", frame: at(485), file: "run-whoosh.wav", volume: 0.45 },
  { id: "boom-1", frame: at(520), file: "error-boom.wav", volume: 0.6, trigger: "impact", weight: 0.8 },
  { id: "slam-3", frame: SLAM_FRAMES.m3, file: "text-slam.wav", volume: 0.55, trigger: "slam", weight: 1 },

  // ----------------------------------------------------------- mistake 03
  { id: "zoom-1", frame: at(665), file: "whoosh-zoom.wav", volume: 0.4 },
  { id: "zoom-2", frame: at(690), file: "whoosh-zoom.wav", volume: 0.4 },
  { id: "zoom-3", frame: at(710), file: "whoosh-zoom.wav", volume: 0.42 },
  { id: "ding", frame: at(760), file: "reveal-ding.wav", volume: 0.5, trigger: "impact", weight: 0.5 },
  { id: "pop", frame: at(765), file: "pop.wav", volume: 0.4 },
  { id: "slam-4", frame: SLAM_FRAMES.m4, file: "text-slam.wav", volume: 0.55, trigger: "slam", weight: 1 },

  // ----------------------------------------------------------- mistake 04
  {
    id: "clock-spin",
    frame: at(875),
    file: "clock-tick-spin.wav",
    volume: 0.4,
    durationInFrames: rfDuration(125),
  },
  { id: "search-type", frame: at(1000), file: "search-type.wav", volume: 0.35 },
  { id: "ui-whoosh", frame: at(1000), file: "ui-whoosh.wav", volume: 0.4 },
  { id: "chime", frame: at(1000), file: "notification-chime.wav", volume: 0.5, trigger: "impact", weight: 0.4 },
  { id: "slam-5", frame: SLAM_FRAMES.m5, file: "text-slam.wav", volume: 0.55, trigger: "slam", weight: 1 },

  // --------------------------------------------------------------- payoff
  { id: "beep-soft", frame: at(1115), file: "error-beep.wav", volume: 0.35, trigger: "error", weight: 0.35 },
  { id: "scan", frame: at(1115), file: "scan-sweep.wav", volume: 0.4 },
  { id: "success", frame: at(1250), file: "success-chime.wav", volume: 0.6, trigger: "impact", weight: 0.75 },
  { id: "check-burst", frame: at(1250), file: "checkmark-burst.wav", volume: 0.5, trigger: "impact", weight: 0.65 },

  // ------------------------------------------------------------------ end
  {
    id: "flood",
    frame: at(1325),
    file: "error-flood.wav",
    volume: 0.6,
    trigger: "error",
    weight: 0.85,
    durationInFrames: rfDuration(90),
  },
  { id: "kb-slam", frame: at(1395), file: "keyboard-slam.wav", volume: 0.6, trigger: "impact", weight: 1 },
  { id: "bass-drop", frame: at(1396), file: "bass-drop.wav", volume: 0.6, trigger: "bass", weight: 1 },
];

/** Ambient bed. Kept at 0.15 and ducked by -6 dB under narration. */
export const BEDS = [
  { id: "hum", file: "ambient-hum.wav", volume: 0.15, loop: true },
  { id: "music", file: "music.wav", volume: 0.15, loop: true },
] as const;

/** A short riser into every mistake. */
export const RISER_CUES = [at(20), at(170), at(380), at(590), at(800), at(1040)].map(
  (frame, index) => ({
    id: `riser-${index + 1}`,
    frame,
    file: "riser.wav",
    volume: 0.35,
  }),
);

/** Low-pass sweep across the payoff. */
export const SWEEP_CUES = [
  { id: "sweep", frame: at(1290), file: "lowpass-sweep.wav", volume: 0.3 },
];

export const IMPACT_CUES = CUES.filter((cue) => typeof cue.weight === "number");

export const ERROR_CUES = CUES.filter((cue) => cue.trigger === "error");

export const SLAM_CUES = CUES.filter((cue) => cue.trigger === "slam");

export const BASS_CUE = CUES.find((cue) => cue.trigger === "bass");

/** Non-voice audio files; used for the missing-file warning and probes. */
export const ALL_SFX_FILES = Array.from(
  new Set([
    ...CUES.map((cue) => cue.file),
    ...BEDS.map((bed) => bed.file),
    ...RISER_CUES.map((cue) => cue.file),
    ...SWEEP_CUES.map((cue) => cue.file),
  ]),
);
