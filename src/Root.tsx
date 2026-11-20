import React from "react";
import { Composition } from "remotion";
import { QUALITY, VIDEO } from "./config";
import { World } from "./World";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id={VIDEO.id}
      component={World}
      durationInFrames={VIDEO.durationInFrames}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      defaultProps={{ quality: QUALITY }}
    />
  );
};
