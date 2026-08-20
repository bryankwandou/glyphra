'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Fades a section in as it comes into view.
 *
 * Kept small on purpose: eight pixels of travel and a short fade. A landing
 * page that throws every section in from the side is harder to read than one
 * that does nothing, and the point of this is to make the page feel composed,
 * not to be noticed.
 *
 * Anyone who has asked for reduced motion gets the content immediately, and
 * because the initial state is set from an effect rather than from markup, a
 * visitor with JavaScript disabled sees everything too — a reveal that hides
 * content by default is a reveal that can permanently hide it.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'hidden' | 'shown'>('idle');

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !ref.current) return;

    setState('hidden');
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        window.setTimeout(() => setState('shown'), delay);
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={className}
      style={
        state === 'idle'
          ? undefined
          : {
              opacity: state === 'shown' ? 1 : 0,
              transform: state === 'shown' ? 'none' : 'translateY(8px)',
              transition: 'opacity 520ms cubic-bezier(0.16,1,0.3,1), transform 520ms cubic-bezier(0.16,1,0.3,1)',
            }
      }
    >
      {children}
    </div>
  );
}
