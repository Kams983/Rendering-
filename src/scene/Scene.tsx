import React, { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { ThreeCanvas } from "@remotion/three";
import { FontLoader } from "three-stdlib";
import { ASSETS, COLORS, QUALITY_SETTINGS, VIDEO, type Quality } from "../config";
import { impactAt } from "../sfx/useSfxImpact";
import { clamp } from "../utils/math";
import { Caption3D } from "./Caption3D";
import { CameraRig } from "./CameraRig";
import { CubeSwarm } from "./CubeSwarm";
import { Floor } from "./Floor";
import { Lights } from "./Lights";
import { Particles } from "./Particles";
import { Post } from "./Post";
import { StationProps } from "./Props";
import { ScreenTear } from "./ScreenTear";
import { STATIONS } from "./timeline";

THREE.Cache.enabled = true;

let fontPromise: Promise<void> | null = null;

const preloadFont = (): Promise<void> => {
  if (!fontPromise) {
    fontPromise = new Promise((resolve, reject) => {
      new FontLoader().load(
        staticFile(ASSETS.font3d),
        () => resolve(),
        undefined,
        () =>
          reject(
            new Error(
              `Missing 3D typeface: public/${ASSETS.font3d}. Text3D captions cannot render without it.`,
            ),
          ),
      );
    });
  }
  return fontPromise;
};

/** Holds the render until the typeface is decoded so frame 0 has captions. */
const TypefaceGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("Loading 3D typeface"));

  useEffect(() => {
    let alive = true;
    preloadFont()
      .then(() => {
        if (alive) {
          setReady(true);
        }
        continueRender(handle);
      })
      .catch((error: Error) => cancelRender(error));
    return () => {
      alive = false;
    };
  }, [handle]);

  return ready ? <>{children}</> : null;
};

type SceneProps = {
  quality: Quality;
  settings: (typeof QUALITY_SETTINGS)[Quality];
  impact: number;
  error: number;
  energy: number;
};

const SceneContent: React.FC<SceneProps> = ({
  quality,
  settings,
  impact,
  error,
  energy,
}) => {
  const frame = useCurrentFrame();
  const liveImpact = clamp(impact || impactAt(frame), 0, 1);

  return (
    <>
      <color attach="background" args={[COLORS.bgDeep]} />
      <fog attach="fog" args={[COLORS.bgDeep, 16, 82]} />

      <CameraRig />
      <Lights settings={settings} impact={impact} error={error} energy={energy} />
      <Floor settings={settings} />

      <Suspense fallback={null}>
        <StationProps quality={quality} />
        {STATIONS.map((station) => (
          <Caption3D key={station.id} station={station} />
        ))}
      </Suspense>

      <CubeSwarm count={settings.cubes} energy={energy} />
      <Particles count={settings.particles} />
      <ScreenTear intensity={error} />

      <Post
        settings={settings}
        impact={liveImpact}
        error={error}
        energy={energy}
      />
    </>
  );
};

/**
 * One persistent <ThreeCanvas>. 2D is only used for the HUD and subtitles.
 */
export const Scene: React.FC<{
  quality: Quality;
  impact: number;
  error: number;
  energy: number;
}> = ({ quality, impact, error, energy }) => {
  const settings = QUALITY_SETTINGS[quality];

  const canvas = (
    <ThreeCanvas
      width={VIDEO.width}
      height={VIDEO.height}
      shadows={settings.shadows}
      dpr={settings.dpr}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      camera={{
        position: [0, 2.65, 5.5],
        fov: STATIONS[0].fov,
        near: 0.1,
        far: 160,
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <TypefaceGate>
        <SceneContent
          quality={quality}
          settings={settings}
          impact={impact}
          error={error}
          energy={energy}
        />
      </TypefaceGate>
    </ThreeCanvas>
  );

  return (
    <AbsoluteFill>
      {settings.motionBlurSamples > 1 ? (
        <CameraMotionBlur
          samples={settings.motionBlurSamples}
          shutterAngle={180}
        >
          {canvas}
        </CameraMotionBlur>
      ) : (
        canvas
      )}
    </AbsoluteFill>
  );
};

