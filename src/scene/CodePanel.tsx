import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBox, MeshTransmissionMaterial } from "@react-three/drei";
import { useCurrentFrame } from "remotion";
import { QUALITY_SETTINGS, type Quality } from "../config";
import type { CodeSpec } from "./code";
import { drawCodeScreen } from "./drawCode";
import type { Vec3 } from "./timeline";

type CodePanelProps = {
  spec: CodeSpec;
  position: Vec3;
  rotationY?: number;
  width?: number;
  quality: Quality;
  glass?: boolean;
  bezelColor?: string;
};

/**
 * A physical monitor. The screen is a CanvasTexture redrawn every frame:
 * syntax highlighting, a live caret and a typing reveal all come from the
 * frame number, never from a clock.
 */
export const CodePanel: React.FC<CodePanelProps> = ({
  spec,
  position,
  rotationY = 0,
  width = 3.3,
  quality,
  glass = false,
  bezelColor = "#1c2733",
}) => {
  const frame = useCurrentFrame();
  const settings = QUALITY_SETTINGS[quality];
  const height = width * 0.625;

  const canvas = useMemo(() => {
    const element = document.createElement("canvas");
    element.width = 1024;
    element.height = 640;
    return element;
  }, []);

  const texture = useMemo(() => {
    const element = new THREE.CanvasTexture(canvas);
    element.colorSpace = THREE.SRGBColorSpace;
    element.anisotropy = 4;
    return element;
  }, [canvas]);

  useEffect(() => () => texture.dispose(), [texture]);

  // Redraw on every Remotion frame. The canvas lives for the whole render, so
  // this never allocates a new texture per frame.
  drawCodeScreen(canvas, spec, frame);
  texture.needsUpdate = true;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <RoundedBox
        args={[width + 0.16, height + 0.16, 0.12]}
        radius={0.06}
        smoothness={3}
        position={[0, 0, -0.075]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={bezelColor}
          metalness={0.9}
          roughness={0.28}
        />
      </RoundedBox>

      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          map={texture}
          emissiveMap={texture}
          emissive="#ffffff"
          emissiveIntensity={1.15}
          roughness={0.42}
          metalness={0.12}
          toneMapped={false}
        />
      </mesh>

      {glass ? (
        <mesh position={[0, 0, 0.035]}>
          <planeGeometry args={[width + 0.02, height + 0.02]} />
          {glass && settings.transmission && quality === "final" ? (
            <MeshTransmissionMaterial
              transmission={1}
              thickness={0.14}
              roughness={0.06}
              ior={1.35}
              chromaticAberration={0.08}
              anisotropy={0.1}
              distortion={0.12}
              distortionScale={0.3}
              temporalDistortion={0.05}
              samples={4}
              color="#cfe8ff"
              transparent
            />
          ) : (
            // Plain transparent standard material: no transmission pass, which
            // is what a transmission material costs on a CPU rasteriser.
            <meshStandardMaterial
              transparent
              opacity={0.12}
              roughness={0.06}
              metalness={0}
              color="#9fd2ff"
              toneMapped={false}
            />
          )}
        </mesh>
      ) : null}

      <mesh position={[0, -height / 2 - 0.34, -0.1]}>
        <boxGeometry args={[0.42, 0.5, 0.14]} />
        <meshStandardMaterial color="#111821" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0, -height / 2 - 0.62, -0.02]}>
        <boxGeometry args={[1.1, 0.05, 0.6]} />
        <meshStandardMaterial color="#0e151d" metalness={0.85} roughness={0.35} />
      </mesh>
    </group>
  );
};
