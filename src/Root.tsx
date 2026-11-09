import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';

export const Root: React.FC = () => (
  <Composition
    id="EarthStop"
    component={Video}
    durationInFrames={900}
    fps={30}
    width={1080}
    height={1920}
  />
);
