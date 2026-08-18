import React from 'react';
import { AbsoluteFill, Composition, useVideoConfig } from 'remotion';
import { Promo, TOTAL } from './Promo';
import { C, FPS } from './theme';

const MASTER = { width: 1920, height: 1080 };

/**
 * Scales the master 16:9 timeline to fit whatever frame it is rendered into.
 *
 * The alternative — re-laying out every scene per aspect ratio — means the two
 * cuts drift apart the moment either is edited, and a square cut that has
 * quietly stopped matching the wide one is worse than no square cut. Letterbox
 * bars on a social crop are a normal thing to see; a headline running off the
 * edge is not.
 */
const Fit: React.FC = () => {
  const { width, height } = useVideoConfig();
  const scale = Math.min(width / MASTER.width, height / MASTER.height);

  return (
    <AbsoluteFill style={{ backgroundColor: C.ground, justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          width: MASTER.width,
          height: MASTER.height,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0,
        }}
      >
        <Promo />
      </div>
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Promo"
      component={Promo}
      durationInFrames={TOTAL}
      fps={FPS}
      width={MASTER.width}
      height={MASTER.height}
    />

    {/* Square cut for social, same timeline, scaled to fit rather than relaid out. */}
    <Composition
      id="PromoSquare"
      component={Fit}
      durationInFrames={TOTAL}
      fps={FPS}
      width={1080}
      height={1080}
    />

    {/* Vertical cut, for the same reason. */}
    <Composition
      id="PromoVertical"
      component={Fit}
      durationInFrames={TOTAL}
      fps={FPS}
      width={1080}
      height={1920}
    />
  </>
);
