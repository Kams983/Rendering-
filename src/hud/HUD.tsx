import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS, FONT, VIDEO, SHOW_SUBTITLES, frames60 } from "../config";
import { CUE_FRAMES } from "../sfx/cues";
import { errorPulseAt, impactAt } from "../sfx/useSfxImpact";
import { stationForFrame, STATIONS } from "../scene/timeline";
import { safe } from "../utils/math";

const pad = (value: number, size = 2): string =>
  String(Math.max(0, Math.floor(value))).padStart(size, "0");

const timecode = (frame: number): string => {
  const seconds = Math.floor(frame / VIDEO.fps);
  const minutes = Math.floor(seconds / 60);
  return `${pad(minutes)}:${pad(seconds % 60)}:${pad(frame % VIDEO.fps)}`;
};

export const HUD: React.FC = () => {
  const frame = useCurrentFrame();
  const station = stationForFrame(frame);
  const error = safe(errorPulseAt(frame), 0, 0, 1);
  const impact = safe(impactAt(frame), 0, 0, 1);

  const blackout = Math.min(
    1,
    Math.max(
      0,
      (frame - CUE_FRAMES.blackout) /
        Math.max(1, VIDEO.durationInFrames - CUE_FRAMES.blackout),
    ),
  );
  const blink = frame % frames60(70) < frames60(38);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        color: COLORS.ink,
        fontFamily: FONT.mono,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: "absolute",
          top: 62,
          left: 68,
          right: 68,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                background: COLORS.red,
                opacity: blink ? 1 : 0.25,
                boxShadow: `0 0 14px ${COLORS.red}`,
              }}
            />
            <span
              style={{
                fontSize: 17,
                letterSpacing: "0.22em",
                color: "rgba(230,237,243,0.55)",
              }}
            >
              CODING MISTAKES
            </span>
          </div>
          <div
            style={{
              fontFamily: FONT.display,
              fontSize: 27,
              letterSpacing: "0.03em",
              fontWeight: 900,
              color: station.color,
              textShadow: "0 2px 18px rgba(0,0,0,0.7)",
            }}
          >
            {station.label}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 20,
              letterSpacing: "0.12em",
              color: "rgba(230,237,243,0.6)",
            }}
          >
            {timecode(frame)}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              letterSpacing: "0.24em",
              color: "rgba(139,148,158,0.7)",
            }}
          >
            {`TAKE 005 / ${VIDEO.fps} FPS`}
          </div>
        </div>
      </div>

      {/* Progress rail */}
      <div
        style={{
          position: "absolute",
          right: 46,
          top: 340,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {STATIONS.map((item) => {
          const active = item.index === station.index;
          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  color: active ? item.color : "rgba(139,148,158,0.3)",
                }}
              >
                {pad(item.index + 1)}
              </span>
              <span
                style={{
                  height: 2,
                  width: active ? 42 : 18,
                  background: active ? item.color : "rgba(139,148,158,0.26)",
                  boxShadow: active ? `0 0 12px ${item.color}` : "none",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Corner brackets */}
      {[
        { top: 30, left: 30, borderTop: true, borderLeft: true },
        { top: 30, right: 30, borderTop: true, borderRight: true },
        { bottom: 30, left: 30, borderBottom: true, borderLeft: true },
        { bottom: 30, right: 30, borderBottom: true, borderRight: true },
      ].map((corner, index) => (
        <span
          key={index}
          style={{
            position: "absolute",
            width: 42,
            height: 42,
            ...corner,
            borderTop: corner.borderTop ? `1px solid rgba(88,166,255,0.34)` : undefined,
            borderLeft: corner.borderLeft ? `1px solid rgba(88,166,255,0.34)` : undefined,
            borderRight: corner.borderRight ? `1px solid rgba(88,166,255,0.34)` : undefined,
            borderBottom: corner.borderBottom ? `1px solid rgba(88,166,255,0.34)` : undefined,
          }}
        />
      ))}

      {/* Bottom meta */}
      <div
        style={{
          position: "absolute",
          left: 68,
          bottom: SHOW_SUBTITLES ? 86 : 62,
          fontSize: 12,
          letterSpacing: "0.2em",
          color: "rgba(139,148,158,0.55)",
        }}
      >
        {`${VIDEO.width} × ${VIDEO.height} · ${VIDEO.fps} FPS · ${(
          VIDEO.durationInFrames / VIDEO.fps
        ).toFixed(1)} S`}
      </div>

      {/* Scanlines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.032) 0px, rgba(255,255,255,0.032) 1px, transparent 1px, transparent 3px)",
          opacity: 0.6,
          mixBlendMode: "overlay",
        }}
      />

      {/* Slam flash and error wash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 45%, rgba(255,59,59,${0.05 + error * 0.16}), rgba(255,59,59,0) 62%)`,
          opacity: error > 0.02 ? 1 : 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(255,255,255,0.055)",
          opacity: safe(Math.min(0.75, impact * 0.55), 0, 0, 0.75),
        }}
      />

      {/* Bass-drop blackout */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#000000",
          opacity: blackout,
        }}
      />
    </div>
  );
};
