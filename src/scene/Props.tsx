import React from "react";
import { Center, RoundedBox, Text3D } from "@react-three/drei";
import { staticFile, useCurrentFrame } from "remotion";
import { ASSETS, COLORS, type Quality } from "../config";
import { CODE } from "./code";
import { CodePanel } from "./CodePanel";
import { Keyboard } from "./Keyboard";
import { Timer } from "./Timer";
import { Magnifier } from "./Magnifier";
import { Checkmark } from "./Checkmark";
import { STATIONS, type Vec3 } from "./timeline";

type Label3DProps = {
  text: string;
  position: Vec3;
  size?: number;
  color?: string;
  rotationY?: number;
};

const Label3D: React.FC<Label3DProps> = ({
  text,
  position,
  size = 0.16,
  color = COLORS.cyan,
  rotationY = 0,
}) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <Center>
      <Text3D
        font={staticFile(ASSETS.font3d)}
        size={size}
        height={0.014}
        bevelEnabled
        bevelThickness={0.004}
        bevelSize={0.003}
        bevelSegments={2}
        curveSegments={4}
        letterSpacing={0.04}
      >
        {text}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.4}
          metalness={0.85}
          roughness={0.25}
          toneMapped={false}
        />
      </Text3D>
    </Center>
  </group>
);

const Desk: React.FC = () => (
  <group>
    <RoundedBox
      args={[4.3, 0.1, 1.95]}
      radius={0.04}
      smoothness={2}
      position={[0, 0.79, 0.95]}
      receiveShadow
      castShadow
    >
      <meshStandardMaterial color="#131a22" metalness={0.7} roughness={0.4} />
    </RoundedBox>
    {[-1.9, 1.9].map((x) => (
      <mesh key={x} position={[x, 0.37, 0.95]} castShadow>
        <boxGeometry args={[0.1, 0.74, 0.7]} />
        <meshStandardMaterial color="#0d1319" metalness={0.8} roughness={0.35} />
      </mesh>
    ))}
  </group>
);

const ErrorChips: React.FC<{ frame: number }> = ({ frame }) => {
  const chips: Array<{ position: Vec3; size: number; label: string }> = [
    { position: [-2.05, 1.85, -7.3], size: 0.42, label: "ERR" },
    { position: [2.0, 1.62, -7.25], size: 0.32, label: "404" },
    { position: [-1.55, 2.16, -7.5], size: 0.24, label: "!" },
  ];
  return (
    <>
      {chips.map((chip, index) => (
        <group
          key={chip.label}
          position={[
            chip.position[0],
            chip.position[1] + Math.sin(frame * 0.035 + index * 2) * 0.08,
            chip.position[2],
          ]}
          rotation={[0.1, -0.35 + index * 0.2, Math.sin(frame * 0.02 + index) * 0.08]}
        >
          <RoundedBox
            args={[chip.size * 2.4, chip.size, 0.05]}
            radius={0.03}
            smoothness={2}
          >
            <meshStandardMaterial
              color="#2a0d12"
              emissive={COLORS.red}
              emissiveIntensity={1.5}
              metalness={0.6}
              roughness={0.3}
              toneMapped={false}
            />
          </RoundedBox>
          <Label3D
            text={chip.label}
            position={[0, 0, 0.045]}
            size={chip.size * 0.45}
            color="#ffd7d7"
          />
        </group>
      ))}
    </>
  );
};

const OneThing: React.FC<{ frame: number }> = ({ frame }) => {
  const active = 2;
  return (
    <group position={[0, 1.32, -16]}>
      {[0, 1, 2, 3, 4].map((index) => {
        const isActive = index === active;
        const x = (index - 2) * 1.15;
        const y = isActive ? 0.22 + Math.sin(frame * 0.06) * 0.04 : 0;
        return (
          <group
            key={index}
            position={[x, y, isActive ? 0.35 : 0]}
            rotation={[0, (index - 2) * -0.08, 0]}
          >
            <RoundedBox
              args={[0.98, 0.98, 0.09]}
              radius={0.09}
              smoothness={3}
              castShadow
            >
              <meshStandardMaterial
                color={isActive ? "#0f2a17" : "#101720"}
                emissive={isActive ? COLORS.green : "#1b2a38"}
                emissiveIntensity={isActive ? 0.9 : 0.18}
                metalness={0.55}
                roughness={0.3}
                transparent
                opacity={isActive ? 1 : 0.72}
              />
            </RoundedBox>
            <Label3D
              text={String(index + 1)}
              position={[0, 0, 0.07]}
              size={0.42}
              color={isActive ? COLORS.green : "#3d5568"}
            />
            {!isActive ? (
              <mesh position={[0, 0, 0.075]}>
                <planeGeometry args={[0.86, 0.02]} />
                <meshBasicMaterial color={COLORS.red} transparent opacity={0.6} />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </group>
  );
};

const CopyStack: React.FC = () => (
  <group position={[0, 1.2, -24.35]}>
    {[0, 1, 2].map((index) => (
      <RoundedBox
        key={index}
        args={[3.5, 2.2, 0.06]}
        radius={0.05}
        smoothness={2}
        position={[index * 0.08 - 0.08, index * 0.06 - 0.06, -0.16 - index * 0.14]}
      >
        <meshStandardMaterial
          color="#0d151d"
          metalness={0.7}
          roughness={0.32}
          transparent
          opacity={0.55}
        />
      </RoundedBox>
    ))}
  </group>
);

const HelpBeacon: React.FC<{ frame: number }> = ({ frame }) => {
  const spin = frame * 0.02;
  return (
    <group>
      {[
        { text: "ASK", position: [-1.85, 1.82, -39.4] as Vec3, size: 0.18 },
        { text: "SEARCH", position: [0, 2.08, -39.25] as Vec3, size: 0.2 },
        { text: "LEARN", position: [1.85, 1.82, -39.4] as Vec3, size: 0.18 },
      ].map((label) => (
        <Label3D
          key={label.text}
          text={label.text}
          position={label.position}
          size={label.size}
          color={label.text === "ASK" ? COLORS.green : COLORS.cyan}
        />
      ))}

      <group position={[2.15, 1.15, -40.4]} rotation={[0.1, spin, 0]}>
        <mesh>
          <torusGeometry args={[0.62, 0.014, 8, 64]} />
          <meshStandardMaterial
            color={COLORS.cyan}
            emissive={COLORS.cyan}
            emissiveIntensity={2}
            toneMapped={false}
          />
        </mesh>
        {Array.from({ length: 12 }).map((_, index) => {
          const angle = (index / 12) * Math.PI * 2;
          return (
            <mesh
              key={index}
              position={[Math.cos(angle) * 0.74, Math.sin(angle) * 0.74, 0]}
              rotation={[0, 0, angle]}
            >
              <boxGeometry args={[0.035, 0.11, 0.02]} />
              <meshBasicMaterial
                color={index % 3 === 0 ? COLORS.red : COLORS.cyan}
                toneMapped={false}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

/**
 * All eight locations exist at once in the persistent world. The camera is the
 * only thing that moves between them.
 */
export const StationProps: React.FC<{ quality: Quality }> = ({ quality }) => {
  const frame = useCurrentFrame();
  const [hook, errors, , , , , ,] = STATIONS;

  return (
    <>
      {/* Station 0: the hook desk */}
      <group position={[hook.camera[0] * 0, 0, 0]}>
        <Desk />
        <CodePanel
          spec={CODE.hook}
          position={[0, 1.55, -0.35]}
          width={3.5}
          quality={quality}
          glass
        />
        <mesh position={[0, 0.55, -0.35]} castShadow>
          <boxGeometry args={[0.34, 0.42, 0.28]} />
          <meshStandardMaterial color="#121a22" metalness={0.85} roughness={0.32} />
        </mesh>
        <Keyboard position={[0, -0.045, 1.0]} />
        <Timer position={[0, 4.9, -0.55]} />
      </group>

      {/* Station 1: read the error */}
      <group>
        <CodePanel
          spec={CODE.errors}
          position={[0, 1.22, errors.z]}
          width={3.45}
          quality={quality}
        />
        <ErrorChips frame={frame} />
      </group>

      {/* Station 2: change one thing */}
      <OneThing frame={frame} />

      {/* Station 3: don't just copy */}
      <group>
        <CopyStack />
        <CodePanel
          spec={CODE.copy}
          position={[0, 1.22, -24]}
          width={3.5}
          quality={quality}
        />
      </group>

      {/* Station 4: check the basics */}
      <group>
        <CodePanel
          spec={CODE.typo}
          position={[0, 1.18, -32]}
          width={3.3}
          quality={quality}
        />
        <Magnifier />
      </group>

      {/* Station 5: ask, search, learn */}
      <group>
        <CodePanel
          spec={CODE.help}
          position={[0, 1.2, -40.2]}
          width={3.4}
          quality={quality}
        />
        <HelpBeacon frame={frame} />
      </group>

      {/* Station 7: the fix */}
      <Checkmark />
    </>
  );
};
