import React from "react";
import { AbsoluteFill } from "remotion";
import { Scene3D } from "./Scene3D";
import { Overlays } from "./Overlays";
import { Sfx } from "./Sfx";
import { COLORS } from "./config";

export const YouAreNotBehind: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <Scene3D />
      <Overlays />
      <Sfx />
    </AbsoluteFill>
  );
};
