import React from "react";
import { Composition } from "remotion";
import { YouAreNotBehind } from "./Video";
import { DURATION_FRAMES, FPS, HEIGHT, WIDTH } from "./config";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="YouAreNotBehind"
      component={YouAreNotBehind}
      durationInFrames={DURATION_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
