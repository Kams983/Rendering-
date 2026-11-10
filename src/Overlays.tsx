import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "./config";

const FONT = "'Helvetica Neue', Helvetica, Arial, 'Segoe UI', sans-serif";

/** Fade/slide a block in at `from` and out at `to` (seconds). */
const Appear: React.FC<{
  from: number;
  to: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  rise?: number;
}> = ({ from, to, children, style, rise = 24 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t < from || t > to) return null;
  const inP = interpolate(t, [from, from + 0.35], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const outP = interpolate(t, [to - 0.3, to], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <div
      style={{
        opacity: inP * outP,
        transform: `translateY(${(1 - inP) * rise}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const big: React.CSSProperties = {
  fontFamily: FONT,
  fontWeight: 800,
  fontSize: 104,
  lineHeight: 1.05,
  color: COLORS.white,
  textAlign: "center",
  letterSpacing: -2,
  textShadow: "0 6px 40px rgba(0,0,0,0.6)",
  padding: "0 70px",
};

const topBlock: React.CSSProperties = {
  position: "absolute",
  top: 190,
  left: 0,
  right: 0,
};

const Gold: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: COLORS.gold, textShadow: `0 0 40px ${COLORS.gold}, 0 0 90px ${COLORS.gold}` }}>
    {children}
  </span>
);

const Pill: React.FC<{ label: string; color: string; from: number }> = ({ label, color, from }) => (
  <Appear from={from} to={24.3} rise={30}>
    <div
      style={{
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: 70,
        color: "#0a0f20",
        background: color,
        borderRadius: 999,
        padding: "14px 54px",
        boxShadow: `0 0 50px ${color}88`,
      }}
    >
      {label}
    </div>
  </Appear>
);

export const Overlays: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const blackIn = interpolate(t, [27.1, 27.9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const yetPop = interpolate(t, [28.7, 29.1], [0.6, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(2)),
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* vignette */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* 0-3 */}
      <Appear from={0.2} to={3.0} style={topBlock}>
        <div style={big}>You are not behind.</div>
      </Appear>

      {/* 3-7 thought bubble */}
      <Appear from={3.4} to={7.1} style={{ ...topBlock, top: 230 }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              fontFamily: FONT,
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: 64,
              color: "#e8edff",
              background: "rgba(255,255,255,0.1)",
              border: "3px solid rgba(255,255,255,0.35)",
              borderRadius: 60,
              padding: "36px 56px",
              maxWidth: 820,
              textAlign: "center",
            }}
          >
            I'm just not good at this
          </div>
        </div>
      </Appear>

      {/* 7-10 yet */}
      <Appear from={7.2} to={10.0} style={topBlock}>
        <div style={{ ...big, fontSize: 84, color: "#dfe6ff" }}>I'm not good at this...</div>
        <div style={{ ...big, fontSize: 210, marginTop: 10 }}>
          <Gold>yet.</Gold>
        </div>
      </Appear>

      {/* 10-14 */}
      <Appear from={10.2} to={12.0} style={topBlock}>
        <div style={big}>What you see</div>
      </Appear>
      <Appear from={12.2} to={14.0} style={topBlock}>
        <div style={{ ...big, color: "#aab4d4" }}>What you don't</div>
      </Appear>

      {/* 14-18 */}
      <Appear from={14.3} to={16.3} style={topBlock}>
        <div style={big}>Struggle is not proof you can't.</div>
      </Appear>
      <Appear from={16.5} to={18.0} style={topBlock}>
        <div style={big}>
          It's proof you're <Gold>growing.</Gold>
        </div>
      </Appear>

      {/* 18-23 loop pills */}
      <div
        style={{
          position: "absolute",
          top: 210,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 26,
        }}
      >
        <Pill label="Effort" color={COLORS.cyan} from={18.3} />
        <Pill label="Feedback" color={COLORS.gold} from={19.8} />
        <Pill label="Repeat" color="#ff7ab6" from={21.3} />
      </div>

      {/* 23-27 */}
      <Appear from={24.6} to={27.0} style={topBlock}>
        <div style={big}>
          So stay in <Gold>the work.</Gold>
        </div>
      </Appear>

      {/* 27-30 final */}
      <AbsoluteFill style={{ background: COLORS.bg, opacity: blackIn }} />
      {t > 27.9 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <Appear from={28.0} to={31} style={{ textAlign: "center" }}>
            <div style={{ ...big, fontSize: 96 }}>Not good at this.</div>
          </Appear>
          {t > 28.7 && (
            <div
              style={{
                ...big,
                fontSize: 230,
                marginTop: 20,
                transform: `scale(${yetPop})`,
              }}
            >
              <Gold>Yet.</Gold>
            </div>
          )}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
