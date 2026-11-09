import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame, Sequence} from 'remotion';

const scene = (img: string, title: string, subtitle: string, start: number, duration: number) => (
  <Sequence from={start} durationInFrames={duration}>
    <AbsoluteFill style={{backgroundColor:'#000', color:'#fff', fontFamily:'Arial, sans-serif'}}>
      <Img src={staticFile(img)} style={{width:'100%',height:'100%',objectFit:'cover',position:'absolute'}} />
      <div style={{position:'absolute',left:70,top:120,fontSize:58,fontWeight:700,letterSpacing:2,lineHeight:1.05}}>
        {title}
      </div>
      <div style={{position:'absolute',left:72,bottom:180,fontSize:28,letterSpacing:4,opacity:.75}}>
        {subtitle}
      </div>
    </AbsoluteFill>
  </Sequence>
);

export const Video: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame,[0,15],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  return (
    <AbsoluteFill style={{backgroundColor:'#000', opacity:fade}}>
      {scene('3d-render/scene_01.png','WHAT IF EARTH','ROTATION STOPS',0,180)}
      {scene('3d-render/scene_02.png','EVERYTHING KEEPS MOVING','GROUND • AIR • MOTION',180,210)}
      {scene('3d-render/scene_03.png','THE ATMOSPHERE.\nTHE OCEANS.','EVERYTHING',390,270)}
      {scene('3d-render/scene_04.png','THEN...\nEARTH STARTS AGAIN.','ONE SECOND',660,240)}
      <Audio src={staticFile('sfx/dark-ambient.wav')} volume={0.08} loop />
      <Audio src={staticFile('sfx/deep-impact.wav')} startFrom={0} volume={0.45} />
      <Audio src={staticFile('sfx/whoosh.wav')} startFrom={180} volume={0.22} />
      <Audio src={staticFile('sfx/whoosh.wav')} startFrom={390} volume={0.22} />
      <Audio src={staticFile('sfx/deep-impact.wav')} startFrom={660} volume={0.35} />
    </AbsoluteFill>
  );
};
