import React from "react";
import { AbsoluteFill, Composition } from "remotion";
import {
  DURATION_IN_FRAMES,
  FPS,
  QUALITY_SETTINGS,
  QUALITY_PRESETS,
  resolveQuality,
} from "./config";
import { HowChatGPTWorks } from "./Video";
import type { VideoProps } from "./Video";
import { Sfx } from "./Sfx";

const SfxOnly: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000000" }}>
    <Sfx />
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HowChatGPTWorks"
        component={HowChatGPTWorks}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={QUALITY_SETTINGS.width}
        height={QUALITY_SETTINGS.height}
        defaultProps={{ quality: "final" } satisfies VideoProps}
        calculateMetadata={({ props }) => {
          const preset = QUALITY_PRESETS[resolveQuality(props.quality)];
          return {
            durationInFrames: DURATION_IN_FRAMES,
            fps: FPS,
            width: preset.width,
            height: preset.height,
          };
        }}
      />
      <Composition
        id="HowChatGPTSfx"
        component={SfxOnly}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={720}
        height={1280}
      />
    </>
  );
};
