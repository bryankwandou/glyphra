/**
 * The Glyphra mark.
 *
 * Two columns of bars: the left reads as plaintext, the right as the same
 * message after substitution. They are exact 180-degree rotations of one
 * another, so the mark depicts the transformation rather than decorating around
 * it. It survives down to 16px because the whole thing is four rectangles a
 * side with generous spacing.
 */
export function Mark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="Glyphra"
    >
      <defs>
        <linearGradient id="glyphra-shell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3730A3" />
          <stop offset="55%" stopColor="#1E1B4B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="glyphra-cipher" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>
      </defs>

      <rect width="48" height="48" rx="12" fill="url(#glyphra-shell)" />

      <g fill="#F1F5F9">
        <rect x="13" y="9" width="7" height="10" rx="3.5" />
        <rect x="13" y="23" width="7" height="7" rx="3.5" />
        <rect x="13" y="34" width="7" height="5" rx="2.5" />
      </g>
      <g fill="url(#glyphra-cipher)">
        <rect x="28" y="9" width="7" height="5" rx="2.5" />
        <rect x="28" y="18" width="7" height="7" rx="3.5" />
        <rect x="28" y="29" width="7" height="10" rx="3.5" />
      </g>
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark size={28} />
      <span className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-text">
        Glyphra
      </span>
    </span>
  );
}
