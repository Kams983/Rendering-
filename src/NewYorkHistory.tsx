import React from "react";
import { ThreeCanvas } from "@remotion/three";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, SCENES, SFX_VOLUME, USE_VOICEOVER, WIDTH, HEIGHT } from "./constants";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const pop = (frame: number, fps: number) => spring({ frame, fps, config: { damping: 14, stiffness: 110 } });

const Island: React.FC<{ green?: boolean; opacity?: number; scale?: number }> = ({
  green = true,
  opacity = 1,
  scale = 1,
}) => (
  <group scale={scale}>
    <mesh position={[0, 0, -0.5]} scale={[0.96, 5.65, 0.24]}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshStandardMaterial color="#b59a6b" roughness={1} transparent opacity={opacity} />
    </mesh>
    <mesh position={[0, 0, -0.28]} scale={[0.82, 5.45, 0.22]}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshStandardMaterial
        color={green ? COLORS.island : "#202d35"}
        roughness={1}
        transparent
        opacity={opacity}
      />
    </mesh>
  </group>
);

const Water: React.FC = () => (
  <mesh position={[0, 0, -3]}>
    <planeGeometry args={[100, 100]} />
    <meshBasicMaterial color={COLORS.water} />
  </mesh>
);

const Forest: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => (
  <group>
    {Array.from({ length: 23 }, (_, i) => {
      const y = -4.7 + ((i * 37) % 93) / 10;
      const x = (Math.sin(i * 12.7) * 0.25) + (i % 2 === 0 ? -0.27 : 0.27);
      const scale = pop(frame - i * 2, fps);
      return (
        <group key={i} position={[x, y, 0.05]} scale={scale * (0.72 + (i % 3) * 0.12)}>
          <mesh position={[0, -0.1, 0]}>
            <cylinderGeometry args={[0.045, 0.075, 0.38, 5]} />
            <meshStandardMaterial color="#664d35" />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <coneGeometry args={[0.24, 0.62, 6]} />
            <meshStandardMaterial color={i % 3 === 0 ? "#668c53" : COLORS.forest} flatShading />
          </mesh>
        </group>
      );
    })}
    {[-2.2, 0.4, 2.5].map((y, i) => (
      <mesh key={i} position={[0, y, -0.15]} scale={[0.42, 0.26, 0.16]}>
        <sphereGeometry args={[1, 7, 5]} />
        <meshStandardMaterial color={i === 1 ? "#6d8753" : "#54744a"} flatShading />
      </mesh>
    ))}
    <mesh position={[0.05, 0.1, 0.1]} rotation={[0, 0, -0.18]}>
      <boxGeometry args={[0.075, 8.6, 0.025]} />
      <meshStandardMaterial color={COLORS.waterLight} />
    </mesh>
  </group>
);

type BuildingSpec = { x: number; y: number; w: number; h: number; color?: string };
const CITY_BUILDINGS: BuildingSpec[] = Array.from({ length: 19 }, (_, i) => ({
  x: ((i % 5) - 2) * 0.28 + Math.sin(i * 7) * 0.08,
  y: -4.1 + Math.floor(i / 5) * 0.35,
  w: 0.19 + (i % 3) * 0.035,
  h: 0.38 + (i % 4) * 0.18,
  color: ["#d0a46e", "#c38753", "#a96e4a"][i % 3],
}));

const Skyline: React.FC<{ frame: number; fps: number; opacity?: number; sinkBuildings?: boolean }> = ({
  frame,
  fps,
  opacity = 1,
  sinkBuildings = false,
}) => (
  <group>
    {Array.from({ length: 25 }, (_, i) => {
      const x = -3.25 + (i % 5) * 1.62 + Math.sin(i * 4) * 0.16;
      const y = -3.8 + Math.floor(i / 5) * 1.9;
      const h = 1.1 + ((i * 13) % 19) / 10;
      const sink = sinkBuildings ? interpolate(frame, [0, 95], [0, -h - 1.7], clamp) : 0;
      const rise = sinkBuildings ? 1 : pop(frame - (i % 5) * 5 - Math.floor(i / 5) * 4, fps);
      return (
        <group key={i} position={[x, y + sink, 0.4]} scale={[1, rise, 1]}>
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[0.52, h, 0.55]} />
            <meshStandardMaterial
              color={i % 4 === 0 ? "#31495c" : "#213748"}
              emissive={COLORS.glow}
              emissiveIntensity={i % 3 === 0 ? 0.2 : 0.05}
              roughness={0.55}
              transparent
              opacity={opacity}
            />
          </mesh>
          <mesh position={[0, h + 0.035, 0]}>
            <boxGeometry args={[0.08, 0.07, 0.08]} />
            <meshBasicMaterial color={COLORS.gold} transparent opacity={opacity} />
          </mesh>
          {Array.from({ length: Math.floor(h * 2) }, (_, row) => (
            <mesh key={row} position={[0, 0.22 + row * 0.4, 0.286]}>
              <boxGeometry args={[0.085, 0.12, 0.012]} />
              <meshBasicMaterial color={COLORS.gold} transparent opacity={opacity * 0.78} />
            </mesh>
          ))}
        </group>
      );
    })}
  </group>
);

const TimberBuildings: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => (
  <group>
    {CITY_BUILDINGS.map((b, i) => {
      const p = pop(frame - i * 5, fps);
      return (
        <group key={i} position={[b.x, b.y, 0.28]} scale={[1, p, 1]}>
          <mesh position={[0, b.h / 2, 0]}>
            <boxGeometry args={[b.w, b.h, 0.34]} />
            <meshStandardMaterial color={b.color ?? COLORS.wood} />
          </mesh>
          <mesh position={[0, b.h + 0.05, 0]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[b.w * 1.3, 0.16, 0.4]} />
            <meshStandardMaterial color={COLORS.roof} />
          </mesh>
          <mesh position={[0, 0.15, 0.18]}>
            <boxGeometry args={[0.07, 0.18, 0.02]} />
            <meshStandardMaterial color="#352a24" />
          </mesh>
        </group>
      );
    })}
  </group>
);

const RiverLife: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => (
  <group>
    {[-1.3, 1.25].map((x, i) => {
      const p = pop(frame - i * 14, fps);
      return (
        <group key={i} position={[x, 0.3 - i * 1.8, 0.25]} scale={p}>
          <mesh scale={[0.43, 0.12, 0.1]}>
            <sphereGeometry args={[0.35, 8, 5]} />
            <meshStandardMaterial color="#694832" />
          </mesh>
          <mesh position={[0, 0, 0.08]} rotation={[0, 0, i === 0 ? 0.3 : -0.3]}>
            <boxGeometry args={[0.65, 0.045, 0.045]} />
            <meshStandardMaterial color="#b28b56" />
          </mesh>
        </group>
      );
    })}
    {[-3.4, -2.6].map((y, i) => (
      <group key={i} position={[i ? 0.78 : -0.7, y, 0.3]}>
        {Array.from({ length: 5 }, (_, j) => (
          <mesh key={j} position={[(j - 2) * 0.17, (j % 2) * 0.2, 0]} scale={[0.16, 0.25, 0.08]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#b98a46" />
          </mesh>
        ))}
      </group>
    ))}
    {[-2.4, -0.9, 1.7].map((y, i) => (
      <group key={i} position={[i - 1, y, 0.35]} scale={pop(frame - 20 - i * 10, fps)}>
        <mesh>
          <coneGeometry args={[0.15, 0.42, 5]} />
          <meshBasicMaterial color={COLORS.glow} />
        </mesh>
        <mesh position={[0, -0.12, 0.09]} rotation={[0, 0, 0.4]}>
          <boxGeometry args={[0.28, 0.05, 0.05]} />
          <meshStandardMaterial color={COLORS.wood} />
        </mesh>
      </group>
    ))}
    {[-2.8, -1.6, 0.7, 2.2].map((y, i) => (
      <group key={`fish-${i}`} position={[Math.sin(i * 3) * 0.12, y, 0.24]} scale={pop(frame - 28 - i * 8, fps)}>
        <mesh scale={[0.14, 0.055, 0.06]}>
          <sphereGeometry args={[1, 7, 5]} />
          <meshStandardMaterial color="#e2c478" />
        </mesh>
        <mesh position={[-0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.08, 0.12, 4]} />
          <meshStandardMaterial color="#e2c478" />
        </mesh>
      </group>
    ))}
  </group>
);

const Ship: React.FC<{ frame: number }> = ({ frame }) => {
  const x = interpolate(frame, [0, 145], [5.5, -0.1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  return (
    <group position={[x, 3.2, 0.9]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.65, 0.36, 0.48]} />
        <meshStandardMaterial color="#805436" />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[0.16, 0.95, 0.12]} />
        <meshStandardMaterial color="#563d2d" />
      </mesh>
      <mesh position={[-0.35, 0.43, 0.05]} rotation={[0, 0, 0.12]}>
        <coneGeometry args={[0.42, 0.72, 3]} />
        <meshStandardMaterial color="#f0dfbd" />
      </mesh>
      <mesh position={[0.43, 0.4, 0.06]} rotation={[0, 0, -0.1]}>
        <coneGeometry args={[0.31, 0.58, 3]} />
        <meshStandardMaterial color="#e2c99d" />
      </mesh>
    </group>
  );
};

const Roads: React.FC<{ frame: number; grid: boolean }> = ({ frame, grid }) => {
  const count = grid ? 16 : 9;
  return (
    <group>
      {Array.from({ length: count }, (_, i) => {
        const delay = i * (grid ? 8 : 13);
        const p = interpolate(frame - delay, [0, 14], [0, 1], clamp);
        const yy = -5 + i * (10 / (count - 1));
        return (
          <mesh key={`h${i}`} position={[0, yy, 0.28]} scale={[p, 1, 1]}>
            <boxGeometry args={[1.45, grid ? 0.035 : 0.05, 0.035]} />
            <meshStandardMaterial color={COLORS.road} />
          </mesh>
        );
      })}
      {Array.from({ length: grid ? 5 : 2 }, (_, i) => {
        const delay = 18 + i * (grid ? 5 : 19);
        const p = interpolate(frame - delay, [0, 13], [0, 1], clamp);
        const xx = (i - (grid ? 2 : 0.5)) * (grid ? 0.27 : 0.5);
        return (
          <mesh key={`v${i}`} position={[xx, 0, 0.3]} scale={[1, p, 1]}>
            <boxGeometry args={[0.035, 10.1, 0.035]} />
            <meshStandardMaterial color={COLORS.road} />
          </mesh>
        );
      })}
    </group>
  );
};

const BridgeAndTransit: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const bridge = pop(frame - 8, fps);
  const carX = interpolate(frame, [22, 125], [-4.7, 4.7], clamp);
  const trainX = interpolate(frame, [0, 110], [-4.3, 4.3], clamp);
  return (
    <group>
      <group position={[0, 3.65, 0.5]} scale={[1, bridge, 1]}>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[4.8, 0.12, 0.25]} />
          <meshStandardMaterial color="#a88c67" />
        </mesh>
        {[-1.65, 1.65].map((x) => (
          <group key={x} position={[x, 0.75, 0]}>
            <mesh position={[0, 0.6, 0]}>
              <boxGeometry args={[0.15, 1.2, 0.18]} />
              <meshStandardMaterial color="#b49b76" />
            </mesh>
            <mesh position={[0, 0.08, 0]}>
              <boxGeometry args={[0.5, 0.12, 0.24]} />
              <meshStandardMaterial color="#b49b76" />
            </mesh>
          </group>
        ))}
      </group>
      <group position={[trainX, 0, 0.65]}>
        <mesh>
          <boxGeometry args={[1.55, 0.52, 0.52]} />
          <meshStandardMaterial color="#425d65" />
        </mesh>
        <mesh position={[0.78, -0.07, 0]}>
          <boxGeometry args={[0.2, 0.34, 0.5]} />
          <meshStandardMaterial color="#344b55" />
        </mesh>
        {[-0.42, 0.05, 0.48].map((x) => (
          <mesh key={x} position={[x, 0.09, 0.27]}>
            <boxGeometry args={[0.23, 0.17, 0.03]} />
            <meshBasicMaterial color={COLORS.gold} />
          </mesh>
        ))}
      </group>
      <group position={[carX, -2.45, 0.7]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.25, 0.38, 0.42]} />
          <meshStandardMaterial color="#b74e3f" />
        </mesh>
        <mesh position={[0, 0.28, 0]}>
          <boxGeometry args={[0.65, 0.27, 0.35]} />
          <meshStandardMaterial color="#d47a55" />
        </mesh>
        {[-0.38, 0.38].map((x) => (
          <mesh key={x} position={[x, -0.22, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.11, 8]} />
            <meshStandardMaterial color="#22292b" />
          </mesh>
        ))}
      </group>
      <mesh position={[-2.4, 1.6, 0.55]} scale={pop(frame - 75, fps)}>
        <sphereGeometry args={[0.36, 8, 6]} />
        <meshBasicMaterial color={COLORS.gold} />
      </mesh>
    </group>
  );
};

const LandScene: React.FC<{ frame: number; fps: number; kind: number }> = ({ frame, fps, kind }) => {
  const landScale = kind === 5 ? 1.35 : kind === 11 ? 0.9 : 1;
  const skylineOpacity = kind === 11 ? interpolate(frame, [0, 210], [1, 0.17], clamp) : 1;
  return (
    <group scale={landScale}>
      <Island opacity={kind === 11 ? 0.7 : 1} />
      {(kind === 0 || kind === 1) && (
        <Skyline frame={frame} fps={fps} opacity={skylineOpacity} sinkBuildings={kind === 1} />
      )}
      {kind >= 2 && <Forest frame={frame} fps={fps} />}
      {kind >= 3 && <RiverLife frame={frame} fps={fps} />}
      {kind === 4 && <Ship frame={frame} />}
      {(kind === 4 || kind === 5 || kind === 6) && <TimberBuildings frame={frame} fps={fps} />}
      {kind === 5 && (
        <group>
          {Array.from({ length: 9 }, (_, i) => (
            <mesh key={i} position={[-0.65 + i * 0.16, 4.2, 0.4]}>
              <boxGeometry args={[0.045, 0.16, 0.04]} />
              <meshBasicMaterial color={COLORS.gold} transparent opacity={0.65} />
            </mesh>
          ))}
        </group>
      )}
      {(kind === 7 || kind === 8) && (
        <>
          <group position={[0, 0, -0.1]}>
            {Array.from({ length: 16 }, (_, i) => (
              <mesh key={i} position={[(i % 3 - 1) * 0.3, -4.5 + Math.floor(i / 3) * 0.38, 0]}>
                <boxGeometry args={[0.2, 0.23, 0.12]} />
                <meshStandardMaterial color={i % 2 ? "#bd9a67" : "#987d56"} />
              </mesh>
            ))}
          </group>
          <Roads frame={frame} grid={kind === 8} />
        </>
      )}
      {kind === 9 && <BridgeAndTransit frame={frame} fps={fps} />}
      {(kind === 10 || kind === 11) && <Skyline frame={frame - (kind === 10 ? 0 : 0)} fps={fps} opacity={skylineOpacity} />}
    </group>
  );
};

const Stars: React.FC = () => (
  <group>
    {Array.from({ length: 40 }, (_, i) => {
      const x = Math.sin(i * 27.1) * 4.7;
      const y = Math.cos(i * 12.3) * 8.1;
      return (
        <mesh key={i} position={[x, y, -3]}>
          <sphereGeometry args={[0.018 + (i % 3) * 0.006, 5, 4]} />
          <meshBasicMaterial color={i % 4 === 0 ? COLORS.gold : "#a8c7d4"} transparent opacity={0.6} />
        </mesh>
      );
    })}
  </group>
);

const VisualStage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const found = SCENES.findIndex((scene) => frame < scene.from + scene.duration);
  const index = found < 0 ? SCENES.length - 1 : found;
  return (
    <ThreeCanvas width={WIDTH} height={HEIGHT} camera={{ position: [0, 0, 25], fov: 34 }}>
      <ambientLight intensity={1.6} />
      <directionalLight position={[-3, 5, 8]} intensity={2.2} />
      <pointLight position={[0, 2, 5]} intensity={32} color={COLORS.glow} />
      <Water />
      <Stars />
      <SceneContent kind={index} fps={fps} frame={frame - SCENES[index].from} />
    </ThreeCanvas>
  );
};

const SceneContent: React.FC<{ kind: number; fps: number; frame: number }> = ({ kind, fps, frame }) => {
  const sink = kind === 1 ? interpolate(frame, [0, 105], [0, -1.5], clamp) : 0;
  const zoom = kind === 5 ? interpolate(frame, [0, 119], [1, 1.35], clamp) : 1;
  const pullback = kind === 11 ? interpolate(frame, [0, 180], [1.2, 0.86], clamp) : 1;
  return (
    <group position={[0, sink, 0]} scale={zoom * pullback}>
      <LandScene frame={frame} fps={fps} kind={kind} />
    </group>
  );
};

type OverlayScene = { from: number; duration: number; title?: string; subtitle?: string; kicker?: string };
const OVERLAYS: OverlayScene[] = [
  { ...SCENES[0], title: "New York Wasn't Always New York", kicker: "AN ISLAND, BEFORE THE CITY" },
  { ...SCENES[1], kicker: "ROLLING BACK THE CLOCK" },
  { ...SCENES[2], title: "Forests. Wetlands. Rivers. Hills." },
  { ...SCENES[3], title: "An island alive", subtitle: "Canoes, campfires, and fields of corn." },
  { ...SCENES[4], title: "New Amsterdam", subtitle: "A harbor town at the island's southern edge." },
  { ...SCENES[5], title: "A city takes root", subtitle: "The old shoreline still shapes the streets." },
  { ...SCENES[6], kicker: "A NEW NAME" },
  { ...SCENES[7], title: "The city spreads north", subtitle: "Paths become roads. Fields become blocks." },
  { ...SCENES[8], title: "1800s", subtitle: "A street grid reshapes the island." },
  { ...SCENES[9], title: "The city accelerates", subtitle: "Bridges. Trains. Electric light." },
  { ...SCENES[10], title: "Upward, ever upward" },
  { ...SCENES[11], title: "Beneath the concrete,", subtitle: "an island transformed." },
];

const TextOverlay: React.FC<{ scene: OverlayScene; index: number }> = ({ scene, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 12, scene.duration - 10, scene.duration], [0, 1, 1, 0], clamp);
  const titleSpring = spring({ frame: frame - 4, fps, config: { damping: 18, stiffness: 90 } });
  const titleStyle: React.CSSProperties = {
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: index === 0 ? 78 : index === 11 ? 68 : 70,
    lineHeight: 1.06,
    letterSpacing: "-1.5px",
    fontWeight: 800,
    color: COLORS.text,
    textShadow: "0 5px 35px rgba(0,0,0,.62)",
    margin: 0,
  };

  return (
    <div style={{ position: "absolute", inset: 0, opacity, color: COLORS.text, fontFamily: "Arial, Helvetica, sans-serif" }}>
      {scene.kicker && (
        <div style={{
          position: "absolute", top: 220, width: "100%", textAlign: "center",
          color: COLORS.gold, fontSize: 24, letterSpacing: 7, fontWeight: 700,
        }}>
          {scene.kicker}
        </div>
      )}
      {scene.title && (
        <div style={{
          position: "absolute", left: 66, right: 66, bottom: index === 0 ? 510 : index === 4 ? 740 : 435,
          textAlign: "center", transform: `translateY(${(1 - titleSpring) * 24}px) scale(${0.96 + 0.04 * titleSpring})`,
        }}>
          <h1 style={titleStyle}>{scene.title}</h1>
          {scene.subtitle && (
            <p style={{
              fontSize: 34, fontWeight: 500, lineHeight: 1.4, color: COLORS.muted,
              margin: "24px 12px 0", textShadow: "0 3px 22px rgba(0,0,0,.8)",
            }}>
              {scene.subtitle}
            </p>
          )}
        </div>
      )}
      {index === 1 && (
        <div style={{
          position: "absolute", top: 520, width: "100%", textAlign: "center",
          fontSize: 118, fontWeight: 800, letterSpacing: 5, color: COLORS.gold,
          fontVariantNumeric: "tabular-nums", textShadow: "0 0 42px rgba(242,174,84,.45)",
        }}>
          {Math.round(interpolate(frame, [0, 100], [2026, 1600], clamp))}
        </div>
      )}
      {index === 6 && (
        <div style={{ position: "absolute", left: 70, right: 70, top: 620, textAlign: "center" }}>
          <div style={{ ...titleStyle, opacity: interpolate(frame, [0, 55, 95], [1, 1, 0], clamp) }}>New Amsterdam</div>
          <div style={{
            ...titleStyle, position: "absolute", top: 0, width: "100%",
            color: COLORS.gold, opacity: interpolate(frame, [32, 90, 112], [0, 1, 1], clamp),
            transform: `scale(${0.9 + 0.1 * spring({ frame: frame - 32, fps, config: { damping: 16 } })})`,
          }}>
            New York, 1664.
          </div>
        </div>
      )}
      {index === 8 && (
        <div style={{
          position: "absolute", top: 270, width: "100%", textAlign: "center",
          fontSize: 26, letterSpacing: 8, fontWeight: 700, color: COLORS.gold,
        }}>
          THE GRID
        </div>
      )}
      <div style={{
        position: "absolute", left: 64, right: 64, bottom: 92, height: 3,
        background: "rgba(255,255,255,.18)", borderRadius: 3,
      }}>
        <div style={{
          width: `${(frame / scene.duration) * 100}%`, height: "100%",
          background: COLORS.gold, borderRadius: 3,
        }} />
      </div>
    </div>
  );
};

const SFX_CUES = [
  { at: 0, file: "sfx/dark-ambient.wav", volume: 0.55 },
  { at: 28, file: "sfx/deep-impact.wav", volume: 0.9 },
  { at: 105, file: "sfx/whoosh.wav", volume: 0.7 },
  ...Array.from({ length: 7 }, (_, i) => ({ at: 116 + i * 13, file: "sfx/single-tick.wav", volume: 0.4 })),
  { at: 210, file: "sfx/bed.wav", volume: 0.35 },
  { at: 245, file: "sfx/pop.wav", volume: 0.5 },
  { at: 302, file: "sfx/ding.wav", volume: 0.5 },
  { at: 342, file: "sfx/hit.wav", volume: 0.55 },
  { at: 465, file: "sfx/shutter.wav", volume: 0.6 },
  { at: 510, file: "sfx/hit.wav", volume: 0.45 },
  { at: 660, file: "sfx/riser.wav", volume: 0.45 },
  { at: 780, file: "sfx/whoosh.wav", volume: 0.65 },
  { at: 864, file: "sfx/hit.wav", volume: 0.65 },
  ...Array.from({ length: 10 }, (_, i) => ({ at: 900 + i * 11, file: "sfx/tick.wav", volume: 0.35 })),
  { at: 1072, file: "sfx/hit.wav", volume: 0.85 },
  { at: 1080, file: "sfx/single-tick.wav", volume: 0.45 },
  { at: 1260, file: "sfx/riser.wav", volume: 0.65 },
  { at: 1295, file: "sfx/bed.wav", volume: 0.5 },
  { at: 1410, file: "sfx/riser.wav", volume: 0.75 },
  { at: 1555, file: "sfx/deep-impact.wav", volume: 0.9 },
  { at: 1560, file: "sfx/bed.wav", volume: 0.55 },
  { at: 1740, file: "sfx/ding.wav", volume: 0.45 },
];

const AudioTrack: React.FC = () => (
  <>
    {USE_VOICEOVER && <Audio src={staticFile("voiceover.mp3")} volume={1} />}
    {SFX_CUES.map((cue, i) => (
      <Sequence key={`${cue.at}-${i}`} from={cue.at}>
        <Audio src={staticFile(cue.file)} volume={SFX_VOLUME * cue.volume} />
      </Sequence>
    ))}
  </>
);

export const NewYorkHistory: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.night, overflow: "hidden" }}>
      <VisualStage />
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(180deg, rgba(4,9,16,.22), transparent 34%, transparent 62%, rgba(4,9,16,.58))",
      }} />
      {OVERLAYS.map((scene, index) => (
        <Sequence key={scene.from} from={scene.from} durationInFrames={scene.duration}>
          <TextOverlay scene={scene} index={index} />
        </Sequence>
      ))}
      <AudioTrack />
    </AbsoluteFill>
  );
};
