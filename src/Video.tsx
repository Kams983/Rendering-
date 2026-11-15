import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, resolveQuality } from "./config";
import type { Quality } from "./config";
import { Scene3D } from "./Scene3D";
import { Overlays } from "./Overlays";
import { Sfx } from "./Sfx";

export type VideoProps = {
  quality: Quality;
};

export const HowChatGPTWorks: React.FC<VideoProps> = ({ quality }) => {
  const tier = resolveQuality(quality);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <Scene3D quality={tier} />
      <Overlays />
      <Sfx />
    </AbsoluteFill>
  );
};
