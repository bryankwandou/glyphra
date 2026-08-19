'use client';

import { useEffect, useState } from 'react';
import QR from 'qrcode';

/**
 * A scannable code for the share link.
 *
 * The module matrix comes from the `qrcode` package rather than from anything
 * written here. A hand-rolled encoder was tried first and tested against this
 * same library: 302 of 841 modules differed, so it would not have scanned at
 * all. Shipping that would have been the QR equivalent of a wrong answer key —
 * it looks entirely correct on screen and fails in the room.
 *
 * Only the SVG rendering is ours, which is a loop over booleans and cannot be
 * subtly wrong in the same way.
 */
export function QrCode({ value, size = 168 }: { value: string; size?: number }) {
  const [path, setPath] = useState<{ d: string; span: number } | null>(null);

  useEffect(() => {
    let alive = true;
    try {
      const qr = QR.create(value, { errorCorrectionLevel: 'M' });
      const span = qr.modules.size;
      const parts: string[] = [];
      for (let r = 0; r < span; r++) {
        for (let c = 0; c < span; c++) {
          if (qr.modules.get(r, c)) parts.push(`M${c} ${r}h1v1h-1z`);
        }
      }
      if (alive) setPath({ d: parts.join(''), span });
    } catch {
      if (alive) setPath(null);
    }
    return () => { alive = false; };
  }, [value]);

  if (!path) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-lg border border-border-subtle bg-bg-sunken"
        aria-hidden
      />
    );
  }

  // A quiet zone of four modules is part of the specification, not padding —
  // without it many scanners simply will not lock on.
  const quiet = 4;
  const total = path.span + quiet * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      role="img"
      aria-label="QR code for this quiz link"
      shapeRendering="crispEdges"
      className="rounded-lg"
    >
      {/* White ground regardless of theme. A dark-on-dark code does not scan. */}
      <rect width={total} height={total} fill="#FFFFFF" />
      <g transform={`translate(${quiet} ${quiet})`}>
        <path d={path.d} fill="#000000" />
      </g>
    </svg>
  );
}
