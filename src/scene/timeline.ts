/**
 * Eight camera locations and their captions, authored at the 30 fps reference.
 * The camera holds at a location and travels in the tail of its window, so a
 * caption always lands after the camera has arrived.
 */
import { COLORS, rf, type Color } from "../config";
import { inverseLerp, smoothstep } from "../utils/math";
import { SLAM_FRAMES } from "../sfx/cues";

export type Vec3 = [number, number, number];

export type StationId =
  | "hook"
  | "errors"
  | "onechg"
  | "copy"
  | "typo"
  | "help"
  | "payoff"
  | "end";

export type Station = {
  id: StationId;
  index: number;
  refStart: number;
  refEnd: number;
  start: number;
  end: number;
  label: string;
  lines: [string, string];
  color: Color;
  size: number;
  camera: Vec3;
  look: Vec3;
  caption: Vec3;
  captionYaw: number;
  fov: number;
  slamFrame: number;
  z: number;
  captionY: number;
};

type StationBase = Omit<
  Station,
  "index" | "start" | "end" | "camera" | "look" | "caption" | "captionYaw" | "z" | "captionY"
> & { captionY?: number };

const Z = [0, -8, -16, -24, -32, -40, -48, -56] as const;
const CAMERA: Vec3[] = [
  [0, 2.65, 5.5],
  [2.75, 2.5, -3.9],
  [-2.85, 2.42, -11.9],
  [2.55, 2.62, -19.9],
  [-2.45, 2.72, -27.8],
  [2.85, 2.48, -35.9],
  [-2.25, 2.6, -42.6],
  [0, 2.92, -49.3],
];
const CAPTION_Y = 3.02;

const makeCaption = (z: number, camera: Vec3, y: number): Vec3 => [0, y, z - 1.45];
const makeYaw = (z: number, camera: Vec3): number =>
  Math.atan2(camera[0], camera[2] - (z - 1.45));

const base: StationBase[] = [
  {
    id: "hook" as const,
    refStart: 0,
    refEnd: 90,
    label: "001 / 005",
    lines: ["3 HOURS.", "ONE BUG."] as [string, string],
    color: COLORS.cyan,
    size: 0.56,
    fov: 54,
    captionY: 3.55,
    slamFrame: SLAM_FRAMES.hook,
  },
  {
    id: "errors" as const,
    refStart: 90,
    refEnd: 240,
    label: "MISTAKE 01",
    lines: ["READ THE", "ERROR."] as [string, string],
    color: COLORS.red,
    size: 0.52,
    fov: 48,
    slamFrame: SLAM_FRAMES.m1,
  },
  {
    id: "onechg" as const,
    refStart: 240,
    refEnd: 450,
    label: "MISTAKE 02",
    lines: ["CHANGE", "ONE THING."] as [string, string],
    color: COLORS.amber,
    size: 0.5,
    fov: 52,
    slamFrame: SLAM_FRAMES.m2,
  },
  {
    id: "copy" as const,
    refStart: 450,
    refEnd: 660,
    label: "MISTAKE 03",
    lines: ["DON'T JUST", "COPY."] as [string, string],
    color: COLORS.red,
    size: 0.52,
    fov: 50,
    slamFrame: SLAM_FRAMES.m3,
  },
  {
    id: "typo" as const,
    refStart: 660,
    refEnd: 870,
    label: "MISTAKE 04",
    lines: ["CHECK THE", "BASICS FIRST."] as [string, string],
    color: COLORS.cyan,
    size: 0.4,
    fov: 41,
    slamFrame: SLAM_FRAMES.m4,
  },
  {
    id: "help" as const,
    refStart: 870,
    refEnd: 1110,
    label: "MISTAKE 05",
    lines: ["ASK. SEARCH.", "LEARN."] as [string, string],
    color: COLORS.red,
    size: 0.44,
    fov: 50,
    slamFrame: SLAM_FRAMES.m5,
  },
  {
    id: "payoff" as const,
    refStart: 1110,
    refEnd: 1320,
    label: "THE TRUTH",
    lines: ["ERRORS = PART", "OF CODING"] as [string, string],
    color: COLORS.green,
    size: 0.38,
    fov: 54,
    slamFrame: SLAM_FRAMES.payoff,
  },
  {
    id: "end" as const,
    refStart: 1320,
    refEnd: 1410,
    label: "WELCOME",
    lines: ["WELCOME TO", "CODING."] as [string, string],
    color: COLORS.green,
    size: 0.52,
    fov: 58,
    slamFrame: SLAM_FRAMES.end,
  },
];

export const STATIONS: Station[] = base.map((station, index) => {
  const z = Z[index];
  const captionY = station.captionY ?? CAPTION_Y;
  return {
    ...station,
    index,
    start: rf(station.refStart),
    end: rf(station.refEnd),
    z,
    captionY,
    camera: CAMERA[index],
    look: [0, 2.55, z - 1.0],
    caption: makeCaption(z, CAMERA[index], captionY),
    captionYaw: makeYaw(z, CAMERA[index]),
  };
});

export const STATION_COUNT = STATIONS.length;

export const stationAt = (frame: number): number => {
  for (let i = STATIONS.length - 1; i >= 0; i -= 1) {
    if (frame >= STATIONS[i].start) {
      return i;
    }
  }
  return 0;
};

export const stationForFrame = (frame: number): Station => STATIONS[stationAt(frame)];

/**
 * Progress 0..1 through the camera path. Each station holds, then travels
 * through the last 35% of its window toward the next station.
 */
export const TRAVEL_RATIO = 0.35;

export const cameraPathU = (frame: number): number => {
  const index = stationAt(frame);
  if (index >= STATION_COUNT - 1) {
    return 1;
  }
  const station = STATIONS[index];
  const travelFrames = (station.end - station.start) * TRAVEL_RATIO;
  const travelStart = station.end - travelFrames;
  const t = smoothstep(inverseLerp(travelStart, station.end, frame));
  return (index + t) / (STATION_COUNT - 1);
};

/** FOV of the station the camera is leaving plus the one it is entering. */
export const fovBlendAt = (frame: number): number => {
  const index = stationAt(frame);
  if (index >= STATION_COUNT - 1) {
    return STATIONS[STATION_COUNT - 1].fov;
  }
  const station = STATIONS[index];
  const travelFrames = (station.end - station.start) * TRAVEL_RATIO;
  const travelStart = station.end - travelFrames;
  const t = smoothstep(inverseLerp(travelStart, station.end, frame));
  return station.fov + (STATIONS[index + 1].fov - station.fov) * t;
};

/** How far CameraRig pulls the lens toward 40 mm on a slam (0..1 * 0.7). */
export const PUNCH_STRENGTH = 0.7;
export const PUNCH_FOV = 40;

/**
 * Narrowest FOV the caption ever sees: the station blend plus the worst-case
 * punch-in, sampled across the caption's visible life. Captions are fitted to
 * this, so a 60 -> 40 punch can never clip them.
 */
export const captionFov = (station: Station): number => {
  const start = station.slamFrame;
  const end = Math.max(start, station.end);
  let narrowest = station.fov;
  for (let frame = start; frame <= end; frame += 4) {
    const base = fovBlendAt(frame);
    const punched = base + (PUNCH_FOV - base) * PUNCH_STRENGTH;
    narrowest = Math.min(narrowest, base, punched);
  }
  return Math.max(20, narrowest);
};

/** Absolute frame at which a station's caption lands. */
export const slamFrameOf = (station: Station): number => station.slamFrame;

/** 0..1 progress inside a station's own window. */
export const stationLocal = (frame: number, station: Station): number =>
  inverseLerp(station.start, station.end, frame);
