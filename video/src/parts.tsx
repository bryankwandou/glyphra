import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, MONO, SANS } from './theme';

/** Fade and lift, the same easing the product uses for its own entrances. */
export const Rise: React.FC<{
  delay?: number;
  distance?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, distance = 22, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.6 } });
  return (
    <div
      style={{
        opacity: s,
        transform: `translateY(${(1 - s) * distance}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Reveals a string one character at a time. Used for ciphertext, where the
 * point is that the reader watches letters arrive rather than a block appear.
 */
export const Typed: React.FC<{
  text: string;
  start: number;
  charsPerFrame?: number;
  style?: React.CSSProperties;
}> = ({ text, start, charsPerFrame = 0.9, style }) => {
  const frame = useCurrentFrame();
  const shown = Math.max(0, Math.min(text.length, Math.floor((frame - start) * charsPerFrame)));
  return (
    <span style={style}>
      {text.slice(0, shown)}
      {shown < text.length && shown > 0 ? (
        <span style={{ opacity: frame % 16 < 8 ? 1 : 0 }}>▍</span>
      ) : null}
    </span>
  );
};

export const Mark: React.FC<{ size?: number; progress?: number }> = ({ size = 96, progress = 1 }) => {
  const left = [
    { y: 9, h: 10 },
    { y: 23, h: 7 },
    { y: 34, h: 5 },
  ];
  const right = [
    { y: 9, h: 5 },
    { y: 18, h: 7 },
    { y: 29, h: 10 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <defs>
        <linearGradient id="shell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3730A3" />
          <stop offset="55%" stopColor="#1E1B4B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="ct" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.cipher} />
          <stop offset="100%" stopColor={C.accent} />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#shell)" />
      {left.map((b, i) => (
        <rect
          key={`l${i}`}
          x="13"
          y={b.y}
          width="7"
          height={b.h * Math.min(1, Math.max(0, progress * 2 - i * 0.15))}
          rx="3.5"
          fill="#F1F5F9"
        />
      ))}
      {right.map((b, i) => (
        <rect
          key={`r${i}`}
          x="28"
          y={b.y}
          width="7"
          height={b.h * Math.min(1, Math.max(0, progress * 2 - 0.5 - i * 0.15))}
          rx="3.5"
          fill="url(#ct)"
        />
      ))}
    </svg>
  );
};

export const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontFamily: MONO,
      fontSize: 22,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: C.inkFaint,
    }}
  >
    {children}
  </div>
);

export const Headline: React.FC<{ children: React.ReactNode; size?: number }> = ({
  children,
  size = 78,
}) => (
  <h1
    style={{
      fontFamily: MONO,
      fontSize: size,
      lineHeight: 1.04,
      letterSpacing: '-0.045em',
      fontWeight: 600,
      color: C.ink,
      margin: 0,
      textWrap: 'balance',
    }}
  >
    {children}
  </h1>
);

export const Body: React.FC<{ children: React.ReactNode; width?: number }> = ({
  children,
  width = 900,
}) => (
  <p
    style={{
      fontFamily: SANS,
      fontSize: 30,
      lineHeight: 1.5,
      color: C.inkMuted,
      margin: 0,
      maxWidth: width,
    }}
  >
    {children}
  </p>
);

/** A faint grid of letters behind the content, substituting slowly. */
export const Field: React.FC<{ opacity?: number }> = ({ opacity = 0.05 }) => {
  const frame = useCurrentFrame();
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const cols = 48;
  const rows = 26;
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < cols; c++) {
      // Deterministic per cell, advancing on its own slow cycle so the field
      // shifts without ever drawing the eye away from the copy.
      const seed = (r * 71 + c * 37 + Math.floor((frame + r * 13 + c * 7) / 40) * 91) % 26;
      line += A[seed] + ' ';
    }
    cells.push(
      <div key={r} style={{ whiteSpace: 'pre' }}>
        {line}
      </div>,
    );
  }
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        fontFamily: MONO,
        fontSize: 26,
        lineHeight: '42px',
        color: C.ink,
        opacity,
        overflow: 'hidden',
        pointerEvents: 'none',
        maskImage: 'radial-gradient(ellipse 70% 70% at 50% 45%, #000 20%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 45%, #000 20%, transparent 75%)',
      }}
    >
      {cells}
    </div>
  );
};

/** Fade the whole scene in and out at its edges so cuts are never harsh. */
export const SceneFade: React.FC<{ durationInFrames: number; children: React.ReactNode }> = ({
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 10, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  return <div style={{ opacity, width: '100%', height: '100%' }}>{children}</div>;
};
