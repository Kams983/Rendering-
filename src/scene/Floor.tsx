import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ContactShadows, Grid, MeshReflectorMaterial } from "@react-three/drei";
import { COLORS, type QualitySettings } from "../config";
import { STATIONS } from "./timeline";

/**
 * Cheap stand-in for a real reflection: one vertical gradient over the floor.
 * No render target, no second scene camera — a few hundred bytes of texture.
 */
const FakeGradient: React.FC = () => {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, "rgba(88,166,255,0.26)");
      gradient.addColorStop(0.5, "rgba(88,166,255,0.04)");
      gradient.addColorStop(1, "rgba(255,59,59,0.14)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 2, 256);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, -26]}>
      <planeGeometry args={[36, 120]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

/**
 * The corridor floor is one reflective plane running the length of the code
 * universe. Neon rails and station rings give the dolly a sense of speed.
 */
export const Floor: React.FC<{ settings: QualitySettings }> = ({ settings }) => {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -26]} receiveShadow>
        <planeGeometry args={[36, 120]} />
        {settings.reflector ? (
          <MeshReflectorMaterial
            resolution={512}
            blur={[320, 96]}
            mixBlur={1.1}
            mixStrength={9}
            mirror={0.55}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            roughness={0.92}
            metalness={0.52}
            color="#05070a"
          />
        ) : (
          <meshStandardMaterial
            color="#05070a"
            metalness={0.62}
            roughness={0.34}
          />
        )}
      </mesh>

      {settings.reflector ? null : <FakeGradient />}

      <Grid
        args={[36, 120]}
        position={[0, 0.006, -26]}
        cellSize={1}
        cellThickness={0.55}
        cellColor="#123047"
        sectionSize={4}
        sectionThickness={1.1}
        sectionColor="#1d4f74"
        fadeDistance={78}
        fadeStrength={1.6}
        infiniteGrid={false}
        followCamera={false}
      />

      {[-7.6, 7.6].map((x) =>
        Array.from({ length: 26 }).map((_, index) => (
          <mesh key={`${x}-${index}`} position={[x, 0.035, 7 - index * 2.7]}>
            <boxGeometry args={[0.055, 0.02, 1.5]} />
            <meshStandardMaterial
              color={index % 3 === 0 ? COLORS.red : COLORS.cyan}
              emissive={index % 3 === 0 ? COLORS.red : COLORS.cyan}
              emissiveIntensity={1.6}
              toneMapped={false}
            />
          </mesh>
        )),
      )}

      {STATIONS.map((station) => (
        <mesh
          key={station.id}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.012, station.z]}
        >
          <ringGeometry args={[2.35, 2.42, 96]} />
          <meshStandardMaterial
            color={station.color}
            emissive={station.color}
            emissiveIntensity={1.8}
            toneMapped={false}
          />
        </mesh>
      ))}

      {settings.contactShadows ? (
        <ContactShadows
          position={[0, 0.02, -20]}
          opacity={0.65}
          scale={34}
          blur={2.6}
          far={6}
          resolution={512}
          color="#000000"
        />
      ) : null}
    </>
  );
};
