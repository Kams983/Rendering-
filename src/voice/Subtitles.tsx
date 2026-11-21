import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS, FONT } from "../config";
import { activeClipAt } from "./voiceCues";

const WORDS_PER_LINE = 7;

/**
 * Small word-level subtitles. Independent of QUALITY, controlled by
 * SHOW_SUBTITLES in config.ts. Word timings are the measured ones from the
 * voice manifest, so the highlight follows the actual clip.
 */
export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const clip = activeClipAt(frame);

  if (!clip || clip.words.length === 0) {
    return null;
  }

  const timings = clip.words;
  let activeIndex = timings.findIndex(
    (timing) => frame >= timing.startFrame && frame < timing.endFrame,
  );
  if (activeIndex < 0) {
    activeIndex = frame >= clip.speechEndFrame ? timings.length - 1 : 0;
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
        padding: "0 60px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0 12px",
          maxWidth: 960,
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
