import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS, FONT, rf } from "../config";
import { STATIONS } from "../scene/timeline";
import { buildWordTimings, VOICE_CLIPS } from "./voiceCues";

const WORDS_PER_LINE = 7;
/** Subtitles follow the same fixed windows as the captions. */
const LEAD = rf(10);

/**
 * Small word-level subtitles. Independent of QUALITY, controlled by
 * SHOW_SUBTITLES in config.ts. Timing comes from the scene window only, never
 * from the measured length of the audio file.
 */
export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const station = STATIONS.find((item) => frame >= item.start && frame < item.end);
  if (!station) {
    return null;
  }

  const clip = VOICE_CLIPS[station.index];
  if (!clip) {
    return null;
  }

  const start = station.start + LEAD;
  const end = station.end;
  if (frame < start) {
    return null;
  }

  const length = Math.max(1, end - start);
  const local = Math.min(frame - start, length - 1);
  const timings = buildWordTimings(clip, length);

  let activeIndex = timings.findIndex(
    (timing) => local >= timing.start && local < timing.end,
  );
  if (activeIndex < 0) {
    activeIndex = timings.length - 1;
  }

  const lineStart = Math.floor(activeIndex / WORDS_PER_LINE) * WORDS_PER_LINE;
  const line = timings.slice(lineStart, lineStart + WORDS_PER_LINE);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 148,
        display: "flex",
        justifyContent: "center",
        padding: "0 96px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0 12px",
          maxWidth: 900,
          fontFamily: FONT.display,
          fontSize: 34,
          lineHeight: 1.25,
          letterSpacing: "-0.01em",
          textTransform: "uppercase",
          textAlign: "center",
          textShadow: "0 2px 18px rgba(0,0,0,0.85)",
        }}
      >
        {line.map((timing, index) => {
          const absoluteIndex = lineStart + index;
          const isActive = absoluteIndex === activeIndex;
          const isPast = absoluteIndex < activeIndex;
          return (
            <span
              key={`${timing.word}-${absoluteIndex}`}
              style={{
                color: isActive
                  ? COLORS.ink
                  : isPast
                    ? "rgba(230,237,243,0.42)"
                    : "rgba(230,237,243,0.26)",
                transition: "none",
              }}
            >
              {timing.word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
