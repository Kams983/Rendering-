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

  if (!text) {
    return null;
  }

  const entry = interpolate(t, [start + 0.1, start + 0.5], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const exit = interpolate(t, [end - 0.28, end - 0.06], [1, 0], clamp);
  const opacity = entry * exit;

  if (opacity <= 0.001) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: scaleForHeight(158, 1920) * scale,
        left: 0,
        right: 0,
        padding: `0 ${64 * scale}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity,
        transform: `translateY(${(1 - entry) * 28 * scale}px)`,
      }}
    >
      <div
        style={{
          width: 54 * scale,
          height: 5 * scale,
          borderRadius: 3 * scale,
          backgroundColor: COLORS.gold,
          boxShadow: `0 0 ${18 * scale}px ${COLORS.gold}`,
          marginBottom: 20 * scale,
          transform: `scaleX(${0.4 + 0.6 * entry})`,
          transformOrigin: "center",
        }}
      />
      <div
        style={{
          maxWidth: 940 * scale,
          fontFamily: FONT_STACK,
          fontWeight: 800,
          fontSize: 84 * scale,
          lineHeight: 1.08,
          letterSpacing: -1.5 * scale,
          color: COLORS.white,
          textAlign: "center",
          textShadow: `0 ${8 * scale}px ${36 * scale}px rgba(0,0,0,0.8), 0 0 ${
            30 * scale
          }px rgba(92,225,255,0.12)`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

const FinalCard: React.FC<{ text: string; scale: number }> = ({
  text,
  scale,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const entry = interpolate(t, [62.05, 62.6], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const line = interpolate(t, [62.35, 63.1], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const shade = interpolate(t, [61.92, 62.5], [0, 0.92], clamp);

  if (t < 61.95) {
    return null;
  }

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 48%, rgba(5,10,24,0.35) 0%, rgba(5,10,24,0.94) 78%)",
          opacity: shade,
        }}
      />
      <div
        style={{
          position: "relative",
          width: 900 * scale,
          textAlign: "center",
          opacity: entry,
          transform: `translateY(${(1 - entry) * 26 * scale}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONT_STACK,
            fontWeight: 800,
            fontSize: 96 * scale,
            lineHeight: 1.08,
            letterSpacing: -2 * scale,
            color: COLORS.white,
            textShadow: `0 0 ${50 * scale}px rgba(92,225,255,0.18), 0 ${
              10 * scale
            }px ${40 * scale}px rgba(0,0,0,0.72)`,
          }}
        >
          {text}
        </div>
        <div
          style={{
            height: 6 * scale,
            width: 200 * scale,
            margin: `${34 * scale}px auto 0`,
            borderRadius: 3 * scale,
            backgroundColor: COLORS.gold,
            boxShadow: `0 0 ${24 * scale}px ${COLORS.gold}`,
            transform: `scaleX(${line})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const Overlays: React.FC = () => {
  const { height } = useVideoConfig();
  const scale = height / 1920;
  const finalScene = SCENES[SCENES.length - 1];

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 47%, rgba(0,0,0,0) 36%, rgba(0,0,0,0.62) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(3,7,18,0.55) 0%, rgba(3,7,18,0) 26%, rgba(3,7,18,0) 72%, rgba(3,7,18,0.35) 100%)",
        }}
      />
      {SCENES.filter((scene) => scene.id !== "final").map((scene) => (
        <Caption
          key={scene.id}
          text={scene.caption}
          start={scene.start}
          end={scene.end}
          scale={scale}
        />
      ))}
      <FinalCard text={finalScene.caption} scale={scale} />
    </AbsoluteFill>
  );
};
