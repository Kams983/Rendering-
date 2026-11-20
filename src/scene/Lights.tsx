import React from "react";
import { Environment, Lightformer, SpotLight } from "@react-three/drei";
import { COLORS, type QualitySettings } from "../config";

type LightsProps = {
  settings: QualitySettings;
  impact: number;
  error: number;
  energy: number;
};

/**
 * A procedural environment (no network HDRI): a dark room made of
 * Lightformer softboxes. Point lights flash with the cue impacts.
 */
export const Lights: React.FC<LightsProps> = ({
  settings,
  impact,
  error,
  energy,
}) => {
  return (
    <>
      <ambientLight intensity={0.35} color="#a9c4dd" />
      <hemisphereLight intensity={0.4} color="#9fc6ff" groundColor="#05070a" />

      <directionalLight
        position={[5, 9, 6]}
        intensity={1.9}
        color="#e8f2ff"
        castShadow={settings.shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.00025}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={14}
        shadow-camera-bottom={-8}
        shadow-camera-near={1}
        shadow-camera-far={40}
      />

      <pointLight
        position={[0, 3.4, 4.4]}
        color={COLORS.cyan}
        intensity={18 + impact * 55 + energy * 16}
        distance={26}
        decay={2}
      />
      <pointLight
        position={[1.5, 3.2, -20]}
        color={COLORS.red}
        intensity={8 + error * 65}
        distance={22}
        decay={2}
      />
      <pointLight
        position={[-1.5, 3.4, -44]}
        color={COLORS.green}
        intensity={10 + energy * 22}
        distance={26}
        decay={2}
      />
      <pointLight
        position={[0, 4.8, -9]}
        color={COLORS.cyan}
        intensity={6 + impact * 18}
        distance={18}
        decay={2}
      />

      <SpotLight
        position={[0, 7.2, 4]}
        angle={0.42}
        attenuation={8}
        anglePower={5}
        intensity={2.4}
        distance={16}
        color={COLORS.cyan}
        opacity={0.32}
      />
      <SpotLight
        position={[0, 7.4, -48]}
        angle={0.5}
        attenuation={10}
        anglePower={4}
        intensity={2}
        distance={18}
        color={COLORS.green}
        opacity={0.28}
      />

      <Environment resolution={settings.shadows ? 384 : 256} frames={1}>
        <Lightformer
          form="rect"
          intensity={2.6}
          color="#dbeafe"
          scale={[14, 5, 1]}
          position={[0, 8, -18]}
          rotation={[Math.PI / 2, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={2.2}
          color={COLORS.cyan}
          scale={[8, 8, 1]}
          position={[-9, 4, 0]}
          rotation={[0, Math.PI / 2, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.7}
          color={COLORS.red}
          scale={[8, 6, 1]}
          position={[9, 4, -24]}
          rotation={[0, -Math.PI / 2, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.5}
          color={COLORS.green}
          scale={[7, 5, 1]}
          position={[0, 3, -62]}
        />
        <Lightformer
          form="circle"
          intensity={1.2}
          color="#ffffff"
          scale={3}
          position={[0, 6, 5]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      </Environment>
    </>
  );
};
