import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useCurrentFrame } from "remotion";
import { COLORS, FPS } from "../config";
import { CUES } from "../sfx/cues";
import { clamp01 } from "../utils/math";
import { itemRandom, mulberry32 } from "../utils/seeded";
import { stationForFrame } from "./timeline";

const LIFE = 56;

type Burst = {
  frame: number;
  origin: THREE.Vector3;
  color: THREE.Color;
  power: number;
};

const BURSTS: Burst[] = CUES.filter((cue) => typeof cue.weight === "number").map(
  (cue) => {
    const station = stationForFrame(cue.frame);
    return {
      frame: cue.frame,
      origin: new THREE.Vector3(0, 1.55, station.z + 0.6),
      color: new THREE.Color(
        cue.trigger === "error"
          ? COLORS.red
          : cue.trigger === "bass" || cue.trigger === "slam"
            ? station.color
            : COLORS.cyan,
      ),
      power: cue.weight ?? 0.5,
    };
  },
);

const dummy = new THREE.Object3D();
const scratch = new THREE.Color();

/**
 * 2,500 (final) or 800 (preview) instanced cubes. Ballistic motion is stepped
 * per frame from a seeded direction and a fixed gravity constant, so every
 * render is identical. No physics engine, no clock.
 */
export const Particles: React.FC<{ count: number }> = ({ count }) => {
  const frame = useCurrentFrame();
  const ref = useRef<THREE.InstancedMesh>(null);

  const layout = useMemo(() => {
    const perBurst = Math.max(1, Math.floor(count / Math.max(1, BURSTS.length)));
    return {
      perBurst,
      dust: Math.floor(count * 0.12),
    };
  }, [count]);

  const dustLayout = useMemo(() => {
    const random = mulberry32(424242);
    return Array.from({ length: layout.dust }, () => ({
      x: (random() - 0.5) * 13,
      y: 0.6 + random() * 4.6,
      z: 8 - random() * 70,
      phase: random() * Math.PI * 2,
      speed: 0.25 + random() * 0.6,
      size: 0.012 + random() * 0.025,
    }));
  }, [layout.dust]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) {
      return;
    }

    for (let i = 0; i < count; i += 1) {
      const burstIndex = Math.floor(i / layout.perBurst);
      const burst = BURSTS[burstIndex];
      if (!burst) {
        dummy.position.set(0, -50, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, scratch.setRGB(0, 0, 0));
        continue;
      }

      const local = i % layout.perBurst;
      const age = frame - burst.frame;
      if (age < 0 || age > LIFE) {
        dummy.position.set(0, -50, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, scratch.copy(burst.color));
        continue;
      }

      const seed = burstIndex * 7919 + local;
      const dx = itemRandom("spark", seed, 1) * 2 - 1;
      const dy = itemRandom("spark", seed, 2) * 2 - 0.4;
      const dz = itemRandom("spark", seed, 3) * 2 - 1;
      const direction = new THREE.Vector3(dx, dy, dz).normalize();
      const speed =
        (2.2 + itemRandom("spark", seed, 4) * 5.5) * (0.55 + burst.power);
      const t = age / FPS;
      const life = clamp01(1 - age / LIFE);

      dummy.position.set(
        burst.origin.x + direction.x * speed * t,
        burst.origin.y + direction.y * speed * t - 4.9 * t * t,
        burst.origin.z + direction.z * speed * t,
      );
      const size = (0.02 + itemRandom("spark", seed, 5) * 0.055) * life;
      dummy.scale.setScalar(Math.max(0.0001, size));
      dummy.rotation.set(
        itemRandom("spark", seed, 6) * 6,
        itemRandom("spark", seed, 7) * 6,
        itemRandom("spark", seed, 8) * 6,
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const heat = 0.65 + life * 0.55;
      mesh.setColorAt(i, scratch.copy(burst.color).multiplyScalar(heat));
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [frame, count, layout.perBurst]);

  return (
    <>
      <instancedMesh
        ref={ref}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      <Dust frame={frame} items={dustLayout} />
    </>
  );
};

const Dust: React.FC<{
  frame: number;
  items: Array<{ x: number; y: number; z: number; phase: number; speed: number; size: number }>;
}> = ({ frame, items }) => {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) {
      return;
    }
    items.forEach((item, index) => {
      dummy.position.set(
        item.x + Math.sin(frame * 0.012 * item.speed + item.phase) * 0.5,
        item.y + Math.sin(frame * 0.009 + item.phase) * 0.35,
        item.z,
      );
      dummy.rotation.set(frame * 0.01, frame * 0.013, item.phase);
      dummy.scale.setScalar(item.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [frame, items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, items.length]}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={COLORS.cyan} transparent opacity={0.35} toneMapped={false} />
    </instancedMesh>
  );
};

