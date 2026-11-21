import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame } from "remotion";
import { safe } from "../utils/math";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  uniform float uIntensity;
  uniform float uTime;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    float band = floor(vUv.y * 52.0);
    float tick = floor(uTime * 42.0);
    float n = hash(vec2(band, tick));
    float tear = step(0.74, n) * uIntensity;
    float character = step(0.5, hash(vec2(band, 3.0)));

    vec3 color = mix(vec3(0.35, 0.65, 1.0), vec3(1.0, 0.23, 0.23), character);

    float scan = step(0.9965, hash(vec2(floor(vUv.y * 240.0), floor(uTime * 60.0))));
    float alpha = tear * 0.2 + scan * 0.03 * uIntensity;

    // Hard cut the bands so they read as digital tearing, not a gradient.
    float edge = step(0.5, fract(vUv.x * 3.0 + n));
    alpha *= mix(0.4, 1.0, edge);

    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * A screen-space tear that lives 0.55 units in front of the camera. It uses a
 * raw ShaderMaterial (three-custom-shader-material is not required for an
 * overlay pass) and only fires while errorPulse is non-zero.
 */
export const ScreenTear: React.FC<{ intensity: number }> = ({ intensity }) => {
  const frame = useCurrentFrame();
  const mesh = useRef<THREE.Mesh>(null);
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);

  const uniforms = useMemo(
    () => ({
      uIntensity: { value: 0 },
      uTime: { value: 0 },
    }),
    [],
  );

  const height =
    2 * 0.55 * Math.tan((camera.fov * Math.PI) / 360) * 1.35;
  const width = height * (size.width / Math.max(1, size.height));

  useLayoutEffect(() => {
    uniforms.uIntensity.value = safe(intensity, 0, 0, 0.35);
    uniforms.uTime.value = frame / 60;
    const object = mesh.current;
    if (!object) {
      return;
    }
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    object.position.copy(camera.position).addScaledVector(direction, 0.55);
    object.quaternion.copy(camera.quaternion);
    object.visible = uniforms.uIntensity.value > 0.01;
  }, [camera, frame, intensity, uniforms]);

  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={999}>
      <planeGeometry args={[width * 1.3, height * 1.3]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};
