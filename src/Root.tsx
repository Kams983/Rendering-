import React from 'react';
import {Composition} from 'remotion';
import {Main, TOTAL} from './Main';
import {Video} from './Video';

export const Root: React.FC = () => (
  <>
    <Composition
      id="InternetFacts"
      component={Main}
      durationInFrames={TOTAL}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="EarthStop"
      component={Video}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
