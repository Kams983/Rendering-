import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { VOICE_CLIPS } from "./voiceCues";

/**
 * Voice is the priority track at full volume. Each clip starts at
 * (scene start - measured leading silence), so the first spoken word lands on
 * the scene's first frame. Missing files are caught by VoiceTimingProvider and
 * fail the render with the file name.
 */
export const VoiceTrack: React.FC = () => {
  return (
    <>
      {VOICE_CLIPS.map((clip) => (
        <Sequence
          key={clip.id}
          from={clip.audioStartFrame}
          name={`VO ${clip.id}`}
        >
          <Audio src={staticFile(clip.file)} volume={1} />
        </Sequence>
      ))}
    </>
  );
};
