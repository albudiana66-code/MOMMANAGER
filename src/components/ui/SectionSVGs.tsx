import type { CSSProperties, ReactNode } from 'react';

interface SvgProps {
  style?: CSSProperties;
}

export function CalendarSVG({ style }: SvgProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      {/* Calendar body */}
      <rect x="10" y="22" width="68" height="64" rx="6" stroke="#c4788a" strokeWidth="2.5" />
      {/* Header band */}
      <rect x="10" y="22" width="68" height="16" rx="6" fill="#c4788a" fillOpacity="0.35" />
      <rect x="10" y="30" width="68" height="8" fill="#c4788a" fillOpacity="0.35" />
      {/* Spiral binding circles */}
      <circle cx="25" cy="19" r="4" stroke="#d4a843" strokeWidth="2" fill="white" fillOpacity="0.8" />
      <circle cx="44" cy="19" r="4" stroke="#d4a843" strokeWidth="2" fill="white" fillOpacity="0.8" />
      <circle cx="63" cy="19" r="4" stroke="#d4a843" strokeWidth="2" fill="white" fillOpacity="0.8" />
      {/* Horizontal grid lines */}
      <line x1="10" y1="54" x2="78" y2="54" stroke="#c4788a" strokeWidth="1.2" />
      <line x1="10" y1="68" x2="78" y2="68" stroke="#c4788a" strokeWidth="1.2" />
      {/* Vertical grid lines */}
      <line x1="33" y1="38" x2="33" y2="86" stroke="#c4788a" strokeWidth="1.2" />
      <line x1="56" y1="38" x2="56" y2="86" stroke="#c4788a" strokeWidth="1.2" />
      {/* Small date dots */}
      <circle cx="21" cy="46" r="2.5" fill="#c4788a" fillOpacity="0.5" />
      <circle cx="44" cy="46" r="2.5" fill="#c4788a" fillOpacity="0.5" />
      <circle cx="67" cy="46" r="2.5" fill="#c4788a" fillOpacity="0.5" />
      <circle cx="21" cy="61" r="2.5" fill="#d4a843" fillOpacity="0.7" />
      {/* Pen diagonal */}
      <line x1="60" y1="72" x2="75" y2="57" stroke="#d4a843" strokeWidth="2.2" strokeLinecap="round" />
      <polygon points="75,57 71,54 68,60" fill="#d4a843" />
      {/* Small flower accent */}
      <circle cx="44" cy="77" r="3.5" fill="#c4788a" fillOpacity="0.55" />
      <circle cx="44" cy="71.5" r="2.2" fill="#c4788a" fillOpacity="0.35" />
      <circle cx="44" cy="82.5" r="2.2" fill="#c4788a" fillOpacity="0.35" />
      <circle cx="38.5" cy="77" r="2.2" fill="#c4788a" fillOpacity="0.35" />
      <circle cx="49.5" cy="77" r="2.2" fill="#c4788a" fillOpacity="0.35" />
    </svg>
  );
}

export function KidsSVG({ style }: SvgProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      {/* Bear head */}
      <circle cx="50" cy="52" r="26" stroke="#f4a261" strokeWidth="2.5" />
      {/* Ears */}
      <circle cx="28" cy="32" r="10" stroke="#f4a261" strokeWidth="2.5" />
      <circle cx="72" cy="32" r="10" stroke="#f4a261" strokeWidth="2.5" />
      {/* Inner ears */}
      <circle cx="28" cy="32" r="5.5" fill="#f4a261" fillOpacity="0.4" />
      <circle cx="72" cy="32" r="5.5" fill="#f4a261" fillOpacity="0.4" />
      {/* Eyes */}
      <circle cx="41" cy="48" r="3.5" fill="#f4a261" />
      <circle cx="59" cy="48" r="3.5" fill="#f4a261" />
      {/* Nose */}
      <ellipse cx="50" cy="58" rx="5" ry="3.5" fill="#f4a261" fillOpacity="0.7" />
      {/* Smile */}
      <path d="M43 64 Q50 70 57 64" stroke="#f4a261" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Stars */}
      <text x="8" y="26" fontSize="12" fill="#f4a261" fillOpacity="0.8">★</text>
      <text x="78" y="20" fontSize="10" fill="#e07b54" fillOpacity="0.7">★</text>
      <text x="82" y="72" fontSize="8" fill="#f4a261" fillOpacity="0.6">★</text>
      {/* Block A */}
      <rect x="8" y="72" width="18" height="18" rx="3" stroke="#e07b54" strokeWidth="1.8" />
      <text x="12" y="86" fontSize="11" fontWeight="bold" fill="#e07b54" fillOpacity="0.9">A</text>
      {/* Block B */}
      <rect x="74" y="72" width="18" height="18" rx="3" stroke="#f4a261" strokeWidth="1.8" />
      <text x="78" y="86" fontSize="11" fontWeight="bold" fill="#f4a261" fillOpacity="0.9">B</text>
    </svg>
  );
}

export function KitchenSVG({ style }: SvgProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      {/* Steam wisps */}
      <path d="M34 28 Q31 22 34 16 Q37 10 34 4" stroke="#f7b731" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M50 28 Q47 22 50 16 Q53 10 50 4" stroke="#f7b731" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M66 28 Q63 22 66 16 Q69 10 66 4" stroke="#f7b731" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Pot lid */}
      <rect x="22" y="30" width="56" height="8" rx="3" stroke="#f7b731" strokeWidth="2.2" />
      {/* Lid knob */}
      <rect x="44" y="25" width="12" height="7" rx="3" stroke="#f7b731" strokeWidth="2" />
      {/* Pot body */}
      <rect x="18" y="38" width="64" height="44" rx="8" stroke="#f7b731" strokeWidth="2.5" />
      {/* Pot handles */}
      <path d="M18 52 Q8 52 8 60 Q8 68 18 68" stroke="#f7b731" strokeWidth="2.2" fill="none" />
      <path d="M82 52 Q92 52 92 60 Q92 68 82 68" stroke="#f7b731" strokeWidth="2.2" fill="none" />
      {/* Fork */}
      <line x1="33" y1="52" x2="33" y2="74" stroke="#e8a020" strokeWidth="2" strokeLinecap="round" />
      <line x1="29" y1="52" x2="29" y2="61" stroke="#e8a020" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="33" y1="52" x2="33" y2="61" stroke="#e8a020" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="37" y1="52" x2="37" y2="61" stroke="#e8a020" strokeWidth="1.8" strokeLinecap="round" />
      {/* Spoon */}
      <ellipse cx="67" cy="55" rx="5" ry="7" stroke="#e8a020" strokeWidth="2" />
      <line x1="67" y1="62" x2="67" y2="78" stroke="#e8a020" strokeWidth="2" strokeLinecap="round" />
      {/* Herb sprigs */}
      <circle cx="50" cy="56" r="3" fill="#f7b731" fillOpacity="0.5" />
      <circle cx="45" cy="60" r="2.5" fill="#f7b731" fillOpacity="0.4" />
      <circle cx="55" cy="60" r="2.5" fill="#f7b731" fillOpacity="0.4" />
      <circle cx="50" cy="65" r="2" fill="#f7b731" fillOpacity="0.3" />
    </svg>
  );
}

export function BudgetSVG({ style }: SvgProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      {/* Credit card */}
      <rect x="8" y="8" width="52" height="34" rx="5" stroke="#7fb069" strokeWidth="2.2" />
      {/* Chip */}
      <rect x="15" y="20" width="12" height="10" rx="2" stroke="#7fb069" strokeWidth="1.8" />
      <line x1="15" y1="25" x2="27" y2="25" stroke="#7fb069" strokeWidth="1" />
      <line x1="21" y1="20" x2="21" y2="30" stroke="#7fb069" strokeWidth="1" />
      {/* Magnetic stripe */}
      <rect x="8" y="14" width="52" height="6" fill="#7fb069" fillOpacity="0.25" />
      {/* Bar chart */}
      <rect x="46" y="66" width="12" height="28" rx="3" stroke="#7fb069" strokeWidth="2" />
      <rect x="62" y="54" width="12" height="40" rx="3" stroke="#7fb069" strokeWidth="2" />
      <rect x="78" y="44" width="12" height="50" rx="3" stroke="#5a9a45" strokeWidth="2" fill="#7fb069" fillOpacity="0.2" />
      {/* Arrow up */}
      <line x1="88" y1="38" x2="88" y2="46" stroke="#5a9a45" strokeWidth="2" strokeLinecap="round" />
      <polyline points="84,42 88,37 92,42" stroke="#5a9a45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Coin stack */}
      <ellipse cx="22" cy="64" rx="16" ry="5" stroke="#7fb069" strokeWidth="2" />
      <ellipse cx="22" cy="59" rx="16" ry="5" stroke="#7fb069" strokeWidth="2" />
      <ellipse cx="22" cy="54" rx="16" ry="5" stroke="#7fb069" strokeWidth="2" fill="#7fb069" fillOpacity="0.2" />
      {/* Dollar sign */}
      <text x="17" y="58" fontSize="10" fontWeight="bold" fill="#7fb069" fillOpacity="0.9">$</text>
    </svg>
  );
}

export function SelfCareSVG({ style }: SvgProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      {/* Candle */}
      <rect x="42" y="58" width="16" height="32" rx="4" stroke="#a78bca" strokeWidth="2.2" />
      {/* Candle drip */}
      <path d="M42 65 Q38 67 38 72" stroke="#a78bca" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Flame teardrop */}
      <path d="M50 35 Q44 44 44 52 Q44 59 50 59 Q56 59 56 52 Q56 44 50 35Z" stroke="#a78bca" strokeWidth="2" fill="#a78bca" fillOpacity="0.3" />
      {/* Flame inner */}
      <path d="M50 42 Q47 48 47 52 Q47 56 50 56 Q53 56 53 52 Q53 48 50 42Z" fill="#a78bca" fillOpacity="0.5" />
      {/* Lotus petals - center */}
      <circle cx="18" cy="72" r="7" stroke="#c4a0e0" strokeWidth="2" fill="#a78bca" fillOpacity="0.2" />
      {/* Lotus petals */}
      <ellipse cx="18" cy="62" rx="5" ry="9" stroke="#c4a0e0" strokeWidth="1.8" fill="none" transform="rotate(-15 18 62)" />
      <ellipse cx="10" cy="68" rx="5" ry="9" stroke="#c4a0e0" strokeWidth="1.8" fill="none" transform="rotate(-55 10 68)" />
      <ellipse cx="26" cy="68" rx="5" ry="9" stroke="#c4a0e0" strokeWidth="1.8" fill="none" transform="rotate(15 26 68)" />
      <ellipse cx="8" cy="76" rx="5" ry="8" stroke="#c4a0e0" strokeWidth="1.8" fill="none" transform="rotate(-80 8 76)" />
      <ellipse cx="28" cy="76" rx="5" ry="8" stroke="#c4a0e0" strokeWidth="1.8" fill="none" transform="rotate(80 28 76)" />
      {/* Lotus base */}
      <path d="M9 80 Q18 88 27 80" stroke="#a78bca" strokeWidth="2" strokeLinecap="round" fill="none" />
      <line x1="18" y1="79" x2="18" y2="88" stroke="#a78bca" strokeWidth="1.8" strokeLinecap="round" />
      {/* Bubbles */}
      <circle cx="74" cy="30" r="8" stroke="#c4a0e0" strokeWidth="2" />
      <circle cx="86" cy="48" r="5.5" stroke="#a78bca" strokeWidth="1.8" />
      <circle cx="68" cy="52" r="4" stroke="#c4a0e0" strokeWidth="1.5" />
      {/* Leaf */}
      <path d="M72 70 Q84 62 90 74 Q78 80 72 70Z" stroke="#a78bca" strokeWidth="1.8" fill="#a78bca" fillOpacity="0.2" />
      <line x1="72" y1="70" x2="90" y2="74" stroke="#a78bca" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function WorkoutSVG({ style }: SvgProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      {/* Dumbbell bar */}
      <line x1="20" y1="50" x2="80" y2="50" stroke="#4a7fa5" strokeWidth="5" strokeLinecap="round" />
      {/* Left weight plates */}
      <rect x="8" y="36" width="16" height="28" rx="5" stroke="#4a7fa5" strokeWidth="2.2" />
      <rect x="5" y="40" width="8" height="20" rx="3" stroke="#2d5f85" strokeWidth="2" />
      {/* Right weight plates */}
      <rect x="76" y="36" width="16" height="28" rx="5" stroke="#4a7fa5" strokeWidth="2.2" />
      <rect x="87" y="40" width="8" height="20" rx="3" stroke="#2d5f85" strokeWidth="2" />
      {/* Lightning bolt */}
      <path d="M60 10 L52 30 L60 30 L48 52 L56 52 L44 72" stroke="#d4a843" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Heart rate line */}
      <polyline points="8,85 22,85 28,72 34,95 40,78 46,85 58,85 64,75 70,85 92,85"
        stroke="#4a7fa5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

interface ScreenWatermarkProps {
  children: ReactNode;
  svg: 'calendar' | 'kids' | 'kitchen' | 'budget' | 'selfcare';
}

const SVG_MAP = {
  calendar: CalendarSVG,
  kids: KidsSVG,
  kitchen: KitchenSVG,
  budget: BudgetSVG,
  selfcare: SelfCareSVG,
};

export function ScreenWatermark({ children, svg }: ScreenWatermarkProps) {
  const SvgComponent = SVG_MAP[svg];
  return (
    <div style={{ position: 'relative' }}>
      <SvgComponent
        style={{
          position: 'absolute',
          top: 12,
          right: -18,
          width: 160,
          height: 160,
          opacity: 0.07,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}
