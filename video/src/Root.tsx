import React from 'react';
import { Composition } from 'remotion';
import { Promo, TOTAL } from './Promo';
import { FPS } from './theme';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Promo"
      component={Promo}
      durationInFrames={TOTAL}
      fps={FPS}
      width={1920}
      height={1080}
    />
    {/* Square cut for social, same timeline. */}
    <Composition
      id="PromoSquare"
      component={Promo}
      durationInFrames={TOTAL}
      fps={FPS}
      width={1080}
      height={1080}
    />
  </>
);
