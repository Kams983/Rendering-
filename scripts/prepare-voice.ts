/**
 * Build-time voice timing.
 *
 *   npm run voice:prepare            # strict: fails on overlaps / bad anchors
 *   npm run voice:prepare:report     # same measurements, never fails
 *
 * For every clip in src/voice/script.ts:
 *   1. ffmpeg strips dead air (leading, inter-word and trailing) at -45 dB,
 *      leaving 0.12 s where a pause was and a 0.08 s tail so no word is cut.
 *   2. The trimmed speech is measured against its scene window (minus the
 *      minimum gap). Only when it still does not fit is atempo applied, at
 *      most 1.2x. Pitch is never changed.
 *   3. A clip that still does not fit may run up to 0.4 s into the next
 *      scene's lead-in; it is listed in the report instead of failing.
 *   4. The measured word timings pick the caption slam frame: the word inside
 *      the scene's anchor phrase, never before the voice reaches it.
 *   5. The transcript's word count is compared with the onsets detected in
 *      the audio; more than 2 words apart is flagged.
 *
 * Writes src/voice/voiceManifest.ts (deterministic, no timestamps).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FPS } from "../src/config.ts";
import {
  SCENE_SCRIPT,
  anchorWordIndex,
  buildWordTimings,
  sceneStartFrame,
  sceneWindowFrames,
  splitWords,
} from "../src/voice/script.ts";

const REPORT_ONLY = process.argv.includes("--allow-overflow");
const ROOT = process.cwd();
const VOICE_DIR = join(ROOT, "public", "voice");
const FIT_DIR = join(VOICE_DIR, "fit");
const MANIFEST = join(ROOT, "src", "voice", "voiceManifest.ts");
const MAX_TEMPO = 1.2;
/** A clip should leave this much air before the next scene. */
const CLEAR_SECONDS = 0.15;
/** How far a clip that will not fit may run into the next scene's lead-in. */
const OVERFLOW_SECONDS = 0.4;
/** Dead air is cut at this level, the same -45 dB as the trim filter. */
const TRIM_THRESHOLD = 10 ** (-45 / 20);
/** A pause must last this long before it is cut. */
const TRIM_MIN_PAUSE = 0.25;
/** Air left where a pause was, split across both edges of the cut. */
const TRIM_KEEP_PAUSE = 0.12;
/** Air left at the head and tail so no word is clipped. */
const TRIM_KEEP_TAIL = 0.08;

const isRunnable = (bin: string): boolean => {
  try {
    return spawnSync(bin, ["-version"], { encoding: "utf8" }).status === 0;
  } catch {
    return false;
  }
};

const findFfmpeg = (): string => {
  const override = process.env.FFMPEG_PATH;
  if (override) {
    return override;
  }
  // Linux (CI) has a full system ffmpeg. Remotion's per-platform bundled build
  // is not guaranteed to carry every filter, so only fall back to it.
  if (process.platform !== "win32" && isRunnable("ffmpeg")) {
    return "ffmpeg";
  }
  const remotion = join(ROOT, "node_modules", "@remotion");
  if (existsSync(remotion)) {
    for (const entry of readdirSync(remotion)) {
      if (!entry.startsWith("compositor-")) {
        continue;
      }
      for (const name of ["ffmpeg", "ffmpeg.exe"]) {
        const candidate = join(remotion, entry, name);
        if (existsSync(candidate)) {
          return candidate;
        }
      }
    }
  }
  const staticName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const staticPath = join(ROOT, "node_modules", "ffmpeg-static", staticName);
  if (existsSync(staticPath)) {
    return staticPath;
  }
  return "ffmpeg";
};

const FFMPEG = findFfmpeg();

const run = (args: string[]): { status: number; output: string } => {
  const result = spawnSync(FFMPEG, args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(
      `[voice] Cannot run ffmpeg (${FFMPEG}): ${result.error.message}. ` +
        `Set FFMPEG_PATH or install ffmpeg-static.`,
    );
  }
  return {
    status: result.status ?? 1,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  };
};

const probeSeconds = (file: string): number => {
  const { output } = run(["-hide_banner", "-i", file]);
  const match = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) {
    throw new Error(`[voice] Could not read the duration of ${file}.`);
  }
  return (
    Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
  );
};

type Silences = {
  lead: number;
  trail: number;
  longest: number;
  /** Every detected pause, in seconds from the start of the file. */
  spans: Array<{ start: number; end: number }>;
};

const detectSilence = (file: string, duration: number): Silences => {
  const { output } = run([
    "-hide_banner",
    "-nostats",
    "-i",
    file,
    "-af",
    "silencedetect=noise=-40dB:d=0.12",
    "-f",
    "null",
    "-",
  ]);
  const starts: number[] = [];
  const ends: number[] = [];
  for (const line of output.split(/\r?\n/)) {
    const start = line.match(/silence_start:\s*(-?\d+(?:\.\d+)?)/);
    if (start) {
      starts.push(Number(start[1]));
    }
    const end = line.match(/silence_end:\s*(-?\d+(?:\.\d+)?)/);
    if (end) {
      ends.push(Number(end[1]));
    }
  }
  let lead = 0;
  if (starts.length > 0 && starts[0] <= 0.05) {
    lead = ends.length > 0 ? Math.max(0, ends[0]) : 0;
  }
  let trail = 0;
  const lastIndex = starts.length - 1;
  if (lastIndex >= 0) {
    const lastStart = starts[lastIndex];
    const lastEnd = ends[lastIndex] ?? duration;
    if (lastEnd >= duration - 0.05) {
      trail = Math.max(0, duration - lastStart);
    }
  }
  let longest = 0;
  const spans: Array<{ start: number; end: number }> = [];
  for (let index = 0; index < starts.length; index += 1) {
    const end = Math.min(duration, ends[index] ?? duration);
    spans.push({ start: Math.max(0, starts[index]), end });
    longest = Math.max(longest, end - starts[index]);
  }
  return { lead, trail, longest, spans };
};

type Pcm = { samples: Int16Array; sampleRate: number };

const decodePcm = (file: string, outWav: string): Pcm | null => {
  const encoded = run([
    "-y",
    "-v",
    "error",
    "-i",
    file,
    "-ac",
    "1",
    "-ar",
    "44100",
    "-c:a",
    "pcm_s16le",
    outWav,
  ]);
  if (encoded.status !== 0) {
    return null;
  }
  const buffer = readFileSync(outWav);
  rmSync(outWav, { force: true });
  let offset = 12;
  let data: Buffer | null = null;
  let sampleRate = 44100;
  while (offset < buffer.length - 8) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === "fmt ") {
      sampleRate = buffer.readUInt32LE(offset + 12);
    }
    if (id === "data") {
      data = buffer.subarray(
        offset + 8,
        Math.min(offset + 8 + size, buffer.length),
      );
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (!data) {
    return null;
  }
  const samples = Math.floor(data.length / 2);
  const pcm = new Int16Array(samples);
  for (let index = 0; index < samples; index += 1) {
    pcm[index] = data.readInt16LE(index * 2);
  }
  return { samples: pcm, sampleRate };
};

const writePcm = (file: string, pcm: Pcm): void => {
  const bytes = pcm.samples.length * 2;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + bytes, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(pcm.sampleRate, 24);
  header.writeUInt32LE(pcm.sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(bytes, 40);
  const body = Buffer.alloc(bytes);
  for (let index = 0; index < pcm.samples.length; index += 1) {
    body.writeInt16LE(pcm.samples[index], index * 2);
  }
  writeFileSync(file, Buffer.concat([header, body]));
};

/**
 * Strip dead air the way the trim filter would: cut the leading silence, cut
 * every pause of 0.25 s or more, leave 0.12 s where the pause was, and keep an
 * 0.08 s tail. The bundled ffmpeg has no silenceremove filter, so the splice is
 * done here on samples it decodes.
 */
const trimClip = (sourcePath: string, outPath: string): void => {
  const pcm = decodePcm(sourcePath, join(FIT_DIR, "_decode.wav"));
  if (!pcm || pcm.samples.length === 0) {
    throw new Error(`[voice] Could not decode ${sourcePath}.`);
  }
  const { samples, sampleRate } = pcm;
  const hop = Math.round(sampleRate * 0.01);
  const loud: boolean[] = [];
  for (let start = 0; start < samples.length; start += hop) {
    let sum = 0;
    const end = Math.min(samples.length, start + hop);
    for (let index = start; index < end; index += 1) {
      const value = samples[index] / 32768;
      sum += value * value;
    }
    loud.push(Math.sqrt(sum / Math.max(1, end - start)) > TRIM_THRESHOLD);
  }

  const runs: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  while (cursor < loud.length) {
    if (loud[cursor]) {
      cursor += 1;
      continue;
    }
    let end = cursor;
    while (end < loud.length && !loud[end]) {
      end += 1;
    }
    runs.push({ start: cursor, end });
    cursor = end;
  }

  const minPause = Math.round(TRIM_MIN_PAUSE * sampleRate);
  const keepHalf = Math.round((TRIM_KEEP_PAUSE * sampleRate) / 2);
  const keepTail = Math.round(TRIM_KEEP_TAIL * sampleRate);
  const cuts: Array<{ start: number; end: number }> = [];
  for (let index = 0; index < runs.length; index += 1) {
    const start = runs[index].start * hop;
    const end = Math.min(samples.length, runs[index].end * hop);
    const isFirst = index === 0;
    const isLast = index === runs.length - 1;
    if (isFirst) {
      cuts.push({ start: 0, end: Math.max(0, end - keepHalf) });
      continue;
    }
    if (isLast) {
      cuts.push({ start: Math.min(samples.length, start + keepTail), end: samples.length });
      continue;
    }
    if (end - start < minPause) {
      continue;
    }
    cuts.push({ start: start + keepHalf, end: Math.max(start + keepHalf, end - keepHalf) });
  }

  const pieces: Int16Array[] = [];
  let at = 0;
  for (const cut of cuts) {
    if (cut.start > at) {
      pieces.push(samples.subarray(at, cut.start));
    }
    at = Math.max(at, cut.end);
  }
  if (at < samples.length) {
    pieces.push(samples.subarray(at));
  }
  const total = pieces.reduce((sum, piece) => sum + piece.length, 0);
  const joined = new Int16Array(total);
  let write = 0;
  for (const piece of pieces) {
    joined.set(piece, write);
    write += piece.length;
  }
  // 4 ms fade at every splice edge, so a cut never clicks.
  const ramp = Math.round(sampleRate * 0.004);
  for (const cut of cuts) {
    const edge = cut.start;
    for (let index = 0; index < ramp && edge + index < joined.length; index += 1) {
      joined[edge + index] = Math.round(joined[edge + index] * (index / ramp));
    }
  }
  writePcm(outPath, { samples: joined, sampleRate });
};

/**
 * Count speech onsets in the clip: the energy envelope's rising edges.
 *
 * This project has no speech recogniser, so the "detected word count" is an
 * onset count read off the waveform. It tracks the spoken word count well for
 * this narrator (within a word on the reference clips) but merges very fast
 * syllables, so it is a sanity check, not a transcript.
 */
const countOnsets = (file: string): number => {
  const wav = join(FIT_DIR, "_onset.wav");
  const encoded = run([
    "-y",
    "-v",
    "error",
    "-i",
    file,
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "pcm_s16le",
    wav,
  ]);
  if (encoded.status !== 0) {
    return 0;
  }
  const buffer = readFileSync(wav);
  rmSync(wav, { force: true });
  let offset = 12;
  let data: Buffer | null = null;
  while (offset < buffer.length - 8) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === "data") {
      data = buffer.subarray(offset + 8, Math.min(offset + 8 + size, buffer.length));
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (!data || data.length < 640) {
    return 0;
  }
  const samples = Math.floor(data.length / 2);
  const hop = 320; // 20 ms at 16 kHz
  const envelope: number[] = [];
  for (let start = 0; start + hop <= samples; start += hop) {
    let sum = 0;
    for (let k = 0; k < hop; k += 1) {
      const value = data.readInt16LE((start + k) * 2) / 32768;
      sum += value * value;
    }
    envelope.push(Math.sqrt(sum / hop));
  }
  const peak = envelope.reduce((max, value) => Math.max(max, value), 0);
  if (peak <= 0) {
    return 0;
  }
  const high = peak * 0.18;
  const low = high * 0.6;
  let onsets = 0;
  let above = false;
  let last = -99;
  for (let index = 0; index < envelope.length; index += 1) {
    const value = envelope[index];
    if (value > high && !above) {
      if (index - last > 6) {
        onsets += 1;
        last = index;
      }
      above = true;
    } else if (value < low) {
      above = false;
    }
  }
  return onsets;
};

type Prepared = {
  id: string;
  source: string;
  audio: string;
  sceneStartFrame: number;
  audioStartFrame: number;
  speechStartFrame: number;
  speechEndFrame: number;
  durationSeconds: number;
  leadSilenceSeconds: number;
  trailingSilenceSeconds: number;
  speechSeconds: number;
  windowFrames: number;
  windowSeconds: number;
  availableSeconds: number;
  tempo: number;
  fits: boolean;
  overSeconds: number;
  /** Runs past its window but is allowed to bleed into the next lead-in. */
  overflowAllowed: boolean;
  slamFrame: number;
  slamWord: string;
  slamWordIndex: number;
  /** The anchor phrase the caption lands on. */
  anchorPhrase: string;
  /** First frame the voice reaches the anchored word. */
  keywordFrame: number;
  /** slamFrame - keywordFrame. Must be 0..3, never negative. */
  slamDeltaFrames: number;
  transcriptWords: number;
  detectedWords: number;
  words: Array<{ word: string; startFrame: number; endFrame: number }>;
};

const round = (value: number, places = 3): number =>
  Number(value.toFixed(places));

const main = (): void => {
  mkdirSync(FIT_DIR, { recursive: true });
  console.log(`[voice] ffmpeg: ${FFMPEG}`);
  console.log(
    `[voice] fps: ${FPS}, max atempo: ${MAX_TEMPO.toFixed(2)}x, ` +
      `min gap: ${CLEAR_SECONDS.toFixed(2)}s, overflow allowance: ${OVERFLOW_SECONDS.toFixed(2)}s\n`,
  );

  const prepared: Prepared[] = [];
  const overflowed: string[] = [];
  const failures: string[] = [];
  const anchorErrors: string[] = [];
  const gapErrors: string[] = [];
  const transcriptWarnings: string[] = [];

  for (const scene of SCENE_SCRIPT) {
    const sourcePath = join(VOICE_DIR, scene.file);
    if (!existsSync(sourcePath)) {
      throw new Error(
        `[voice] Missing voice clip public/voice/${scene.file}. All eight VO clips must exist.`,
      );
    }

    const startFrame = sceneStartFrame(scene, FPS);
    const windowFrames = sceneWindowFrames(scene, FPS);
    const windowSeconds = windowFrames / FPS;
    const availableSeconds = Math.max(0.2, windowSeconds - CLEAR_SECONDS);

    // 1. Strip dead air from every clip, every run: the fit files are the
    //    source of truth for both the mix and the measurements.
    const trimName = `${scene.id}-trim.wav`;
    const trimPath = join(FIT_DIR, trimName);
    trimClip(sourcePath, trimPath);

    let audioPath = trimPath;
    let trimSeconds = probeSeconds(trimPath);
    let trimSilence = detectSilence(trimPath, trimSeconds);
    let speechSeconds = Math.max(
      0.05,
      trimSeconds - trimSilence.lead - trimSilence.trail,
    );

    // 2. Only if the trimmed clip still misses its window is it sped up.
    const ratio = speechSeconds / availableSeconds;
    const tempo = ratio > 1.0005 ? Math.min(MAX_TEMPO, ratio) : 1;
    if (tempo > 1.0005) {
      const fitName = `${scene.id}.wav`;
      const fitPath = join(FIT_DIR, fitName);
      const fitResult = run([
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        trimPath,
        "-filter:a",
        `atempo=${tempo.toFixed(4)}`,
        "-ac",
        "1",
        "-ar",
        "44100",
        "-c:a",
        "pcm_s16le",
        fitPath,
      ]);
      if (fitResult.status !== 0) {
        throw new Error(
          `[voice] ffmpeg atempo failed on ${scene.file}:\n${fitResult.output.trim()}`,
        );
      }
      audioPath = fitPath;
      trimSeconds = probeSeconds(fitPath);
      trimSilence = detectSilence(fitPath, trimSeconds);
      speechSeconds = Math.max(
        0.05,
        trimSeconds - trimSilence.lead - trimSilence.trail,
      );
    }

    const audioFile =
      audioPath === trimPath
        ? `voice/fit/${trimName}`
        : `voice/fit/${scene.id}.wav`;
    const duration = probeSeconds(audioPath);
    const silence = detectSilence(audioPath, duration);
    const finalSpeech = Math.max(
      0.05,
      duration - silence.lead - silence.trail,
    );

    const audioStartFrame = Math.max(
      0,
      startFrame - Math.round(silence.lead * FPS),
    );
    const speechStartFrame = startFrame;
    const speechEndFrame = startFrame + Math.round(finalSpeech * FPS);
    const overSeconds = finalSpeech - availableSeconds;
    const intoLeadIn = finalSpeech - windowSeconds;
    const fits = overSeconds <= 0.0005;
    // 3. Still too long after trimming and 1.2x: let it bleed into the next
    //    scene's lead-in instead of cutting the clip, up to 0.4 s.
    const overflowAllowed = !fits && intoLeadIn <= OVERFLOW_SECONDS + 0.0005;

    const words = splitWords(scene.transcript);
    const slamWordIndex = anchorWordIndex(words, scene.anchor);
    if (slamWordIndex < 0) {
      throw new Error(
        `[voice] ${scene.id}: the anchor phrase "${scene.anchor.phrase}" is ` +
          `not in the transcript, so the caption has nothing to land on:\n  ${scene.transcript}`,
      );
    }
    // Pauses are given to the gap between words, not to the words: measured
    // relative to the first spoken word so a slam lands on the audio.
    const pauseFrames = silence.spans.map((span) => ({
      start: (span.start - silence.lead) * FPS,
      end: (span.end - silence.lead) * FPS,
    }));
    const timings = buildWordTimings(
      words,
      speechEndFrame - speechStartFrame,
      pauseFrames,
    );
    const keywordFrame =
      speechStartFrame + (timings[slamWordIndex]?.startFrame ?? 0);
    // The caption lands on the first frame the anchored word is spoken: never
    // before the voice reaches it, and inside the +/-3 frame tolerance.
    const slamFrame = keywordFrame;

    const detectedWords = countOnsets(sourcePath);
    if (Math.abs(detectedWords - words.length) > 2) {
      transcriptWarnings.push(
        `${scene.id}: transcript has ${words.length} words, the audio has ` +
          `about ${detectedWords} onsets (${words.length - detectedWords} apart).`,
      );
    }

    const windowEndFrame = startFrame + windowFrames;
    if (slamFrame < startFrame || slamFrame >= windowEndFrame) {
      anchorErrors.push(
        `${scene.id}: slam frame ${slamFrame} is outside its scene window ` +
          `${startFrame}-${windowEndFrame - 1}.`,
      );
    }
    if (slamFrame < keywordFrame) {
      anchorErrors.push(
        `${scene.id}: slam frame ${slamFrame} is before the voice reaches ` +
          `"${words[slamWordIndex]}" at frame ${keywordFrame}.`,
      );
    }
    if (keywordFrame >= speechEndFrame) {
      anchorErrors.push(
        `${scene.id}: the anchored word "${words[slamWordIndex]}" starts at ` +
          `frame ${keywordFrame}, after the speech ends at ${speechEndFrame}.`,
      );
    }

    const entry: Prepared = {
      id: scene.id,
      source: `voice/${scene.file}`,
      audio: audioFile,
      sceneStartFrame: startFrame,
      audioStartFrame,
      speechStartFrame,
      speechEndFrame,
      durationSeconds: round(duration),
      leadSilenceSeconds: round(silence.lead),
      trailingSilenceSeconds: round(silence.trail),
      speechSeconds: round(finalSpeech),
      windowFrames,
      windowSeconds: round(windowSeconds),
      availableSeconds: round(availableSeconds),
      tempo: round(tempo),
      fits,
      overSeconds: round(Math.max(0, overSeconds)),
      overflowAllowed,
      slamFrame,
      slamWord: words[slamWordIndex] ?? "",
      slamWordIndex,
      anchorPhrase: `${scene.anchor.phrase} -> "${words[slamWordIndex]}"`,
      keywordFrame,
      slamDeltaFrames: slamFrame - keywordFrame,
      transcriptWords: words.length,
      detectedWords,
      words: timings.map((timing) => ({
        word: timing.word,
        startFrame: speechStartFrame + timing.startFrame,
        endFrame: speechStartFrame + timing.endFrame,
      })),
    };
    prepared.push(entry);

    if (!fits) {
      if (overflowAllowed) {
        overflowed.push(
          `${scene.id}: ${entry.speechSeconds.toFixed(2)}s in a ` +
            `${windowSeconds.toFixed(2)}s window after ${tempo.toFixed(2)}x — ` +
            `${Math.max(0, intoLeadIn).toFixed(2)}s into the next scene's lead-in.`,
        );
      } else {
        failures.push(
          `${scene.id}: speech ${entry.speechSeconds.toFixed(2)}s still does not ` +
            `fit ${windowSeconds.toFixed(2)}s even at ${tempo.toFixed(2)}x, and ` +
            `runs ${intoLeadIn.toFixed(2)}s past the window ` +
            `(allowance ${OVERFLOW_SECONDS.toFixed(2)}s). Shorten the line.`,
        );
      }
    }
  }

  const overlaps: string[] = [];
  /** Frames of air between a clip's speech and the next clip's speech. */
  const gaps: Array<{
    id: string;
    frames: number;
    endFrame: number;
    nextStartFrame: number;
    excused: boolean;
  }> = [];
  const minGapFrames = Math.round(CLEAR_SECONDS * FPS);
  const overflowFrames = Math.round(OVERFLOW_SECONDS * FPS);
  for (let index = 0; index < prepared.length - 1; index += 1) {
    const current = prepared[index];
    const next = prepared[index + 1];
    const gap = next.speechStartFrame - current.speechEndFrame;
    const excused = current.overflowAllowed && gap >= -overflowFrames;
    gaps.push({
      id: current.id,
      frames: gap,
      endFrame: current.speechEndFrame,
      nextStartFrame: next.speechStartFrame,
      excused,
    });
    if (gap < 0 && !excused) {
      overlaps.push(
        `${current.id} ends at frame ${current.speechEndFrame}, ` +
          `${next.id} starts at frame ${next.speechStartFrame} ` +
          `(${(gap / FPS).toFixed(2)}s overlap)`,
      );
    } else if (gap < minGapFrames && !excused) {
      gapErrors.push(
        `${current.id} -> ${next.id}: only ${(gap / FPS).toFixed(2)}s of gap ` +
          `(${gap} frames), the minimum is ${CLEAR_SECONDS.toFixed(2)}s.`,
      );
    }
  }

  // Written as a module (not JSON) so plain Node can import the measured
  // timings without JSON import attributes, for the offline check scripts.
  writeFileSync(
    MANIFEST,
    "// Generated by scripts/prepare-voice.ts. Do not edit by hand.\n" +
      `export const VOICE_MANIFEST = ${JSON.stringify(
        { fps: FPS, clips: prepared },
        null,
        2,
      )};\n`,
  );

  const seconds = (frame: number): string => (frame / FPS).toFixed(2);
  const pad = (value: string, width: number): string => value.padEnd(width);

  console.log(
    `${pad("clip", 9)}${pad("window start", 14)}${pad("window end", 12)}` +
      `${pad("lead silence", 14)}${pad("speech length", 15)}` +
      `${pad("fits in window", 16)}${pad("seconds over", 13)}atempo`,
  );
  for (const clip of prepared) {
    console.log(
      `${pad(clip.id, 9)}` +
        `${pad(`${seconds(clip.speechStartFrame)}s`, 14)}` +
        `${pad(`${seconds(clip.speechStartFrame + clip.windowFrames)}s`, 12)}` +
        `${pad(`${clip.leadSilenceSeconds.toFixed(2)}s`, 14)}` +
        `${pad(`${clip.speechSeconds.toFixed(2)}s`, 15)}` +
        `${pad(clip.fits ? "yes" : clip.overflowAllowed ? "lead-in" : "no", 16)}` +
        `${pad(`${clip.overSeconds.toFixed(2)}s`, 13)}` +
        `${clip.tempo.toFixed(2)}x`,
    );
  }

  console.log(
    `\n${pad("scene", 9)}${pad("voice start", 13)}${pad("voice end", 12)}` +
      `${pad("caption slam", 15)}${pad("keyword frame", 15)}delta`,
  );
  for (const clip of prepared) {
    console.log(
      `${pad(clip.id, 9)}` +
        `${pad(seconds(clip.speechStartFrame), 13)}` +
        `${pad(seconds(clip.speechEndFrame), 12)}` +
        `${pad(String(clip.slamFrame), 15)}` +
        `${pad(`${clip.keywordFrame} (${clip.slamWord})`, 15)}` +
        `${clip.slamDeltaFrames >= 0 ? "+" : ""}${clip.slamDeltaFrames}f`,
    );
  }

  console.log(
    `\n${pad("scene", 9)}${pad("voice end", 12)}${pad("next starts", 13)}` +
      `gap        minimum`,
  );
  for (const gap of gaps) {
    console.log(
      `${pad(gap.id, 9)}` +
        `${pad(seconds(gap.endFrame), 12)}` +
        `${pad(seconds(gap.nextStartFrame), 13)}` +
        `${pad(`${(gap.frames / FPS).toFixed(2)}s`, 11)}` +
        `${pad(`${CLEAR_SECONDS.toFixed(2)}s`, 8)}` +
        `${gap.excused ? "lead-in" : gap.frames >= minGapFrames ? "ok" : "FAIL"}`,
    );
  }

  console.log(
    `\n${pad("clip", 9)}${pad("transcript words", 18)}` +
      `${pad("detected onsets", 17)}difference`,
  );
  for (const clip of prepared) {
    const difference = clip.transcriptWords - clip.detectedWords;
    console.log(
      `${pad(clip.id, 9)}` +
        `${pad(String(clip.transcriptWords), 18)}` +
        `${pad(String(clip.detectedWords), 17)}` +
        `${difference > 0 ? "+" : ""}${difference}` +
        `${Math.abs(difference) > 2 ? "  FLAG" : ""}`,
    );
  }

  if (transcriptWarnings.length > 0) {
    console.log("\n[voice] Transcript vs audio differs by more than 2 words:");
    for (const warning of transcriptWarnings) {
      console.log(`  - ${warning}`);
    }
  }

  if (overflowed.length > 0) {
    console.log(
      `\n[voice] Running into the next scene's lead-in (allowed, not cut):`,
    );
    for (const item of overflowed) {
      console.log(`  - ${item}`);
    }
  }

  if (anchorErrors.length > 0) {
    console.error("\n[voice] FAIL: caption slams outside their scene or anchor:");
    for (const error of anchorErrors) {
      console.error(`  - ${error}`);
    }
  }

  if (gapErrors.length > 0) {
    console.error(
      `\n[voice] FAIL: less than ${CLEAR_SECONDS.toFixed(2)}s of gap between clips:`,
    );
    for (const error of gapErrors) {
      console.error(`  - ${error}`);
    }
  }

  if (overlaps.length > 0) {
    console.error("\n[voice] FAIL: voice clips overlap the next clip:");
    for (const overlap of overlaps) {
      console.error(`  - ${overlap}`);
    }
  }

  if (failures.length > 0) {
    console.error(
      `\n[voice] FAIL: clips past the ${OVERFLOW_SECONDS.toFixed(2)}s lead-in allowance:`,
    );
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
  }

  const failed =
    overlaps.length > 0 ||
    gapErrors.length > 0 ||
    anchorErrors.length > 0 ||
    failures.length > 0;

  if (failed) {
    if (!REPORT_ONLY) {
      console.error(
        "\n[voice] Shorten the narration (src/voice/script.ts) and re-run npm run voice:prepare.",
      );
      process.exit(1);
    }
    console.error(
      "\n[voice] --allow-overflow: manifest written anyway; the mix will still overlap.\n",
    );
  }

  console.log(`\n[voice] Wrote ${MANIFEST}\n`);
};

main();
