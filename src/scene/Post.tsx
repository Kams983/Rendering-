import React, { useLayoutEffect, useRef, useState } from "react";
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
import { useThree } from "@react-three/fiber";
import { continueRender, delayRender, useCurrentFrame } from "remotion";
import type { QualitySettings } from "../config";
import { postParamsAt } from "./postParams";

type PostProps = {
  settings: QualitySettings;
  impact: number;
  error: number;
  energy: number;
};

/**
 * N8AO, animated depth of field, bloom, chromatic aberration, error-only
 * glitch, film noise and vignette. SMAA runs last.
 *
 * Every value that reaches a pass is clamped to a finite range in
 * postParamsAt(): a single NaN (impact, focus distance, FOV) blanks the whole
 * effect chain, which renders as a black frame.
 */
export const Post: React.FC<PostProps> = ({
  settings,
  impact,
  error,
  energy,
}) => {
  const frame = useCurrentFrame();
  const p = postParamsAt(frame, impact, error, energy);

  // <ThreeCanvas> installs the render size in a layout effect, after the
  // composer's first render. Building the chain before that creates 0x0 render
  // targets and every pass outputs black, so wait for a real viewport and
  // rebuild whenever it changes.
  const size = useThree((state) => state.size);
  const ready = size.width > 0 && size.height > 0;
  const advance = useThree((state) => state.advance);
  // The composer builds its pass chain in an effect, so the first advance of a
  // page happens with an empty chain: the render pass still clears and the
  // canvas stays black. Hold the capture until the chain exists and has drawn
  // once. This runs once per page (and per resize), never twice per
  // composition frame.
  const [handle] = useState(() => delayRender("Waiting for the post chain"));
  const gate = useRef({ handled: false, handle });

  const glitch = settings.post.glitch && p.glitchActive;

  if (!ready) {
    return null;
  }

  return (
    <EffectComposer
      key={`${size.width}x${size.height}`}
      multisampling={0}
      enableNormalPass={settings.post.ao}
      resolutionScale={1}
    >
      <PostChainReady advance={advance} gate={gate} />

      {settings.post.ao ? (
        <N8AO
          aoRadius={p.aoRadius}
          intensity={p.aoIntensity}
          distanceFalloff={p.aoFalloff}
          quality="performance"
          halfRes
        />
      ) : null}

      {settings.post.dof ? (
        <DepthOfField
          worldFocusDistance={p.focus}
          worldFocusRange={p.focusRange}
          bokehScale={p.bokeh}
        />
      ) : null}

      {settings.post.bloom ? (
        <Bloom
          intensity={p.bloomIntensity}
          luminanceThreshold={p.bloomThreshold}
          luminanceSmoothing={p.bloomSmoothing}
          mipmapBlur
          radius={p.bloomRadius}
        />
      ) : null}

      {settings.post.chromatic ? (
        <ChromaticAberration
          offset={new THREE.Vector2(p.caX, p.caY)}
          radialModulation={false}
          modulationOffset={0}
        />
      ) : null}

      {glitch ? (
        <Glitch
          active
          // SPORADIC can hold the screen on a full-slice displacement for a
          // frame. CONSTANT_MILD keeps the tear readable and never blanks.
          mode={GlitchMode.CONSTANT_MILD}
          strength={new THREE.Vector2(p.glitchX, p.glitchY)}
          duration={new THREE.Vector2(0.12, 0.3)}
          delay={new THREE.Vector2(0.5, 1.4)}
        />
      ) : null}

      {settings.post.noise ? <Noise opacity={p.noiseOpacity} /> : null}
      {settings.post.vignette ? (
        <Vignette
          eskil={false}
          offset={p.vignetteOffset}
          darkness={p.vignetteDarkness}
        />
      ) : null}
      {settings.post.smaa ? <SMAA /> : null}
    </EffectComposer>
  );
};

/**
 * Renders nothing, but mounts only after the composer's pass chain is built
 * (the composer renders no children until then). It draws the current frame
 * through the chain and only then releases the capture gate, so a captured
 * frame always has its effects.
 */
const PostChainReady: React.FC<{
  advance: (timestamp: number) => void;
  gate: React.RefObject<{ handled: boolean; handle: number }>;
}> = ({ advance, gate }) => {
  useLayoutEffect(() => {
    const state = gate.current;
    if (!state || state.handled) {
      return undefined;
    }
    state.handled = true;
    let done = false;
    const finish = (): void => {
      if (done) {
        return;
      }
      done = true;
      advance(performance.now());
      continueRender(state.handle);
    };
    // One animation frame later the composer's pass chain is fully built, so
    // the frame that gets captured already has bloom/DOF/CA applied.
    const raf = requestAnimationFrame(finish);
    return () => {
      cancelAnimationFrame(raf);
      if (!done) {
        done = true;
        continueRender(state.handle);
      }
    };
  }, [advance, gate]);

  return null;
};
