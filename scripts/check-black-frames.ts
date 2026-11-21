/**
 * Dev check: scan rendered frames (PNGs) for near-black output.
 *
 *   npm run check:black -- out/stills
 *   npm run check:black -- out/frames --threshold=4
 *
 * A NaN that reaches bloom, DOF, chromatic aberration or the camera renders as
 * a black frame; this finds those frames by mean luminance instead of by eye.
 * PNG only, no dependencies: zlib inflate + the five PNG row filters.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";

const args = process.argv.slice(2);
const target = args.find((arg) => !arg.startsWith("--")) ?? "out/stills";
const thresholdArg = args.find((arg) => arg.startsWith("--threshold="));
const THRESHOLD = thresholdArg
  ? Number(thresholdArg.split("=")[1])
  : 4;

type Frame = { file: string; frame: number; luminance: number };

const frameNumber = (file: string): number => {
  const match = file.match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : Number.NaN;
};

const paeth = (a: number, b: number, c: number): number => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) {
    return a;
  }
  return pb <= pc ? b : c;
};

const meanLuminance = (buffer: Buffer): number => {
  if (buffer.readUInt32BE(0) !== 0x89504e47) {
    throw new Error("not a PNG");
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat: Buffer[] = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }

  if (bitDepth !== 8 || interlace !== 0 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(
      `unsupported PNG (bitDepth=${bitDepth}, colorType=${colorType}, interlace=${interlace})`,
    );
  }

  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const previous = new Uint8Array(stride);
  const current = new Uint8Array(stride);
  let total = 0;
  let cursor = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor];
    cursor += 1;
    for (let x = 0; x < stride; x += 1) {
      const value = raw[cursor + x];
      const left = x >= channels ? current[x - channels] : 0;
      const up = previous[x];
      const upLeft = x >= channels ? previous[x - channels] : 0;
      let out = value;
      if (filter === 1) {
        out = value + left;
      } else if (filter === 2) {
        out = value + up;
      } else if (filter === 3) {
        out = value + ((left + up) >> 1);
      } else if (filter === 4) {
        out = value + paeth(left, up, upLeft);
      }
      current[x] = out & 0xff;
    }
    cursor += stride;
    for (let x = 0; x < stride; x += channels) {
      total +=
        0.2126 * current[x] + 0.7152 * current[x + 1] + 0.0722 * current[x + 2];
    }
    previous.set(current);
  }

  return total / (width * height);
};

const collect = (path: string): string[] => {
  if (!existsSync(path)) {
    return [];
  }
  if (statSync(path).isDirectory()) {
    return readdirSync(path)
      .filter((entry) => entry.toLowerCase().endsWith(".png"))
      .map((entry) => join(path, entry));
  }
  return [path];
};

const main = (): void => {
  const files = collect(target);
  if (files.length === 0) {
    console.log(`[black-frames] No PNG frames in ${target}. Render stills first.`);
    return;
  }

  const frames: Frame[] = files.map((file) => ({
    file,
    frame: frameNumber(file),
    luminance: meanLuminance(readFileSync(file)),
  }));

  frames.sort((a, b) => a.frame - b.frame);

  const dark = frames.filter((value) => value.luminance < THRESHOLD);
  console.log(
    `[black-frames] scanned ${frames.length} frame(s) in ${target} ` +
      `(mean luminance < ${THRESHOLD})`,
  );

  if (dark.length === 0) {
    console.log("[black-frames] OK: no near-black frames.\n");
    return;
  }

  console.error("[black-frames] FAIL: near-black frames detected:");
  for (const value of dark) {
    console.error(
      `  frame ${value.frame.toString().padStart(5)}  ` +
        `mean luminance ${value.luminance.toFixed(2)}  ${value.file}`,
    );
  }
  console.error(
    "\n[black-frames] Check impact/error values, DOF focus distance and glitch strength.\n",
  );
  process.exit(1);
};

main();
