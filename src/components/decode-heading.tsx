'use client';

import { useEffect, useRef, useState } from 'react';

const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * A heading that arrives enciphered and resolves as you reach it.
 *
 * The one piece of motion on this site that is not decoration. Every other
 * animated heading effect could sit on any page about anything; this one is the
 * product's own subject performed on itself — text that looks like noise until
 * it does not, which is the entire experience of breaking a cipher.
 *
 * Rules it follows, because a landing page is still a page people read:
 * it runs once, on entering view, never on a loop; it holds the final text in
 * the DOM from the first render so screen readers and search engines see the
 * real heading; and it does nothing at all when the visitor has asked for
 * reduced motion, in which case the heading is simply there.
 */
export function DecodeHeading({
  text,
  className = '',
  as: Tag = 'span',
}: {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'span';
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(text);
  const [done, setDone] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !ref.current) return;

    setDone(false);
    setShown(scramble(text, 0));

    const el = ref.current;
    let frame = 0;
    let raf = 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        // Roughly a second at 60fps. Each character settles at a point
        // proportional to its position, so the heading resolves left to right
        // rather than all at once, which reads as solving rather than loading.
        const tick = () => {
          frame += 1;
          const progress = Math.min(1, frame / 42);
          setShown(scramble(text, progress));
          if (progress < 1) raf = requestAnimationFrame(tick);
          else { setShown(text); setDone(true); }
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => { observer.disconnect(); cancelAnimationFrame(raf); };
  }, [text]);

  return (
    <Tag ref={ref as never} className={className}>
      {/* The real text is always present for anything that is not a sighted
          browser; the scrambled pass is decorative and hidden from them. */}
      <span className="sr-only">{text}</span>
      <span aria-hidden data-settled={done}>{shown}</span>
    </Tag>
  );
}

function scramble(text: string, progress: number): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ' ' || ch === '\n') { out += ch; continue; }
    // Characters settle in order, so the phrase resolves from the front.
    const settleAt = (i / text.length) * 0.85;
    out += progress > settleAt ? ch : POOL[Math.floor(Math.random() * POOL.length)];
  }
  return out;
}
