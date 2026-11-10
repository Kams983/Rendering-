import React from "react";
import { Composition } from "remotion";
import { NewYorkHistory } from "./NewYorkHistory";
import { DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH } from "./constants";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="NewYorkHistory"
      component={NewYorkHistory}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
