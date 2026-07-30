/**
 * Drawn, not typed. A text "+" sits off-centre inside its own em box, so
 * flex centring lines up the line box while the glyph itself drifts — visible
 * the moment the button is scaled or rotated on hover. A symmetric viewBox
 * puts the strokes exactly on centre and gives rotation a true pivot.
 */

interface IconProps {
  /** Sizing lives with the caller — pass height/width classes to match the button. */
  className?: string;
}

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 3,
  strokeLinecap: 'round',
} as const;

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M12 5.5v13M5.5 12h13" />
    </svg>
  );
}

export function MinusIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M5.5 12h13" />
    </svg>
  );
}
