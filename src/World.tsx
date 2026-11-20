import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, QUALITY, SHOW_SUBTITLES, type Quality } from "./config";
import { FontGate } from "./fonts";
import { HUD } from "./hud/HUD";
import { Scene } from "./scene/Scene";
import { SfxTrack } from "./sfx/SfxTrack";
import { useErrorPulse, useSfxImpact } from "./sfx/useSfxImpact";
import { Subtitles } from "./voice/Subtitles";
import { useVoiceEnergy } from "./voice/useVoiceEnergy";
import { VoiceTimingProvider } from "./voice/VoiceTiming";
import { VoiceTrack } from "./voice/VoiceTrack";

export type WorldProps = {
  quality?: Quality;
};

const WorldContent: React.FC<{ quality: Quality }> = ({ quality }) => {
  const impact = useSfxImpact();
  const error = useErrorPulse();
  const energy = useVoiceEnergy();

  return (
    <>
      <VoiceTrack />
      <SfxTrack />
      <Scene quality={quality} impact={impact} error={error} energy={energy} />
      <HUD />
      {SHOW_SUBTITLES ? <Subtitles /> : null}
    </>
  );
};

/**
 * One persistent 3D world, one camera, no cuts. 2D only for HUD + subtitles.
 */
export const World: React.FC<WorldProps> = ({ quality = QUALITY }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgDeep }}>
      <VoiceTimingProvider>
        <FontGate>
          <WorldContent quality={quality} />
        </FontGate>
      </VoiceTimingProvider>
    </AbsoluteFill>
  );
};
