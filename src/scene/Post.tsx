import React from "react";
import * as THREE from "three";
import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  Glitch,
  N8AO,
  Noise,
  SMAA,
  Vignette,
} from "@react-three/postprocessing";
import { GlitchMode } from "postprocessing";
import { useCurrentFrame } from "remotion";
import type { QualitySettings } from "../config";
import { stationForFrame } from "./timeline";

type PostProps = {
  settings: QualitySettings;
  impact: number;
  error: number;
  energy: number;
};

/**
 * N8AO, animated depth of field, bloom, chromatic aberration, error-only
 * glitch, film noise and vignette. SMAA runs last.
 */
export const Post: React.FC<PostProps> = ({
  settings,
  impact,
  error,
  energy,
}) => {
  const blur = settings.post.glitch && error > 0.08;
  const frame = useCurrentFrame();

  // Animated focus pull: the lens tracks the hero prop of the active station
  // and pulls slightly closer on every impact.
  const station = stationForFrame(frame);
  const focus = Math.max(
    1.4,
    Math.hypot(
      station.camera[0] - station.caption[0],
      station.camera[1] - station.caption[1],
      station.camera[2] - station.caption[2],
    ) - impact * 0.6,
  );

  return (
    <EffectComposer
      multisampling={0}
      enableNormalPass={settings.post.ao}
      resolutionScale={1}
    >
      {settings.post.ao ? (
        <N8AO
          aoRadius={1.4}
          intensity={1.35}
          distanceFalloff={1.2}
          quality="performance"
          halfRes
        />
      ) : null}

      {settings.post.dof ? (
        <DepthOfField
          worldFocusDistance={focus}
          worldFocusRange={4.2 + impact * 2}
          bokehScale={2.2 + impact * 2.4}
        />
      ) : null}

      {settings.post.bloom ? (
        <Bloom
          intensity={1.15 + impact * 2.4 + energy * 0.35}
          luminanceThreshold={0.22}
          luminanceSmoothing={0.28}
          mipmapBlur
          radius={0.72}
        />
      ) : null}

      {settings.post.chromatic ? (
        <ChromaticAberration
          offset={
            new THREE.Vector2(
              0.0007 + impact * 0.0045 + error * 0.002,
              0.0004 + impact * 0.002,
            )
          }
          radialModulation={false}
          modulationOffset={0}
        />
      ) : null}

      {blur ? (
        <Glitch
          active
          mode={GlitchMode.SPORADIC}
          strength={new THREE.Vector2(0.01 + error * 0.03, 0.02 + error * 0.12)}
          duration={new THREE.Vector2(0.08, 0.28)}
          delay={new THREE.Vector2(0.4, 1.2)}
        />
      ) : null}

      {settings.post.noise ? <Noise opacity={0.045} /> : null}
      {settings.post.vignette ? (
        <Vignette eskil={false} offset={0.2} darkness={0.82} />
      ) : null}
      {settings.post.smaa ? <SMAA /> : null}
    </EffectComposer>
  );
};
