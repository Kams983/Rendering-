import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useCurrentFrame } from "remotion";
import { COLORS, PACE, frames60 } from "../config";
import { CUE_FRAMES, ERROR_CUES } from "../sfx/cues";
import { errorPulseAt, impactAt } from "../sfx/useSfxImpact";
import { mulberry32 } from "../utils/seeded";

const dummy = new THREE.Object3D();
const scratch = new THREE.Color();
const baseCyan = new THREE.Color(COLORS.cyan);
const baseDeep = new THREE.Color("#1f6feb");
const basePurple = new THREE.Color(COLORS.purple);
const red = new THREE.Color(COLORS.red);
const green = new THREE.Color(COLORS.green);
const FIX_FRAME = CUE_FRAMES.payoffStart;

type Cube = {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  phase: number;
  speed: number;
  size: number;
  tone: number;
};

/**
 * The persistent swarm. Cubes orbit the corridor, explode outward on every
 * error cue, then spring back. The payoff recolors the swarm green.
 */
export const CubeSwarm: React.FC<{
  count: number;
  energy: number;
}> = ({ count, energy }) => {
  const frame = useCurrentFrame();
  const ref = useRef<THREE.InstancedMesh>(null);

  const cubes = useMemo<Cube[]>(() => {
    return Array.from({ length: count }, (_, index) => {
      const random = mulberry32(9001 + index * 131);
      const z = 7 - random() * 72;
      const angle = random() * Math.PI * 2;
      const radius = 3.1 + random() * 5.8;
      return {
        position: new THREE.Vector3(
          Math.cos(angle) * radius * (0.72 + random() * 0.5),
          0.4 + random() * 5.2,
          z,
        ),
        direction: new THREE.Vector3(
          Math.cos(angle),
          (random() - 0.35) * 1.3,
          Math.sin(angle) * 0.8,
        ).normalize(),
        phase: random() * Math.PI * 2,
        speed: 0.14 + random() * 0.55,
        size: 0.035 + random() * 0.13,
        tone: random(),
      };
    });
  }, [count]);

  const burst = Math.max(
    0,
    ...ERROR_CUES.map((cue) => {
      const age = frame - cue.frame;
      if (age < 0) {
        return 0;
      }
      return (cue.weight ?? 0.5) * Math.exp(-age / frames60(17));
    }),
  );

  const error = errorPulseAt(frame);
  const impact = impactAt(frame);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) {
      return;
    }

    const fixed = frame >= FIX_FRAME;

    cubes.forEach((cube, index) => {
      const sway = Math.sin(frame * 0.018 * PACE * cube.speed + cube.phase);
      const lift = Math.cos(
        frame * 0.013 * PACE * cube.speed + cube.phase * 1.7,
      );
      const explode = burst * (2.4 + cube.tone * 2.4);

      dummy.position.set(
        cube.position.x + sway * 0.24 + cube.direction.x * explode,
        cube.position.y + lift * 0.16 + cube.direction.y * explode,
        cube.position.z + Math.sin(frame * 0.01 * PACE + cube.phase) * 0.2 +
          cube.direction.z * explode,
      );
      dummy.rotation.set(
        frame * 0.012 * PACE * cube.speed + cube.phase,
        frame * 0.016 * PACE * cube.speed + cube.phase * 0.5,
        frame * 0.009 * PACE * cube.speed,
      );
      dummy.scale.setScalar(
        cube.size * (1 + energy * 0.35 + impact * 0.3 + burst * 0.5),
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);

      if (fixed) {
        scratch.copy(green);
      } else if (error > 0.12) {
        scratch.copy(red);
      } else if (cube.tone < 0.45) {
        scratch.copy(baseCyan);
      } else if (cube.tone < 0.8) {
        scratch.copy(baseDeep);
      } else {
        scratch.copy(basePurple);
      }
      mesh.setColorAt(index, scratch);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [frame, cubes, burst, error, impact, energy]);

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, count]}
      frustumCulled={false}
      castShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#ffffff"
        metalness={0.85}
        roughness={0.28}
        emissive="#0a2436"
        emissiveIntensity={0.6}
      />
    </instancedMesh>
  );
};
