import React from 'react';
import {Composition} from 'remotion';
import {Main, TOTAL} from './src/Main';

export const Root: React.FC = () => {
  return (
    <Composition
      id="InternetFacts"
      component={Main}
      durationInFrames={TOTAL}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
