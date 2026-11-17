import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS } from "./config";
import type { Quality } from "./config";
import { Scene3D } from "./Scene3D";
import { Overlays } from "./Overlays";
import { Sfx } from "./Sfx";

export type VideoProps = {
  quality: Quality;
};

export const WhyYouCantStopScrolling: React.FC<VideoProps> = ({
  quality = "final",
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <Scene3D quality={quality} />
      <Overlays />
      <Sfx />
    </AbsoluteFill>
  );
};
