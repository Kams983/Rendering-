/**
 * mulberry32. Deterministic, tiny, and identical in the browser bundle and in
 * the offline audio synthesiser (which mirrors this implementation).
 */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const hashString = (value: string): number => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const seededRange = (
  random: () => number,
  min: number,
  max: number,
): number => min + (max - min) * random();

/** Stable pseudo-random value for an item, independent of render order. */
export const itemRandom = (seed: string, index: number, salt = 0): number => {
  const random = mulberry32(hashString(seed) + Math.imul(index + 1, 7919) + salt * 104729);
  return random();
};
