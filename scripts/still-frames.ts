/**
 * Prints the verification table and the frame list for a still pass.
 *
 *   node scripts/still-frames.ts
 *   -> out/stills/frames.txt
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FPS } from "../src/config.ts";
import { SCENE_SCRIPT, sceneStartFrame } from "../src/voice/script.ts";
import { TIMING_ORDER } from "../src/voice/timing.ts";

const OUT = join(process.cwd(), "out", "stills");
const seconds = (frame: number): string => (frame / FPS).toFixed(2);
const padding = (value: string, width: number): string =>
  value.length >= width ? value : `${value}${" ".repeat(width - value.length)}`;

mkdirSync(OUT, { recursive: true });

const byId = new Map(TIMING_ORDER.map((clip) => [clip.id, clip]));
const rows = SCENE_SCRIPT.map((scene) => {
  const start = sceneStartFrame(scene, FPS);
  const timing = byId.get(scene.id);
  return {
    scene: scene.id,
    start: seconds(timing?.speechStartFrame ?? start),
    end: seconds(timing?.speechEndFrame ?? start),
    caption: timing?.slamFrame ?? start,
    keyword: timing ? `${timing.keywordFrame} (${timing.slamWord})` : "-",
  };
});

console.log(
  `${padding("scene", 9)}${padding("voice start", 13)}${padding("voice end", 12)}` +
    `${padding("caption slam", 15)}spoken keyword frame`,
);
for (const row of rows) {
  console.log(
    `${padding(row.scene, 9)}${padding(`${row.start}s`, 13)}${padding(`${row.end}s`, 12)}` +
      `${padding(String(row.caption), 15)}${row.keyword}`,
  );
}

const sceneStarts = SCENE_SCRIPT.map((scene) => sceneStartFrame(scene, FPS));
const slamFrames = TIMING_ORDER.map((clip) => clip.slamFrame);
const frames = Array.from(new Set([...sceneStarts, ...slamFrames])).sort(
  (a, b) => a - b,
);

console.log(
  `\n${frames.length} still(s): ${frames.join(", ")}\n` +
    `scene first frames: ${sceneStarts.join(", ")}\n` +
    `caption slams:     ${slamFrames.join(", ")}\n`,
);

writeFileSync(join(OUT, "frames.txt"), `${frames.join("\n")}\n`);
