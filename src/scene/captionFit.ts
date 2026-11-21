/**
 * Caption fitting.
 *
 * Text3D geometry is sized in world units, so its on-screen width depends on
 * how far the caption sits from the camera and on the lens. These helpers turn
 * the typeface metrics into a scale factor that keeps every caption inside a
 * safe box: 85% of the visible width at the caption's own depth (measured with
 * the narrowest lens the scene can use) and never past a 60px margin on a
 * 1080px frame.
 */
import { VIDEO } from "../config";
import type { Station, Vec3 } from "./timeline";

export type Typeface = {
  glyphs: Record<string, { ha: number }>;
  resolution?: number;
};

/** Safe area on each side of the 1080px frame. */
export const SAFE_MARGIN_PX = 60;
/** Share of the visible width a caption may occupy. */
export const MAX_WIDTH_RATIO = 0.85;
/** CameraRig punches the lens toward 40deg on every slam. */
export const NARROWEST_FOV = 40;

export const SLAM_DELAY_FRAMES = 10;
export const FADE_OUT_FRAMES = 8;

const ASPECT = VIDEO.width / VIDEO.height;
const PIXEL_LIMIT = Math.min(
  MAX_WIDTH_RATIO * VIDEO.width,
  VIDEO.width - 2 * SAFE_MARGIN_PX,
);

const length = (v: Vec3): number => Math.hypot(v[0], v[1], v[2]);

/** Width of one line in world units, from the typeface advances. */
export const measureLineWidth = (
  typeface: Typeface,
  text: string,
  size: number,
  letterSpacing: number,
): number => {
  const unitsPerEm = typeface.resolution ?? 1000;
  const scale = size / unitsPerEm;
  const fallback = typeface.glyphs["?"]?.ha ?? 0;
  let width = 0;
  let glyphs = 0;
  for (const char of text) {
    if (char === " ") {
      width += (fallback || 400) * scale;
    } else {
      width += (typeface.glyphs[char]?.ha ?? fallback) * scale;
    }
    width += letterSpacing * size;
    glyphs += 1;
  }
  if (glyphs > 1) {
    // TextGeometry adds the tracking after the last glyph too; drop one.
    width -= letterSpacing * size;
  }
  return Math.max(width, 0.0001);
};

export const measureTextWidth = (
  typeface: Typeface,
  lines: string[],
  size: number,
  letterSpacing: number,
): number =>
  Math.max(
    0.0001,
    ...lines.map((line) => measureLineWidth(typeface, line, size, letterSpacing)),
  );

/** Distance from the camera to the caption, along the camera's forward axis. */
export const cameraDepth = (camera: Vec3, look: Vec3, point: Vec3): number => {
  const forward: Vec3 = [look[0] - camera[0], look[1] - camera[1], look[2] - camera[2]];
  const forwardLength = length(forward) || 1;
  const offset: Vec3 = [
    point[0] - camera[0],
    point[1] - camera[1],
    point[2] - camera[2],
  ];
  const depth =
    (offset[0] * forward[0] + offset[1] * forward[1] + offset[2] * forward[2]) /
    forwardLength;
  return Math.max(0.5, depth);
};

/** Width of the frame in world units at a given depth and vertical fov. */
export const visibleWidthAt = (depth: number, fov: number): number =>
  2 * depth * Math.tan((fov * Math.PI) / 360) * ASPECT;

/** Narrowest lens the camera can use while a station's caption is on screen. */
export const narrowestFov = (station: Station, nextFov?: number): number =>
  Math.min(station.fov, nextFov ?? station.fov, NARROWEST_FOV);

export type FitResult = {
  scale: number;
  measuredWidth: number;
  fittedWidth: number;
  limitWidth: number;
  /** Fitted width as a share of the allowed width. */
  percent: number;
  fov: number;
  depth: number;
};

const fitAt = (
  typeface: Typeface,
  lines: string[],
  size: number,
  letterSpacing: number,
  depth: number,
  fov: number,
): FitResult => {
  const measuredWidth = measureTextWidth(typeface, lines, size, letterSpacing);
  const frameWidth = visibleWidthAt(depth, fov);
  const worldLimit = (PIXEL_LIMIT / VIDEO.width) * frameWidth;
  const scale = Math.min(1, worldLimit / measuredWidth);
  const fittedWidth = measuredWidth * scale;
  return {
    scale,
    measuredWidth,
    fittedWidth,
    limitWidth: worldLimit,
    percent: (fittedWidth / worldLimit) * 100,
    fov,
    depth,
  };
};

/** Fit a station's hero caption at its own position and camera. */
export const fitCaption = (
  typeface: Typeface,
  stations: Station[],
  station: Station,
  letterSpacing = 0.015,
): FitResult => {
  const fov = narrowestFov(station, stations[station.index + 1]?.fov);
  const depth = cameraDepth(station.camera, station.look, station.caption);
  return fitAt(typeface, station.lines.slice(0, 2), station.size, letterSpacing, depth, fov);
};

/**
 * Fit a prop label (error chips, numbered cards, ASK / SEARCH / LEARN) using
 * the camera of the station it belongs to.
 */
export const fitLabel = (
  typeface: Typeface,
  stations: Station[],
  position: Vec3,
  text: string,
  size: number,
  letterSpacing = 0.04,
): FitResult => {
  let nearest = stations[0];
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const station of stations) {
    const d = Math.hypot(
      position[0] - station.camera[0],
      position[1] - station.camera[1],
      position[2] - station.camera[2],
    );
    if (d < nearestDistance) {
      nearestDistance = d;
      nearest = station;
    }
  }
  const fov = narrowestFov(nearest);
  const depth = cameraDepth(nearest.camera, nearest.look, position);
  return fitAt(typeface, [text], size, letterSpacing, depth, fov);
};
