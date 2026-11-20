import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { VOICE_CLIPS } from "./voiceCues";

/**
 * Voice is the priority track at full volume. Missing files are caught by
 * VoiceTimingProvider and fail the render with the file name.
 */
export const VoiceTrack: React.FC = () => {
  return (
    <>
      {VOICE_CLIPS.map((clip) => (
        <Sequence key={clip.id} from={clip.startFrame} name={`VO ${clip.id}`}>
          <Audio src={staticFile(`voice/${clip.file}`)} volume={1} />
        </Sequence>
      ))}
    </>
  );
};
