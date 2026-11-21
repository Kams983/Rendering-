import { clamp } from "../utils/math";

/**
 * 1080x1920 with 60 px side margins. 960 / 1080 = 0.8889, so 88% is the
 * stricter of the two limits and is what captions are fitted to.
 */
export const SAFE_WIDTH_RATIO = 0.88;
/** Two lines may not eat more than 60% of the frustum height. */
export const SAFE_HEIGHT_RATIO = 0.6;

export type Extent = { width: number; height: number };

/**
 * Visible frustum size at a given depth:
 *   height = 2 * dist * tan(fov / 2)
 *   width  = height * aspect
 */
export const visibleExtent = (
  dist: number,
  fovDeg: number,
  aspect: number,
): Extent => {
  const depth = Math.max(0.01, Number.isFinite(dist) ? dist : 0.01);
  const fov = clamp(Number.isFinite(fovDeg) ? fovDeg : 50, 1, 179);
  const height = 2 * depth * Math.tan((fov * Math.PI) / 360);
  return { width: height * aspect, height };
};

/** Largest scale <= 1 that keeps the measured box inside the safe area. */
export const fitScale = (
  box: { width: number; height: number },
  dist: number,
  fovDeg: number,
  aspect: number,
): number => {
  const extent = visibleExtent(dist, fovDeg, aspect);
  const boxWidth = box.width > 1e-4 ? box.width : 1e-4;
  const boxHeight = box.height > 1e-4 ? box.height : 1e-4;
  const byWidth = (extent.width * SAFE_WIDTH_RATIO) / boxWidth;
  const byHeight = (extent.height * SAFE_HEIGHT_RATIO) / boxHeight;
  return clamp(Math.min(1, byWidth, byHeight), 0.05, 1);
};

/**
 * Never more than two lines. If an author ever writes three, the words are
 * re-split into two lines of near-equal length instead of clipping.
 */
export const balanceLines = (lines: string[], maxLines = 2): string[] => {
  const cleaned = lines.map((line) => line.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return [""];
  }
  if (cleaned.length <= maxLines) {
    return cleaned;
  }
  const words = cleaned.join(" ").split(/\s+/).filter(Boolean);
  const target = words.join(" ").length / maxLines;
  const out: string[] = [];
  let current: string[] = [];
  let length = 0;
  for (const word of words) {
    const next = length + word.length + (current.length > 0 ? 1 : 0);
    if (
      current.length > 0 &&
      out.length < maxLines - 1 &&
      next > target * 1.08
    ) {
      out.push(current.join(" "));
      current = [word];
      length = word.length;
    } else {
      length = next;
      current.push(word);
    }
  }
  if (current.length > 0) {
    out.push(current.join(" "));
  }
  return out.slice(0, maxLines);
};
