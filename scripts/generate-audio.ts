/**
 * Offline audio synthesis for "5 Beginner Coding Mistakes".
 *
 *   npm run gen-audio
 *
 * Pure TypeScript. No libraries, no network. Every noise source is seeded with
 * mulberry32, so running this twice produces byte-identical WAV files.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SR = 44100;
const TAU = Math.PI * 2;
const SFX_DIR = join(process.cwd(), "public", "sfx");
const MUSIC_DIR = join(process.cwd(), "public");

type Rng = () => number;
type Wave = "sine" | "square" | "saw" | "tri";

const mulberry32 = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const buffer = (seconds: number): Float32Array =>
  new Float32Array(Math.max(1, Math.ceil(seconds * SR)));

const normalize = (
  data: Float32Array,
  peak = 0.9,
  fadeIn = 0.004,
  fadeOut = 0.03,
): Float32Array => {
  let max = 0;
  for (let i = 0; i < data.length; i += 1) {
    const value = Math.abs(data[i]);
    if (value > max) {
      max = value;
    }
  }
  const scale = max > 1e-6 ? peak / max : 1;
  const inSamples = Math.floor(fadeIn * SR);
  const outSamples = Math.floor(fadeOut * SR);
  for (let i = 0; i < data.length; i += 1) {
    let gain = scale;
    if (i < inSamples) {
      gain *= i / Math.max(1, inSamples);
    }
    if (i > data.length - outSamples) {
      gain *= (data.length - i) / Math.max(1, outSamples);
    }
    data[i] *= gain;
  }
  return data;
};

const mixInto = (
  target: Float32Array,
  source: Float32Array,
  startSeconds = 0,
  gain = 1,
): void => {
  const offset = Math.floor(startSeconds * SR);
  for (let i = 0; i < source.length; i += 1) {
    const index = offset + i;
    if (index >= 0 && index < target.length) {
      target[index] += source[i] * gain;
    }
  }
};

const osc = (type: Wave, phase: number): number => {
  const wrapped = phase % TAU;
  if (type === "sine") {
    return Math.sin(wrapped);
  }
  if (type === "square") {
    return wrapped < Math.PI ? 1 : -1;
  }
  if (type === "saw") {
    return (wrapped / Math.PI) - 1;
  }
  return 1 - 4 * Math.abs(wrapped / TAU - 0.5);
};

class Biquad {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;

  set(type: "lowpass" | "highpass" | "bandpass", frequency: number, q = 0.707): void {
    const freq = clamp(frequency, 20, SR * 0.45);
    const w0 = (TAU * freq) / SR;
    const cos = Math.cos(w0);
    const sin = Math.sin(w0);
    const alpha = sin / (2 * Math.max(0.0001, q));

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    if (type === "lowpass") {
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = (1 - cos) / 2;
    } else if (type === "highpass") {
      b0 = (1 + cos) / 2;
      b1 = -(1 + cos);
      b2 = (1 + cos) / 2;
    } else {
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
    }
    const a0 = 1 + alpha;
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  process(input: number): number {
    const output =
      this.b0 * input +
      this.b1 * this.x1 +
      this.b2 * this.x2 -
      this.a1 * this.y1 -
      this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = input;
    this.y2 = this.y1;
    this.y1 = output;
    return output;
  }
}

const renderTone = (
  seconds: number,
  type: Wave,
  frequency: (t: number) => number,
  envelope: (t: number) => number,
  gain = 1,
): Float32Array => {
  const out = buffer(seconds);
  let phase = 0;
  for (let i = 0; i < out.length; i += 1) {
    const t = i / SR;
    phase += (TAU * frequency(t)) / SR;
    out[i] = osc(type, phase) * envelope(t) * gain;
  }
  return out;
};

const renderNoise = (
  seconds: number,
  type: "lowpass" | "highpass" | "bandpass",
  from: number,
  to: number,
  q: number,
  envelope: (t: number) => number,
  seed: number,
): Float32Array => {
  const out = buffer(seconds);
  const filter = new Biquad();
  const random = mulberry32(seed);
  for (let i = 0; i < out.length; i += 1) {
    const t = i / SR;
    if (i % 32 === 0) {
      filter.set(type, lerp(from, to, t / seconds), q);
    }
    out[i] = filter.process(random() * 2 - 1) * envelope(t);
  }
  return out;
};

const expDecay = (t: number, tau: number): number => Math.exp(-t / Math.max(0.0001, tau));

/** Classic ADSR; used for sustained material and the music swell. */
const adsr = (
  t: number,
  duration: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
): number => {
  if (t < 0 || t > duration) {
    return 0;
  }
  if (t < attack) {
    return t / Math.max(0.0001, attack);
  }
  if (t < attack + decay) {
    return 1 - (1 - sustain) * ((t - attack) / Math.max(0.0001, decay));
  }
  if (t < duration - release) {
    return sustain;
  }
  return sustain * ((duration - t) / Math.max(0.0001, release));
};

/** Paul Kellet pink noise. Warmer than white for beds and air. */
const pinkNoise = (length: number, rng: Rng): Float32Array => {
  const out = new Float32Array(length);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  for (let i = 0; i < length; i += 1) {
    const white = rng() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return out;
};
const attack = (t: number, seconds = 0.004): number => clamp(t / seconds, 0, 1);
const sineEnv = (t: number, seconds: number): number =>
  Math.sin(Math.PI * clamp(t / seconds, 0, 1)) ** 2;

const tanhDrive = (data: Float32Array, drive: number): Float32Array => {
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.tanh(data[i] * drive);
  }
  return data;
};

const bitcrush = (data: Float32Array, hold: number, steps: number): Float32Array => {
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    if (i % hold === 0) {
      last = Math.round(data[i] * steps) / steps;
    }
    data[i] = last;
  }
  return data;
};

/** Small Schroeder-ish reverb: four feedback combs, mixed back in. */
const reverb = (input: Float32Array, mix = 0.24, feedback = 0.58): Float32Array => {
  const out = Float32Array.from(input);
  const delays = [0.0297, 0.0371, 0.0411, 0.0437];
  for (const delay of delays) {
    const length = Math.max(1, Math.floor(delay * SR));
    const line = new Float32Array(length);
    let index = 0;
    for (let i = 0; i < out.length; i += 1) {
      const delayed = line[index];
      line[index] = input[i] + delayed * feedback;
      out[i] += delayed * mix;
      index = (index + 1) % length;
    }
  }
  return out;
};

const loopSeam = (data: Float32Array, seconds = 0.28): Float32Array => {
  const count = Math.min(Math.floor(seconds * SR), Math.floor(data.length / 3));
  for (let i = 0; i < count; i += 1) {
    const t = i / count;
    data[i] = data[i] * t + data[data.length - count + i] * (1 - t);
  }
  return data.subarray(0, data.length - count);
};

/* ------------------------------------------------------------------ one-shots */

const click = (
  duration: number,
  seed: number,
  options: { thump: number; bright: number; gain: number },
): Float32Array => {
  const out = buffer(duration);
  const noise = renderNoise(
    duration,
    "bandpass",
    options.bright,
    options.bright * 1.4,
    1.1,
    (t) => expDecay(t, 0.0022) * attack(t, 0.0004),
    seed,
  );
  const thump = renderTone(
    duration,
    "sine",
    (t) => options.thump * (1 - 0.2 * t),
    (t) => expDecay(t, 0.024) * attack(t, 0.001),
  );
  for (let i = 0; i < out.length; i += 1) {
    out[i] = (noise[i] * 0.8 + thump[i] * 0.65) * options.gain;
  }
  return out;
};

const keyboardBurst = (): Float32Array => {
  const seconds = 0.7;
  const out = buffer(seconds);
  const random = mulberry32(7001);
  for (let i = 0; i < 7; i += 1) {
    const at = i * 0.082 + random() * 0.025;
    const tone = 150 + random() * 110;
    mixInto(out, click(0.09, 100 + i, { thump: tone, bright: 1900 + random() * 2200, gain: 0.8 }), at, 0.75);
  }
  return normalize(out, 0.88, 0.002, 0.05);
};

const rapidTyping = (): Float32Array => {
  const seconds = 3.0;
  const out = buffer(seconds);
  const random = mulberry32(7002);
  let at = 0.02;
  let index = 0;
  while (at < seconds - 0.1) {
    const tone = 160 + random() * 100;
    mixInto(out, click(0.07, 500 + index, { thump: tone, bright: 2200 + random() * 2600, gain: 0.7 }), at, 0.7);
    at += 0.042 + random() * 0.06;
    index += 1;
  }
  return normalize(out, 0.55, 0.01, 0.08);
};

const errorBeep = (seconds = 0.22): Float32Array => {
  const out = renderTone(
    seconds,
    "square",
    () => 880,
    (t) => {
      const first = t >= 0 && t < 0.08 ? 1 : 0;
      const second = t >= 0.12 && t < 0.2 ? 1 : 0;
      const edge = Math.min(1, attack(t, 0.003));
      return Math.max(first, second) * edge * (1 - clamp((t - 0.2) / 0.02, 0, 1));
    },
  );
  return normalize(tanhDrive(out, 2.4), 0.85, 0.001, 0.01);
};

const bassHit = (): Float32Array => {
  const seconds = 0.9;
  const out = buffer(seconds);
  const body = renderTone(
    seconds,
    "sine",
    (t) => 35 + 85 * Math.exp(-t * 9),
    (t) => attack(t, 0.004) * expDecay(t, 0.26),
  );
  const transient = renderNoise(
    seconds,
    "highpass",
    500,
    1800,
    0.8,
    (t) => expDecay(t, 0.006),
    11,
  );
  for (let i = 0; i < out.length; i += 1) {
    out[i] = body[i] * 0.9 + transient[i] * 0.22;
  }
  return normalize(reverb(out, 0.18), 0.92, 0.002, 0.08);
};

const bassDrop = (): Float32Array => {
  const seconds = 2.2;
  const out = buffer(seconds);
  const body = renderTone(
    seconds,
    "sine",
    (t) => 25 + 65 * Math.exp(-t * 2.1),
    (t) => attack(t, 0.006) * expDecay(t, 1.15),
  );
  const rumble = renderNoise(
    seconds,
    "lowpass",
    220,
    60,
    0.9,
    (t) => expDecay(t, 0.6) * 0.25,
    12,
  );
  for (let i = 0; i < out.length; i += 1) {
    out[i] = body[i] + rumble[i];
  }
  return normalize(reverb(out, 0.3), 0.92, 0.003, 0.2);
};

const errorBoom = (): Float32Array => {
  const out = buffer(1.4);
  const beep = errorBeep(0.24);
  mixInto(out, beep, 0, 0.7);
  const sub = renderTone(
    1.2,
    "sine",
    (t) => 30 + 50 * Math.exp(-t * 4),
    (t) => attack(t, 0.004) * expDecay(t, 0.4),
  );
  mixInto(out, sub, 0.01, 0.95);
  const crunch = renderNoise(
    0.6,
    "lowpass",
    1800,
    220,
    0.8,
    (t) => expDecay(t, 0.09),
    13,
  );
  mixInto(out, crunch, 0, 0.3);
  return normalize(reverb(out, 0.26), 0.92, 0.002, 0.1);
};

const recordScratch = (): Float32Array => {
  const seconds = 0.55;
  const out = buffer(seconds);
  const filter = new Biquad();
  const random = mulberry32(14);
  for (let i = 0; i < out.length; i += 1) {
    const t = i / SR;
    const wobble = Math.sin(t * 42) * 900 + Math.sin(t * 17) * 600;
    if (i % 16 === 0) {
      filter.set("bandpass", 900 + wobble + (t / seconds) * 1600, 2.2);
    }
    const envelope = Math.min(1, attack(t, 0.004)) * (t < seconds - 0.03 ? 1 : 0);
    out[i] = filter.process(random() * 2 - 1) * envelope * 0.9;
  }
  return normalize(out, 0.85, 0.001, 0.004);
};

const textSlam = (): Float32Array => {
  const seconds = 0.6;
  const out = buffer(seconds);
  const noise = renderNoise(
    seconds,
    "lowpass",
    2000,
    200,
    0.9,
    (t) => expDecay(t, 0.085) * attack(t, 0.0015),
    15,
  );
  const thump = renderTone(
    seconds,
    "sine",
    () => 60,
    (t) => expDecay(t, 0.16) * attack(t, 0.002),
  );
  const ring = buffer(seconds);
  for (const frequency of [410, 873, 1290]) {
    const partial = renderTone(
      seconds,
      "sine",
      () => frequency,
      (t) => expDecay(t, 0.26) * attack(t, 0.001),
    );
    mixInto(ring, partial, 0, 0.25);
  }
  for (let i = 0; i < out.length; i += 1) {
    out[i] = noise[i] * 0.55 + thump[i] * 0.9 + ring[i];
  }
  return normalize(reverb(out, 0.18), 0.92, 0.001, 0.08);
};

const glitchStutter = (): Float32Array => {
  const seconds = 0.6;
  const out = buffer(seconds);
  const random = mulberry32(16);
  let at = 0;
  while (at < seconds - 0.02) {
    const slice = 0.02 + random() * 0.02;
    const frequency = 260 + random() * 1100;
    const tone = renderTone(
      slice,
      random() > 0.5 ? "square" : "saw",
      () => frequency,
      (t) => (1 - t / slice) * 0.8,
    );
    bitcrush(tone, 5, 9);
    mixInto(out, tone, at, 0.8);
    at += slice + 0.006 + random() * 0.012;
  }
  return normalize(tanhDrive(out, 1.8), 0.85, 0.001, 0.01);
};

const glassCrack = (): Float32Array => {
  const seconds = 0.9;
  const out = buffer(seconds);
  const random = mulberry32(17);
  let at = 0;
  let index = 0;
  while (at < seconds - 0.05) {
    const decays = Math.exp(-at * 2.4);
    const shard = renderNoise(
      0.09,
      "highpass",
      2600 + random() * 4200,
      3000 + random() * 5000,
      1.4,
      (t) => expDecay(t, 0.012 + random() * 0.02) * attack(t, 0.0004),
      300 + index,
    );
    mixInto(out, shard, at, 0.5 + decays * 0.5);
    const sparkle = renderTone(
      0.18,
      "sine",
      () => 3000 + random() * 5200,
      (t) => expDecay(t, 0.035) * attack(t, 0.0008),
    );
    mixInto(out, sparkle, at, 0.22 * (0.4 + decays));
    at += 0.006 + random() * 0.032 + at * 0.06;
    index += 1;
  }
  return normalize(reverb(out, 0.22), 0.9, 0.001, 0.12);
};

const whoosh = (seconds: number, seed: number, strength = 1): Float32Array => {
  const out = buffer(seconds);
  const noise = renderNoise(
    seconds,
    "bandpass",
    280,
    4200,
    0.85,
    (t) => sineEnv(t, seconds),
    seed,
  );
  for (let i = 0; i < out.length; i += 1) {
    out[i] = noise[i] * strength;
  }
  return normalize(out, 0.8, 0.02, seconds * 0.4);
};

const ding = (
  seconds: number,
  notes: number[],
  stagger: number,
  decay: number,
  seed: number,
): Float32Array => {
  const out = buffer(seconds);
  const random = mulberry32(seed);
  notes.forEach((frequency, index) => {
    const partial = renderTone(
      seconds,
      "sine",
      () => frequency * (1 + (random() - 0.5) * 0.0015),
      (t) => attack(t, 0.003) * expDecay(t, decay),
    );
    mixInto(out, partial, index * stagger, 0.75 / (1 + index * 0.25));
    const overtone = renderTone(
      seconds,
      "sine",
      () => frequency * 2,
      (t) => attack(t, 0.002) * expDecay(t, decay * 0.5),
    );
    mixInto(out, overtone, index * stagger, 0.12);
  });
  return normalize(reverb(out, 0.3), 0.85, 0.002, 0.2);
};

const pop = (): Float32Array => {
  const out = renderTone(
    0.3,
    "sine",
    (t) => 150 + 450 * Math.exp(-t * 25),
    (t) => attack(t, 0.001) * expDecay(t, 0.05),
  );
  return normalize(out, 0.8, 0.001, 0.05);
};

const thud = (seconds: number, low: number, bright: number, seed: number): Float32Array => {
  const out = buffer(seconds);
  const noise = renderNoise(
    seconds,
    "lowpass",
    bright,
    bright * 0.25,
    0.8,
    (t) => expDecay(t, 0.02) * attack(t, 0.0008),
    seed,
  );
  const body = renderTone(
    seconds,
    "sine",
    (t) => low * (1 - 0.15 * t),
    (t) => expDecay(t, 0.09) * attack(t, 0.0015),
  );
  for (let i = 0; i < out.length; i += 1) {
    out[i] = noise[i] * 0.55 + body[i] * 0.9;
  }
  return normalize(out, 0.85, 0.001, 0.06);
};

const mouseClick = (): Float32Array => thud(0.18, 180, 4200, 21);

const pasteThud = (): Float32Array => thud(0.45, 90, 900, 22);

const keyboardSlam = (): Float32Array => {
  const seconds = 0.9;
  const out = buffer(seconds);
  const body = renderTone(
    seconds,
    "sine",
    (t) => 68 * (1 - 0.1 * t),
    (t) => attack(t, 0.002) * expDecay(t, 0.28),
  );
  mixInto(out, body, 0, 1);
  const noise = renderNoise(
    0.35,
    "lowpass",
    1600,
    220,
    0.8,
    (t) => expDecay(t, 0.06),
    23,
  );
  mixInto(out, noise, 0, 0.5);
  const ring = renderTone(
    0.7,
    "sine",
    () => 520,
    (t) => expDecay(t, 0.22) * attack(t, 0.001),
  );
  mixInto(out, ring, 0.02, 0.14);
  return normalize(reverb(out, 0.28), 0.95, 0.001, 0.12);
};

const clockTicks = (seconds: number, accelerate: boolean): Float32Array => {
  const out = buffer(seconds);
  const random = mulberry32(accelerate ? 24 : 25);
  let at = 0;
  let index = 0;
  while (at < seconds - 0.02) {
    const progress = at / seconds;
    const rate = accelerate ? lerp(4, 25, progress) : 20;
    const tick = buffer(0.03);
    const noise = renderNoise(
      0.03,
      "highpass",
      2800,
      5000,
      1,
      (t) => expDecay(t, 0.003),
      400 + index,
    );
    const tone = renderTone(
      0.03,
      "sine",
      () => (accelerate ? 2300 : 3200) + random() * 220,
      (t) => expDecay(t, 0.006),
    );
    for (let i = 0; i < tick.length; i += 1) {
      tick[i] = noise[i] * 0.5 + tone[i] * 0.55;
    }
    mixInto(out, tick, at, 0.8);
    at += 1 / rate;
    index += 1;
  }
  return normalize(out, 0.75, 0.002, 0.04);
};

const searchType = (): Float32Array => {
  const seconds = 1.0;
  const out = buffer(seconds);
  const random = mulberry32(26);
  for (let index = 0; index < 14; index += 1) {
    const at = index * 0.065 + random() * 0.015;
    const soft = click(0.05, 700 + index, {
      thump: 420 + random() * 120,
      bright: 3200 + random() * 1800,
      gain: 0.5,
    });
    mixInto(out, soft, at, 0.45);
  }
  return normalize(out, 0.55, 0.004, 0.06);
};

const scanSweep = (): Float32Array => {
  const seconds = 1.4;
  const out = buffer(seconds);
  const sine = renderTone(
    seconds,
    "sine",
    (t) => 200 + 1800 * (t / seconds),
    (t) => sineEnv(t, seconds) * 0.4,
  );
  mixInto(out, sine, 0, 0.65);
  const noise = renderNoise(
    seconds,
    "bandpass",
    380,
    3200,
    1.1,
    (t) => sineEnv(t, seconds) * 0.6,
    27,
  );
  mixInto(out, noise, 0, 0.55);
  return normalize(out, 0.8, 0.02, 0.1);
};

const errorFlood = (): Float32Array => {
  const seconds = 3.2;
  const out = buffer(seconds);
  const random = mulberry32(28);
  for (let index = 0; index < 20; index += 1) {
    const at = (index / 20) * (seconds - 0.35);
    const pitch = 520 + index * 42;
    const beep = renderTone(
      0.12,
      "square",
      () => pitch,
      (t) => (t < 0.09 ? 1 : 1 - (t - 0.09) / 0.03),
    );
    bitcrush(beep, 3, 16);
    mixInto(out, beep, at, 0.18 + index * 0.012);
    if (random() > 0.6) {
      const crunch = renderNoise(
        0.08,
        "bandpass",
        800,
        2400,
        0.9,
        (t) => expDecay(t, 0.02),
        900 + index,
      );
      mixInto(out, crunch, at, 0.12);
    }
  }
  return normalize(reverb(out, 0.24), 0.85, 0.02, 0.12);
};

const checkmarkBurst = (): Float32Array => {
  const seconds = 1.4;
  const out = buffer(seconds);
  const shimmer = renderTone(
    seconds,
    "sine",
    (t) => 2000 + 4200 * Math.min(1, t / 0.55),
    (t) => attack(t, 0.02) * expDecay(t, 0.45),
  );
  mixInto(out, shimmer, 0, 0.35);
  for (let index = 0; index < 5; index += 1) {
    const tone = renderTone(
      0.45,
      "sine",
      () => 1800 + index * 720,
      (t) => attack(t, 0.003) * expDecay(t, 0.14),
    );
    mixInto(out, tone, index * 0.055, 0.16);
  }
  mixInto(out, pop(), 0.02, 0.5);
  return normalize(reverb(out, 0.32), 0.85, 0.002, 0.2);
};

/* --------------------------------------------------------------------- beds */

const ambientHum = (): Float32Array => {
  const seconds = 12;
  const out = buffer(seconds);

  const drone = renderTone(
    seconds,
    "sine",
    () => 55,
    () => 1,
  );
  mixInto(out, drone, 0, 0.32);
  mixInto(
    out,
    renderTone(seconds, "sine", () => 82.5, () => 1),
    0,
    0.18,
  );
  mixInto(
    out,
    renderTone(seconds, "sine", () => 100, () => 1),
    0,
    0.07,
  );
  const filtered = renderNoise(seconds, "lowpass", 800, 300, 0.7, () => 0.6, 31);
  mixInto(out, filtered, 0, 0.22);
  const pink = pinkNoise(out.length, mulberry32(311));
  const pinkFilter = new Biquad();
  pinkFilter.set("lowpass", 520, 0.8);
  for (let i = 0; i < out.length; i += 1) {
    out[i] += pinkFilter.process(pink[i]) * 0.16;
  }
  // Server-room shimmer.
  const shimmer = renderTone(
    seconds,
    "sine",
    () => 1200,
    (t) => 0.04 + 0.02 * Math.sin(t * 0.8),
  );
  mixInto(out, shimmer, 0, 0.08);

  return normalize(loopSeam(out, 0.3), 0.6, 0, 0);
};

const riser = (): Float32Array => {
  const seconds = 2.4;
  const out = buffer(seconds);
  const noise = renderNoise(
    seconds,
    "bandpass",
    300,
    6000,
    1.1,
    (t) => Math.pow(t / seconds, 1.8),
    32,
  );
  mixInto(out, noise, 0, 0.9);
  const sweep = renderTone(
    seconds,
    "sine",
    (t) => 110 + 900 * Math.pow(t / seconds, 2),
    (t) => Math.pow(t / seconds, 2) * 0.4,
  );
  mixInto(out, sweep, 0, 0.6);
  return normalize(reverb(out, 0.22), 0.75, 0.02, 0.25);
};

const lowpassSweep = (): Float32Array => {
  const seconds = 3.2;
  const out = buffer(seconds);
  const source = renderNoise(seconds, "lowpass", 260, 3200, 0.9, () => 1, 33);
  const filter = new Biquad();
  for (let i = 0; i < out.length; i += 1) {
    const t = i / SR;
    if (i % 32 === 0) {
      const open = t < seconds / 2 ? t / (seconds / 2) : 1 - (t - seconds / 2) / (seconds / 2);
      filter.set("lowpass", 220 + 3000 * open, 1.2);
    }
    out[i] = filter.process(source[i]) * sineEnv(t, seconds);
  }
  return normalize(out, 0.7, 0.03, 0.2);
};

const music = (): Float32Array => {
  // 50 seconds: whole number of cycles for every oscillator and LFO, so the
  // loop is seamless. 55 * 50 = 2750 cycles, 82.5 * 50 = 4125, LFO 0.2 * 50 = 10.
  const seconds = 50;
  const out = buffer(seconds);
  const lfo = (t: number): number => 0.55 + 0.45 * Math.sin(TAU * 0.2 * t);

  for (const frequency of [55, 55.35, 82.5, 82.9]) {
    const saw = renderTone(
      seconds,
      "saw",
      () => frequency,
      (t) => lfo(t) * 0.2,
    );
    mixInto(out, saw, 0, 0.38);
  }

  const hum = renderTone(seconds, "sine", () => 100, () => 1);
  mixInto(out, hum, 0, 0.05);

  const air = renderNoise(seconds, "lowpass", 1400, 400, 0.7, () => 1, 41);
  mixInto(out, air, 0, 0.1);
  const pink = pinkNoise(out.length, mulberry32(411));
  mixInto(out, pink, 0, 0.09);

  // Slow filtered bed; the lowpass is static so it stays deterministic.
  const filter = new Biquad();
  filter.set("lowpass", 400, 0.9);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = filter.process(out[i]);
  }

  return normalize(out, 0.75, 0, 0);
};

/* --------------------------------------------------------------------- wav */

const encodeWav = (samples: Float32Array): Buffer => {
  const dataSize = samples.length * 2;
  const out = Buffer.alloc(44 + dataSize);
  out.write("RIFF", 0);
  out.writeUInt32LE(36 + dataSize, 4);
  out.write("WAVE", 8);
  out.write("fmt ", 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(SR, 24);
  out.writeUInt32LE(SR * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i += 1) {
    const value = clamp(samples[i], -1, 1);
    out.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
  }
  return out;
};

const write = (directory: string, name: string, samples: Float32Array): void => {
  mkdirSync(directory, { recursive: true });
  const path = join(directory, name);
  writeFileSync(path, encodeWav(samples));
  const seconds = samples.length / SR;
  console.log(
    `  ${name.padEnd(26)} ${seconds.toFixed(2).padStart(6)}s  ${(samples.length * 2 / 1024).toFixed(0)} KiB`,
  );
};

const main = (): void => {
  console.log("\nSynthesising SFX and music (deterministic, 16-bit 44.1 kHz mono)\n");

  write(SFX_DIR, "keyboard-burst.wav", keyboardBurst());
  write(SFX_DIR, "rapid-typing.wav", rapidTyping());
  write(SFX_DIR, "error-beep.wav", errorBeep());
  write(SFX_DIR, "error-boom.wav", errorBoom());
  write(SFX_DIR, "bass-hit.wav", bassHit());
  write(SFX_DIR, "bass-drop.wav", bassDrop());
  write(SFX_DIR, "record-scratch.wav", recordScratch());
  write(SFX_DIR, "text-slam.wav", textSlam());
  write(SFX_DIR, "glitch-stutter.wav", glitchStutter());
  write(SFX_DIR, "glass-crack.wav", glassCrack());
  write(SFX_DIR, "whoosh-zoom.wav", whoosh(0.8, 34, 1));
  write(SFX_DIR, "run-whoosh.wav", whoosh(0.8, 35, 0.9));
  write(SFX_DIR, "ui-whoosh.wav", whoosh(0.6, 36, 0.7));
  write(SFX_DIR, "reveal-ding.wav", ding(1.4, [1046.5, 1318.5, 1568], 0.032, 0.42, 37));
  write(SFX_DIR, "success-chime.wav", ding(1.8, [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568], 0.06, 0.55, 38));
  write(SFX_DIR, "notification-chime.wav", ding(1.5, [1318.5, 1568], 0.11, 0.34, 39));
  write(SFX_DIR, "pop.wav", pop());
  write(SFX_DIR, "clock-tick-spin.wav", clockTicks(4.4, true));
  write(SFX_DIR, "timer-tick-roll.wav", clockTicks(1.2, false));
  write(SFX_DIR, "paste-thud.wav", pasteThud());
  write(SFX_DIR, "mouse-click.wav", mouseClick());
  write(SFX_DIR, "search-type.wav", searchType());
  write(SFX_DIR, "scan-sweep.wav", scanSweep());
  write(SFX_DIR, "error-flood.wav", errorFlood());
  write(SFX_DIR, "keyboard-slam.wav", keyboardSlam());
  write(SFX_DIR, "checkmark-burst.wav", checkmarkBurst());
  write(SFX_DIR, "ambient-hum.wav", ambientHum());
  write(SFX_DIR, "riser.wav", riser());
  write(SFX_DIR, "lowpass-sweep.wav", lowpassSweep());
  write(MUSIC_DIR, "music.wav", music());

  console.log("\nDone. Voice-over clips are read from public/voice at render time.\n");
};

main();
