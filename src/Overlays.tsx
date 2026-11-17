import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT_STACK, scaleForHeight } from "./config";
import { SCENES } from "./timeline";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const Caption: React.FC<{
  text: string;
  start: number;
  end: number;
  scale: number;
}> = ({ text, start, end, scale }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const entry = interpolate(t, [start + 0.08, start + 0.52], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const exit = interpolate(t, [end - 0.34, end - 0.08], [1, 0], clamp);
  const opacity = entry * exit;

  if (!text || opacity <= 0.002) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: scaleForHeight(214, 1920),
        left: 0,
        right: 0,
        padding: `0 ${scaleForHeight(76, 1920)}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity,
        transform: `translateY(${(1 - entry) * 26 * scale}px)`,
      }}
    >
      <div
        style={{
          width: scaleForHeight(58, 1920),
          height: scaleForHeight(5, 1920),
          borderRadius: 99,
          backgroundColor: COLORS.gold,
          boxShadow: `0 0 ${scaleForHeight(22, 1920)}px ${COLORS.gold}`,
          marginBottom: scaleForHeight(26, 1920),
          opacity: 0.9,
          transform: `scaleX(${0.35 + 0.65 * entry})`,
        }}
      />
      <div
        style={{
          maxWidth: scaleForHeight(940, 1920),
          fontFamily: FONT_STACK,
          fontWeight: 800,
          fontSize: scaleForHeight(88, 1920),
          lineHeight: 1.04,
          letterSpacing: scaleForHeight(-1.6, 1920),
          color: COLORS.white,
          textAlign: "center",
          textShadow: `0 ${scaleForHeight(10, 1920)}px ${scaleForHeight(
            40,
            1920,
          )}px rgba(0,0,0,0.85), 0 0 ${scaleForHeight(
            34,
            1920,
          )}px rgba(95,227,255,0.16)`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const Overlays: React.FC = () => {
  const { height } = useVideoConfig();
  const scale = height / 1920;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(3,7,16,0.62) 0%, rgba(3,7,16,0.1) 24%, rgba(3,7,16,0) 58%, rgba(3,7,16,0.38) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 18%, rgba(0,0,0,0) 82%, rgba(0,0,0,0.28) 100%)",
        }}
      />
      {SCENES.map((scene) => (
        <Caption
          key={scene.id}
          text={scene.caption}
          start={scene.start}
          end={scene.end}
          scale={scale}
        />
      ))}
    </AbsoluteFill>
  );
};
