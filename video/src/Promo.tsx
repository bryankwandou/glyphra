import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { C, MONO, SANS } from './theme';
import { SHOWCASE, PLAINTEXT, DEFECTS, STATS } from './data';
import { Rise, Typed, Mark, Eyebrow, Headline, Body, Field, SceneFade } from './parts';

const PAD = 120;

const Stage: React.FC<{ children: React.ReactNode; field?: boolean }> = ({ children, field = true }) => (
  <AbsoluteFill style={{ backgroundColor: C.ground }}>
    {field ? <Field /> : null}
    <AbsoluteFill
      style={{
        padding: PAD,
        justifyContent: 'center',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </AbsoluteFill>
  </AbsoluteFill>
);

/* ------------------------------------------------------------- 1. opening */

const Opening: React.FC<{ len: number }> = ({ len }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const assemble = spring({ frame, fps, config: { damping: 200, mass: 1.1 } });

  return (
    <SceneFade durationInFrames={len}>
      <Stage>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 44 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <Mark size={104} progress={assemble} />
            <Rise delay={16}>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 52,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  color: C.ink,
                }}
              >
                GLYPHRA
              </div>
            </Rise>
          </div>

          <Rise delay={30}>
            <Headline size={96}>
              Every student gets a{' '}
              <span style={{ color: C.cipher }}>different</span> paper.
            </Headline>
          </Rise>

          <Rise delay={46}>
            <Body>
              Cryptography exercises generated on demand, with one marking key for the whole cohort.
            </Body>
          </Rise>
        </div>
      </Stage>
    </SceneFade>
  );
};

/* ------------------------------------------------------------- 2. problem */

const Problem: React.FC<{ len: number }> = ({ len }) => (
  <SceneFade durationInFrames={len}>
    <Stage>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
        <Rise>
          <Eyebrow>The problem</Eyebrow>
        </Rise>
        <Rise delay={10}>
          <Headline>A problem set teaches once, then circulates.</Headline>
        </Rise>
        <Rise delay={24}>
          <Body>
            By the second year the answers are in a shared drive. The set still gets marked. It has
            stopped measuring anything.
          </Body>
        </Rise>
        <Rise delay={40}>
          <div
            style={{
              borderLeft: `3px solid ${C.cipher}`,
              paddingLeft: 28,
              fontFamily: SANS,
              fontSize: 28,
              lineHeight: 1.5,
              color: C.inkMuted,
              maxWidth: 900,
            }}
          >
            Writing twenty fresh exercises is not the hard part. Writing twenty correct answer keys
            is where the evening goes.
          </div>
        </Rise>
      </div>
    </Stage>
  </SceneFade>
);

/* ------------------------------------------------------------ 3. showcase */

const Showcase: React.FC<{ len: number }> = ({ len }) => {
  const frame = useCurrentFrame();
  const per = Math.floor(len / SHOWCASE.length);
  const idx = Math.min(SHOWCASE.length - 1, Math.floor(frame / per));
  const local = frame - idx * per;
  const item = SHOWCASE[idx];

  return (
    <SceneFade durationInFrames={len}>
      <Stage>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          <Rise>
            <Eyebrow>One engine, 101 techniques</Eyebrow>
          </Rise>

          <div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 20,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: C.inkFaint,
                marginBottom: 14,
              }}
            >
              Plaintext
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 46,
                letterSpacing: '0.12em',
                color: C.ink,
              }}
            >
              {PLAINTEXT}
            </div>
          </div>

          <div
            style={{
              height: 1,
              background: C.rule,
              width: interpolate(local, [0, 14], [0, 100], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }) + '%',
            }}
          />

          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 20,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 20,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: C.cipher,
                }}
              >
                {item.name}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 20, color: C.inkFaint }}>{item.era}</div>
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 46,
                letterSpacing: '0.12em',
                color: C.cipher,
                minHeight: 60,
              }}
            >
              <Typed text={item.out} start={idx * per + 8} charsPerFrame={1.4} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            {SHOWCASE.map((s, i) => (
              <div
                key={s.name}
                style={{
                  height: 3,
                  flex: 1,
                  borderRadius: 2,
                  background: i === idx ? C.cipher : C.rule,
                }}
              />
            ))}
          </div>
        </div>
      </Stage>
    </SceneFade>
  );
};

/* --------------------------------------------------------- 4. verification */

const Verification: React.FC<{ len: number }> = ({ len }) => {
  const frame = useCurrentFrame();
  return (
    <SceneFade durationInFrames={len}>
      <Stage>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
          <Rise>
            <Eyebrow>Why it can be trusted</Eyebrow>
          </Rise>
          <Rise delay={10}>
            <Headline size={64}>A wrong answer key is worse than no answer key.</Headline>
          </Rise>
          <Rise delay={22}>
            <Body width={1080}>
              Every technique runs against its own inverse before it can appear. The first run
              rejected six.
            </Body>
          </Rise>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {DEFECTS.map(([name, why], i) => {
              const at = 40 + i * 11;
              const o = interpolate(frame, [at, at + 10], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              return (
                <div
                  key={name}
                  style={{
                    opacity: o,
                    transform: `translateX(${(1 - o) * 16}px)`,
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 24,
                    borderBottom: `1px solid ${C.rule}`,
                    paddingBottom: 11,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 26,
                      color: C.flag,
                      width: 340,
                      flexShrink: 0,
                    }}
                  >
                    {name}
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: 26, color: C.inkMuted }}>{why}</div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              opacity: interpolate(frame, [len - 46, len - 32], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              fontFamily: MONO,
              fontSize: 30,
              color: C.ok,
              marginTop: 10,
            }}
          >
            All six fixed. 94 of 94 reversible techniques now round-trip exactly.
          </div>
        </div>
      </Stage>
    </SceneFade>
  );
};

/* ------------------------------------------------------------ 5. papers */

const Papers: React.FC<{ len: number }> = ({ len }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const codes = ['VNYB-01', 'RSSK-02', 'KTWU-03', 'NYCN-04', 'QGDG-05'];

  return (
    <SceneFade durationInFrames={len}>
      <Stage>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
          <Rise>
            <Eyebrow>Assessment</Eyebrow>
          </Rise>
          <Rise delay={10}>
            <Headline size={64}>Thirty papers. Thirty different sets. One key.</Headline>
          </Rise>

          <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
            {codes.map((code, i) => {
              const s = spring({
                frame: frame - (26 + i * 7),
                fps,
                config: { damping: 200, mass: 0.7 },
              });
              return (
                <div
                  key={code}
                  style={{
                    opacity: s,
                    transform: `translateY(${(1 - s) * 26}px) rotate(${(i - 2) * 1.1}deg)`,
                    flex: 1,
                    background: C.raised,
                    border: `1px solid ${C.rule}`,
                    borderRadius: 6,
                    padding: 22,
                    minHeight: 250,
                  }}
                >
                  <div style={{ fontFamily: MONO, fontSize: 22, color: C.cipher }}>{code}</div>
                  <div
                    style={{
                      marginTop: 18,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    {[0, 1, 2].map((r) => (
                      <div key={r}>
                        <div
                          style={{
                            height: 6,
                            borderRadius: 3,
                            background: C.rule,
                            width: `${72 - r * 9 + i * 4}%`,
                          }}
                        />
                        <div
                          style={{
                            height: 6,
                            borderRadius: 3,
                            background: C.cipher,
                            opacity: 0.5,
                            marginTop: 7,
                            width: `${52 + ((i * 7 + r * 13) % 34)}%`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <Rise delay={70}>
            <Body width={1080}>
              Nothing is stored. A paper is a function of its seed, so a sheet lost in March can be
              rebuilt in August from the seed printed on it.
            </Body>
          </Rise>
        </div>
      </Stage>
    </SceneFade>
  );
};

/* -------------------------------------------------------------- 6. close */

const Close: React.FC<{ len: number }> = ({ len }) => {
  const frame = useCurrentFrame();
  return (
    <SceneFade durationInFrames={len}>
      <Stage>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 46, alignItems: 'flex-start' }}>
          <Rise>
            <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
              <Mark size={88} />
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 46,
                  fontWeight: 600,
                  color: C.ink,
                }}
              >
                GLYPHRA
              </div>
            </div>
          </Rise>

          <div style={{ display: 'flex', gap: 96 }}>
            {STATS.map((s, i) => {
              const o = interpolate(frame, [18 + i * 8, 30 + i * 8], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              return (
                <div key={s.label} style={{ opacity: o }}>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 62,
                      letterSpacing: '-0.04em',
                      color: C.ink,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: 24, color: C.inkFaint, marginTop: 8 }}>
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>

          <Rise delay={48}>
            <div style={{ fontFamily: MONO, fontSize: 40, color: C.cipher }}>
              glyphra.vercel.app
            </div>
          </Rise>
        </div>
      </Stage>
    </SceneFade>
  );
};

/* ----------------------------------------------------------------- assembly */

export const SCENES = [
  { C: Opening, len: 120 },
  { C: Problem, len: 150 },
  { C: Showcase, len: 240 },
  { C: Verification, len: 210 },
  { C: Papers, len: 180 },
  { C: Close, len: 150 },
] as const;

export const TOTAL = SCENES.reduce((n, s) => n + s.len, 0);

export const Promo: React.FC = () => {
  let at = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: C.ground }}>
      {SCENES.map((s, i) => {
        const from = at;
        at += s.len;
        const Comp = s.C;
        return (
          <Sequence key={i} from={from} durationInFrames={s.len}>
            <Comp len={s.len} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
