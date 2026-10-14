interface LuxuryHeaderProps {
  screen: 'tasks' | 'budget' | 'kitchen' | 'kids' | 'selfcare' | 'workout';
  title: string;
  subtitle?: string;
}

const CONFIGS = {
  tasks: {
    bg: 'linear-gradient(135deg, #FDF0F3 0%, #F5DCE4 100%)',
    accent: '#C4788A',
  },
  budget: {
    bg: 'linear-gradient(135deg, #FDFAF5 0%, #EDE8DC 100%)',
    accent: '#8A9E7A',
  },
  kitchen: {
    bg: 'linear-gradient(135deg, #FDFAF0 0%, #F5ECD8 100%)',
    accent: '#D4A843',
  },
  kids: {
    bg: 'linear-gradient(135deg, #FDF8F0 0%, #EDE4D4 100%)',
    accent: '#D4956A',
  },
  selfcare: {
    bg: 'linear-gradient(135deg, #2C2218 0%, #4A3020 100%)',
    accent: '#D4A843',
    dark: true,
  },
  workout: {
    bg: 'linear-gradient(135deg, #FAF5F5 0%, #EDE4DC 100%)',
    accent: '#7A9BB5',
  },
};

/* ── TASKS — pink spiral planner with gold pen ── */
function TasksIllustration({ accent }: { accent: string }) {
  return (
    <svg width="220" height="180" viewBox="0 0 220 180" fill="none"
      style={{ position: 'absolute', right: -10, top: 0, bottom: 0 }}>
      {/* Notebook shadow */}
      <rect x="72" y="28" width="118" height="148" rx="8" fill="rgba(196,120,138,0.08)" />
      {/* Notebook body — white pages */}
      <rect x="68" y="22" width="118" height="148" rx="8" fill="white" stroke="rgba(196,120,138,0.25)" strokeWidth="1" />
      {/* Pink cover left strip */}
      <rect x="68" y="22" width="22" height="148" rx="8" fill={accent} fillOpacity="0.18" />
      <rect x="82" y="22" width="8" height="148" fill={accent} fillOpacity="0.10" />
      {/* Spiral rings */}
      {[42, 58, 74, 90, 106, 122, 138].map((y, i) => (
        <g key={i}>
          <ellipse cx="79" cy={y} rx="9" ry="6" fill="white" stroke="#D4A843" strokeWidth="1.8" />
          <ellipse cx="79" cy={y} rx="5" ry="3.5" fill="#D4A843" fillOpacity="0.2" />
        </g>
      ))}
      {/* Page lines */}
      <line x1="100" y1="50" x2="175" y2="50" stroke={accent} strokeWidth="0.8" strokeOpacity="0.3" />
      <line x1="100" y1="64" x2="175" y2="64" stroke={accent} strokeWidth="0.8" strokeOpacity="0.3" />
      <line x1="100" y1="78" x2="175" y2="78" stroke={accent} strokeWidth="0.8" strokeOpacity="0.3" />
      <line x1="100" y1="92" x2="165" y2="92" stroke={accent} strokeWidth="0.8" strokeOpacity="0.3" />
      <line x1="100" y1="106" x2="170" y2="106" stroke={accent} strokeWidth="0.8" strokeOpacity="0.3" />
      <line x1="100" y1="120" x2="158" y2="120" stroke={accent} strokeWidth="0.8" strokeOpacity="0.3" />
      {/* Checkbox + check mark row 1 */}
      <rect x="104" y="44" width="10" height="10" rx="2" stroke={accent} strokeWidth="1.2" fill="none" />
      <path d="M105.5 49.5 l2.5 2.5 4-5" stroke={accent} strokeWidth="1.3" strokeLinecap="round" fill="none" />
      {/* Checkbox unchecked row 2 */}
      <rect x="104" y="58" width="10" height="10" rx="2" stroke={accent} strokeWidth="1.2" fill={accent} fillOpacity="0.12" />
      {/* Checkbox unchecked row 3 */}
      <rect x="104" y="72" width="10" height="10" rx="2" stroke={accent} strokeWidth="1.2" fill="none" />
      {/* Small pink date badge */}
      <rect x="130" y="126" width="38" height="20" rx="10" fill={accent} fillOpacity="0.15" />
      <rect x="130" y="126" width="38" height="20" rx="10" stroke={accent} strokeWidth="0.8" />
      {/* Gold fountain pen */}
      <g transform="rotate(-38, 185, 88)">
        <rect x="176" y="48" width="10" height="60" rx="5" fill="#D4A843" />
        <rect x="177" y="50" width="8" height="15" rx="4" fill="#E8C870" />
        <rect x="176" y="95" width="10" height="8" rx="2" fill="#C09030" />
        <polygon points="181,103 177,114 185,114" fill="#C09030" />
        <line x1="181" y1="108" x2="181" y2="114" stroke="#E8C870" strokeWidth="1" />
      </g>
    </svg>
  );
}

/* ── BUDGET — platinum card + gold fountain pen + wallet ── */
function BudgetIllustration({ accent }: { accent: string }) {
  return (
    <svg width="220" height="180" viewBox="0 0 220 180" fill="none"
      style={{ position: 'absolute', right: -8, top: 0 }}>
      {/* Stacked books / planners at back */}
      <rect x="30" y="110" width="70" height="10" rx="2" fill="#EDE8DC" stroke={accent} strokeWidth="0.8" strokeOpacity="0.5" />
      <rect x="28" y="100" width="74" height="12" rx="2" fill="#F5F0E8" stroke={accent} strokeWidth="0.8" strokeOpacity="0.4" />
      {/* Main credit card — platinum */}
      <rect x="50" y="42" width="130" height="82" rx="12" fill="white" />
      <rect x="50" y="42" width="130" height="82" rx="12" stroke="rgba(212,168,67,0.45)" strokeWidth="1.5" />
      {/* Card shimmer */}
      <rect x="50" y="42" width="130" height="82" rx="12"
        fill="url(#platinumGrad)" />
      <defs>
        <linearGradient id="platinumGrad" x1="50" y1="42" x2="180" y2="124" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDFAF5" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#F5F0E5" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#EDE8DC" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {/* Magnetic stripe */}
      <rect x="50" y="60" width="130" height="14" fill="rgba(90,74,66,0.08)" />
      {/* Gold chip */}
      <rect x="68" y="82" width="22" height="16" rx="3" fill="white" stroke="#D4A843" strokeWidth="1.5" />
      <rect x="71" y="85" width="16" height="10" rx="2" fill="#D4A843" fillOpacity="0.3" />
      <line x1="68" y1="90" x2="90" y2="90" stroke="#D4A843" strokeWidth="0.8" />
      <line x1="79" y1="82" x2="79" y2="98" stroke="#D4A843" strokeWidth="0.8" />
      {/* Card number dots */}
      {[105, 120, 135, 150].map((x, i) => (
        <g key={i}>
          {[0, 4, 8, 12].map(dx => (
            <circle key={dx} cx={x + dx} cy={92} r="1.5" fill={i === 3 ? '#D4A843' : 'rgba(90,74,66,0.25)'} />
          ))}
        </g>
      ))}
      {/* Cardholder name */}
      <line x1="68" y1="108" x2="120" y2="108" stroke="rgba(90,74,66,0.2)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Gold fountain pen overlapping card */}
      <g transform="rotate(-25, 170, 80)">
        <rect x="162" y="30" width="14" height="70" rx="7" fill="#D4A843" />
        <rect x="163" y="32" width="12" height="20" rx="6" fill="#E8C870" />
        <rect x="163" y="32" width="12" height="8" rx="6" fill="#C9A030" fillOpacity="0.5" />
        <rect x="162" y="88" width="14" height="8" rx="2" fill="#B8901E" />
        <path d="M169,96 l-5,16 l10,0 Z" fill="#B8901E" />
        <line x1="169" y1="100" x2="169" y2="112" stroke="#E8C870" strokeWidth="1.2" />
      </g>
      {/* Small gold coin */}
      <circle cx="38" cy="58" r="18" fill="white" stroke="#D4A843" strokeWidth="1.8" />
      <circle cx="38" cy="58" r="12" fill="#D4A843" fillOpacity="0.15" />
      <text x="31" y="63" fontSize="14" fontWeight="300" fill="#D4A843">$</text>
    </svg>
  );
}

/* ── KITCHEN — marble counter, geometric pendant, flowers, gold faucet ── */
function KitchenIllustration({ accent }: { accent: string }) {
  return (
    <svg width="220" height="180" viewBox="0 0 220 180" fill="none"
      style={{ position: 'absolute', right: -10, top: 0 }}>
      {/* Cabinet door backs */}
      <rect x="100" y="10" width="58" height="55" rx="4" fill="white" stroke={accent} strokeWidth="1" strokeOpacity="0.4" />
      <rect x="162" y="10" width="50" height="55" rx="4" fill="white" stroke={accent} strokeWidth="1" strokeOpacity="0.4" />
      {/* Cabinet handles - gold */}
      <rect x="124" y="36" width="10" height="3" rx="1.5" fill="#D4A843" />
      <rect x="177" y="36" width="10" height="3" rx="1.5" fill="#D4A843" />
      {/* Marble backsplash */}
      <rect x="68" y="68" width="148" height="35" fill="#FDFAF5" stroke="rgba(212,168,67,0.25)" strokeWidth="1" />
      {/* Marble veins */}
      <path d="M78 72 Q120 68 150 76 Q175 82 210 70" stroke="rgba(90,74,66,0.12)" strokeWidth="1.2" fill="none" />
      <path d="M100 95 Q140 88 175 96" stroke="rgba(90,74,66,0.08)" strokeWidth="0.8" fill="none" />
      <path d="M160 72 Q185 80 210 75" stroke="rgba(90,74,66,0.09)" strokeWidth="1" fill="none" />
      {/* Counter top */}
      <rect x="60" y="103" width="156" height="14" rx="3" fill="white" stroke={accent} strokeWidth="1" strokeOpacity="0.35" />
      {/* Counter front */}
      <rect x="60" y="117" width="156" height="55" rx="4" fill="#FDFCF8" stroke="rgba(212,168,67,0.2)" strokeWidth="0.8" />
      {/* Drawer handles */}
      <rect x="90" y="138" width="24" height="3" rx="1.5" fill="#D4A843" />
      <rect x="130" y="138" width="24" height="3" rx="1.5" fill="#D4A843" />
      <rect x="172" y="138" width="24" height="3" rx="1.5" fill="#D4A843" />
      {/* Geometric pendant light */}
      <line x1="88" y1="0" x2="88" y2="26" stroke="#D4A843" strokeWidth="1.5" />
      <polygon points="88,26 70,50 88,62 106,50" fill="white" stroke="#D4A843" strokeWidth="1.5" />
      <polygon points="88,34 74,50 88,56 102,50" fill="#FFF8E8" stroke="#D4A843" strokeWidth="0.8" />
      <circle cx="88" cy="50" r="5" fill="#FFF0C0" />
      {/* Warm glow from pendant */}
      <ellipse cx="88" cy="65" rx="22" ry="6" fill="#D4A843" fillOpacity="0.06" />
      {/* White vase with flowers */}
      <path d="M148 103 Q140 88 143 72 Q145 62 152 62 Q159 62 161 72 Q164 88 156 103 Z" fill="white" stroke={accent} strokeWidth="1.2" strokeOpacity="0.5" />
      {/* Vase neck line */}
      <line x1="141" y1="80" x2="163" y2="80" stroke={accent} strokeWidth="0.7" strokeOpacity="0.3" />
      {/* Flower stems */}
      <line x1="152" y1="62" x2="142" y2="38" stroke={accent} strokeWidth="1" strokeOpacity="0.5" />
      <line x1="152" y1="62" x2="152" y2="28" stroke={accent} strokeWidth="1" strokeOpacity="0.5" />
      <line x1="152" y1="62" x2="164" y2="36" stroke={accent} strokeWidth="1" strokeOpacity="0.5" />
      {/* Flower heads */}
      <circle cx="142" cy="34" r="8" fill="white" stroke={accent} strokeWidth="1.2" strokeOpacity="0.6" />
      <circle cx="142" cy="34" r="4" fill={accent} fillOpacity="0.2" />
      <circle cx="152" cy="24" r="9" fill="white" stroke={accent} strokeWidth="1.2" strokeOpacity="0.6" />
      <circle cx="152" cy="24" r="4" fill={accent} fillOpacity="0.25" />
      <circle cx="164" cy="32" r="7" fill="white" stroke={accent} strokeWidth="1.2" strokeOpacity="0.55" />
      <circle cx="164" cy="32" r="3.5" fill={accent} fillOpacity="0.18" />
      {/* Gold faucet */}
      <path d="M190 103 Q190 85 200 82 Q210 82 210 92" stroke="#D4A843" strokeWidth="4" strokeLinecap="round" fill="none" />
      <ellipse cx="200" cy="82" rx="5" ry="3" fill="#D4A843" />
    </svg>
  );
}

/* ── KIDS — Montessori wooden shelf with toys ── */
function KidsIllustration({ accent }: { accent: string }) {
  return (
    <svg width="220" height="180" viewBox="0 0 220 180" fill="none"
      style={{ position: 'absolute', right: -10, top: 0 }}>
      {/* Shelf unit — warm wood */}
      {/* Outer frame */}
      <rect x="75" y="12" width="140" height="162" rx="6" fill="#F5ECD8" stroke={accent} strokeWidth="1.5" strokeOpacity="0.5" />
      {/* Shelf 1 */}
      <rect x="75" y="54" width="140" height="8" rx="2" fill="#E8D8B8" stroke={accent} strokeWidth="0.8" strokeOpacity="0.4" />
      {/* Shelf 2 */}
      <rect x="75" y="104" width="140" height="8" rx="2" fill="#E8D8B8" stroke={accent} strokeWidth="0.8" strokeOpacity="0.4" />
      {/* Wood grain on frame sides */}
      <line x1="80" y1="20" x2="80" y2="170" stroke={accent} strokeWidth="0.6" strokeOpacity="0.15" />
      <line x1="210" y1="20" x2="210" y2="170" stroke={accent} strokeWidth="0.6" strokeOpacity="0.15" />

      {/* TOP SHELF: plant + stacking rings */}
      {/* Plant pot */}
      <path d="M90 54 Q86 40 88 30 Q90 24 96 24 Q102 24 104 30 Q106 40 102 54 Z" fill="white" stroke={accent} strokeWidth="1.2" strokeOpacity="0.5" />
      <rect x="85" y="50" width="20" height="5" rx="2" fill={accent} fillOpacity="0.2" stroke={accent} strokeWidth="0.8" strokeOpacity="0.4" />
      {/* Leaves */}
      <path d="M96 24 Q82 18 80 8 Q90 8 96 24" fill={accent} fillOpacity="0.25" stroke={accent} strokeWidth="0.8" strokeOpacity="0.5" />
      <path d="M96 24 Q110 15 114 6 Q104 8 96 24" fill={accent} fillOpacity="0.2" stroke={accent} strokeWidth="0.8" strokeOpacity="0.5" />
      {/* Stacking rainbow rings */}
      <ellipse cx="170" cy="53" rx="24" ry="5" fill="#C4788A" fillOpacity="0.35" stroke="#C4788A" strokeWidth="1" />
      <ellipse cx="170" cy="46" rx="18" ry="4" fill="#D4956A" fillOpacity="0.35" stroke="#D4956A" strokeWidth="1" />
      <ellipse cx="170" cy="40" rx="13" ry="3.5" fill="#D4A843" fillOpacity="0.35" stroke="#D4A843" strokeWidth="1" />
      <ellipse cx="170" cy="35" rx="9" ry="3" fill="#8FA888" fillOpacity="0.45" stroke="#8FA888" strokeWidth="1" />
      <ellipse cx="170" cy="31" rx="5" ry="2.5" fill="#A78BCA" fillOpacity="0.45" stroke="#A78BCA" strokeWidth="1" />
      <line x1="170" y1="28" x2="170" y2="16" stroke={accent} strokeWidth="1" strokeOpacity="0.4" />
      <circle cx="170" cy="15" r="4" fill={accent} fillOpacity="0.3" />

      {/* MIDDLE SHELF: giraffe + teddy + books */}
      {/* Books */}
      <rect x="83" y="66" width="8" height="38" rx="2" fill="#C4788A" fillOpacity="0.4" stroke="#C4788A" strokeWidth="0.8" />
      <rect x="93" y="68" width="7" height="36" rx="2" fill="#D4A843" fillOpacity="0.4" stroke="#D4A843" strokeWidth="0.8" />
      <rect x="102" y="64" width="9" height="40" rx="2" fill="#8FA888" fillOpacity="0.4" stroke="#8FA888" strokeWidth="0.8" />
      {/* Giraffe */}
      <rect x="118" y="80" width="12" height="24" rx="4" fill="white" stroke={accent} strokeWidth="1.2" strokeOpacity="0.5" />
      <ellipse cx="124" cy="78" rx="9" ry="8" fill="white" stroke={accent} strokeWidth="1.2" strokeOpacity="0.5" />
      <line x1="122" y1="70" x2="120" y2="60" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="126" y1="70" x2="128" y2="60" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
      <circle cx="120" cy="58" r="3" fill={accent} fillOpacity="0.4" />
      <circle cx="128" cy="58" r="3" fill={accent} fillOpacity="0.4" />
      {/* Giraffe spots */}
      <circle cx="124" cy="76" r="2" fill={accent} fillOpacity="0.3" />
      <circle cx="121" cy="84" r="2.5" fill={accent} fillOpacity="0.25" />
      <circle cx="127" cy="90" r="2" fill={accent} fillOpacity="0.3" />
      {/* Teddy bear */}
      <circle cx="170" cy="93" r="14" fill="white" stroke={accent} strokeWidth="1.2" strokeOpacity="0.5" />
      <circle cx="160" cy="82" r="7" fill="white" stroke={accent} strokeWidth="1.2" strokeOpacity="0.5" />
      <circle cx="180" cy="82" r="7" fill="white" stroke={accent} strokeWidth="1.2" strokeOpacity="0.5" />
      <circle cx="166" cy="91" r="2.5" fill={accent} fillOpacity="0.5" />
      <circle cx="174" cy="91" r="2.5" fill={accent} fillOpacity="0.5" />
      <ellipse cx="170" cy="98" rx="4" ry="2.5" fill={accent} fillOpacity="0.35" />
      <path d="M166 103 Q170 107 174 103" stroke={accent} strokeWidth="1.2" strokeLinecap="round" fill="none" strokeOpacity="0.6" />

      {/* BOTTOM SHELF: wicker basket + shape sorter */}
      {/* Wicker basket */}
      <path d="M88 112 Q82 120 83 140 Q84 148 100 148 Q116 148 117 140 Q118 120 112 112 Z" fill="#E8D0A8" stroke={accent} strokeWidth="1" strokeOpacity="0.5" />
      <line x1="83" y1="124" x2="117" y2="124" stroke={accent} strokeWidth="0.8" strokeOpacity="0.3" />
      <line x1="83" y1="132" x2="117" y2="132" stroke={accent} strokeWidth="0.8" strokeOpacity="0.3" />
      <line x1="83" y1="140" x2="117" y2="140" stroke={accent} strokeWidth="0.8" strokeOpacity="0.3" />
      {/* Basket handle */}
      <path d="M90 112 Q100 104 110 112" stroke={accent} strokeWidth="1.5" fill="none" strokeOpacity="0.5" />
      {/* Shape sorter box */}
      <rect x="140" y="112" width="40" height="36" rx="5" fill="white" stroke={accent} strokeWidth="1.2" strokeOpacity="0.5" />
      <rect x="140" y="112" width="40" height="10" rx="5" fill={accent} fillOpacity="0.15" />
      {/* Holes */}
      <circle cx="152" cy="134" r="5" fill={accent} fillOpacity="0.2" stroke={accent} strokeWidth="0.8" strokeOpacity="0.4" />
      <rect x="160" y="129" width="9" height="9" rx="2" fill={accent} fillOpacity="0.2" stroke={accent} strokeWidth="0.8" strokeOpacity="0.4" />
    </svg>
  );
}

/* ── SELF-CARE — luxury spa: amber glow, candles, orchids, marble ── */
function SelfCareIllustration({ accent: _accent }: { accent: string }) {
  const glow = '#D4A843';
  return (
    <svg width="220" height="180" viewBox="0 0 220 180" fill="none"
      style={{ position: 'absolute', right: -10, top: 0 }}>
      {/* Warm amber ambient glow */}
      <ellipse cx="150" cy="90" rx="80" ry="80" fill="#D4A843" fillOpacity="0.08" />
      <ellipse cx="120" cy="110" rx="60" ry="50" fill="#D4A843" fillOpacity="0.06" />

      {/* Wooden shelf / niche back panel */}
      <rect x="55" y="20" width="160" height="110" rx="6" fill="rgba(90,60,30,0.06)" stroke="rgba(90,60,30,0.12)" strokeWidth="1" />
      {/* LED strip lighting at top of niche */}
      <rect x="55" y="20" width="160" height="5" rx="3" fill={glow} fillOpacity="0.25" />
      <rect x="55" y="130" width="160" height="5" rx="3" fill={glow} fillOpacity="0.18" />

      {/* Marble counter */}
      <rect x="40" y="135" width="175" height="30" rx="4" fill="white" stroke={glow} strokeWidth="0.8" strokeOpacity="0.4" />
      {/* Marble veins */}
      <path d="M50 140 Q100 136 140 142 Q170 147 210 138" stroke="rgba(90,74,66,0.12)" strokeWidth="1.2" fill="none" />
      <path d="M80 158 Q120 153 165 160" stroke="rgba(90,74,66,0.08)" strokeWidth="0.8" fill="none" />

      {/* Gold tray */}
      <rect x="88" y="130" width="70" height="8" rx="4" fill={glow} fillOpacity="0.4" stroke={glow} strokeWidth="1" />

      {/* Tall candle */}
      <rect x="105" y="68" width="16" height="64" rx="5" fill="rgba(255,255,255,0.85)" stroke="rgba(212,168,67,0.4)" strokeWidth="1.2" />
      <rect x="107" y="70" width="12" height="60" rx="4" fill="rgba(255,248,220,0.6)" />
      {/* Tall candle flame */}
      <path d="M113 40 Q106 54 106 66 Q106 72 113 72 Q120 72 120 66 Q120 54 113 40Z" fill={glow} fillOpacity="0.7" stroke={glow} strokeWidth="0.8" />
      <path d="M113 50 Q109 60 109 66 Q109 70 113 70 Q117 70 117 66 Q117 60 113 50Z" fill="white" fillOpacity="0.8" />
      {/* Candle glow */}
      <ellipse cx="113" cy="72" rx="20" ry="8" fill={glow} fillOpacity="0.12" />

      {/* Medium candle */}
      <rect x="134" y="95" width="13" height="37" rx="4" fill="rgba(255,255,255,0.85)" stroke="rgba(212,168,67,0.35)" strokeWidth="1" />
      {/* Medium candle flame */}
      <path d="M140.5 78 Q136 87 136 94 Q136 98 140.5 98 Q145 98 145 94 Q145 87 140.5 78Z" fill={glow} fillOpacity="0.65" stroke={glow} strokeWidth="0.7" />
      <ellipse cx="140.5" cy="98" rx="14" ry="6" fill={glow} fillOpacity="0.1" />

      {/* Small candle */}
      <rect x="152" y="110" width="10" height="22" rx="3" fill="rgba(255,255,255,0.85)" stroke="rgba(212,168,67,0.3)" strokeWidth="1" />
      {/* Small flame */}
      <path d="M157 100 Q153 107 153 109 Q153 112 157 112 Q161 112 161 109 Q161 107 157 100Z" fill={glow} fillOpacity="0.55" />

      {/* White orchid — stems */}
      <line x1="83" y1="135" x2="83" y2="55" stroke="rgba(90,74,66,0.3)" strokeWidth="1.5" />
      <line x1="83" y1="100" x2="65" y2="80" stroke="rgba(90,74,66,0.25)" strokeWidth="1.2" />
      <line x1="83" y1="85" x2="98" y2="65" stroke="rgba(90,74,66,0.25)" strokeWidth="1.2" />
      <line x1="83" y1="70" x2="70" y2="52" stroke="rgba(90,74,66,0.25)" strokeWidth="1.2" />
      {/* Orchid blooms */}
      {[[65, 76], [98, 61], [70, 48], [83, 52]].map(([cx, cy], i) => (
        <g key={i}>
          <ellipse cx={cx} cy={cy} rx="10" ry="7" fill="rgba(255,255,255,0.9)" stroke="rgba(212,168,67,0.3)" strokeWidth="1" />
          <ellipse cx={cx} cy={cy} rx="10" ry="7" fill="rgba(255,255,255,0.9)" stroke="rgba(212,168,67,0.3)" strokeWidth="1" transform={`rotate(72 ${cx} ${cy})`} />
          <ellipse cx={cx} cy={cy} rx="10" ry="7" fill="rgba(255,255,255,0.9)" stroke="rgba(212,168,67,0.3)" strokeWidth="1" transform={`rotate(144 ${cx} ${cy})`} />
          <circle cx={cx} cy={cy} r="4" fill={glow} fillOpacity="0.35" />
          <circle cx={cx} cy={cy} r="2" fill={glow} fillOpacity="0.6" />
        </g>
      ))}
      {/* Orchid ceramic pot */}
      <path d="M77 135 Q74 125 75 120 Q76 116 83 116 Q90 116 91 120 Q92 125 89 135 Z" fill="white" stroke="rgba(212,168,67,0.3)" strokeWidth="1" />

      {/* Folded white towels on shelf */}
      <rect x="168" y="40" width="38" height="16" rx="4" fill="white" stroke="rgba(212,168,67,0.25)" strokeWidth="1" />
      <rect x="170" y="58" width="34" height="14" rx="3" fill="rgba(255,255,255,0.9)" stroke="rgba(212,168,67,0.2)" strokeWidth="0.8" />
      <rect x="172" y="74" width="30" height="13" rx="3" fill="rgba(255,255,255,0.85)" stroke="rgba(212,168,67,0.2)" strokeWidth="0.8" />
      {/* Towel lines */}
      <line x1="168" y1="48" x2="206" y2="48" stroke="rgba(212,168,67,0.15)" strokeWidth="0.8" />
      <line x1="170" y1="65" x2="204" y2="65" stroke="rgba(212,168,67,0.12)" strokeWidth="0.7" />
    </svg>
  );
}

/* ── WORKOUT — blush pink gym: tall windows, treadmill, dumbbells ── */
function WorkoutIllustration({ accent }: { accent: string }) {
  return (
    <svg width="220" height="180" viewBox="0 0 220 180" fill="none"
      style={{ position: 'absolute', right: -10, top: 0 }}>
      {/* Room wall */}
      <rect x="40" y="10" width="175" height="165" rx="4" fill="rgba(255,255,255,0.5)" />

      {/* Tall windows — left pair */}
      <rect x="48" y="16" width="32" height="100" rx="4" fill="rgba(200,220,240,0.35)" stroke={accent} strokeWidth="1.2" strokeOpacity="0.4" />
      <line x1="64" y1="16" x2="64" y2="116" stroke={accent} strokeWidth="0.8" strokeOpacity="0.3" />
      <line x1="48" y1="66" x2="80" y2="66" stroke={accent} strokeWidth="0.8" strokeOpacity="0.3" />
      {/* Window frame dividers */}
      <rect x="84" y="16" width="28" height="100" rx="4" fill="rgba(200,220,240,0.3)" stroke={accent} strokeWidth="1.2" strokeOpacity="0.4" />
      <line x1="98" y1="16" x2="98" y2="116" stroke={accent} strokeWidth="0.8" strokeOpacity="0.3" />
      <line x1="84" y1="66" x2="112" y2="66" stroke={accent} strokeWidth="0.8" strokeOpacity="0.3" />
      {/* Light rays from windows */}
      <line x1="64" y1="116" x2="48" y2="175" stroke={accent} strokeWidth="1" strokeOpacity="0.08" />
      <line x1="64" y1="116" x2="80" y2="175" stroke={accent} strokeWidth="1" strokeOpacity="0.08" />
      <line x1="98" y1="116" x2="82" y2="175" stroke={accent} strokeWidth="1" strokeOpacity="0.06" />

      {/* Pink curtain panel */}
      <path d="M116 16 Q118 50 114 90 Q112 120 116 165" stroke="#C4788A" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.35" fill="none" />
      <path d="M120 16 Q126 50 122 90 Q118 120 122 165" stroke="#C4788A" strokeWidth="1.5" strokeOpacity="0.2" strokeLinecap="round" fill="none" />

      {/* Treadmill */}
      <g transform="translate(130, 85)">
        {/* Treadmill frame angled */}
        <rect x="0" y="30" width="70" height="8" rx="3" fill="white" stroke={accent} strokeWidth="1.2" strokeOpacity="0.5" />
        {/* Belt */}
        <rect x="4" y="32" width="62" height="4" rx="2" fill={accent} fillOpacity="0.12" />
        {/* Upright handles */}
        <line x1="18" y1="30" x2="14" y2="0" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
        <line x1="52" y1="30" x2="56" y2="0" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
        {/* Handlebar */}
        <line x1="14" y1="0" x2="56" y2="0" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
        {/* Screen */}
        <rect x="26" y="-8" width="18" height="12" rx="3" fill="white" stroke={accent} strokeWidth="1" strokeOpacity="0.5" />
        <rect x="28" y="-6" width="14" height="8" rx="2" fill={accent} fillOpacity="0.15" />
        {/* Wheels/rollers */}
        <circle cx="8" cy="38" r="5" fill="white" stroke={accent} strokeWidth="1.2" strokeOpacity="0.5" />
        <circle cx="62" cy="38" r="5" fill="white" stroke={accent} strokeWidth="1.2" strokeOpacity="0.5" />
      </g>

      {/* Dumbbell rack */}
      <rect x="138" y="42" width="52" height="42" rx="4" fill="white" stroke={accent} strokeWidth="1" strokeOpacity="0.4" />
      {/* Shelves */}
      <line x1="138" y1="56" x2="190" y2="56" stroke={accent} strokeWidth="0.8" strokeOpacity="0.3" />
      <line x1="138" y1="70" x2="190" y2="70" stroke={accent} strokeWidth="0.8" strokeOpacity="0.3" />
      {/* Dumbbells on rack */}
      {[0, 1, 2].map(row => (
        [0, 1].map(col => (
          <g key={`${row}-${col}`} transform={`translate(${144 + col * 26}, ${46 + row * 14})`}>
            <rect x="0" y="2" width="18" height="5" rx="2.5" fill={accent} fillOpacity="0.3" stroke={accent} strokeWidth="0.8" strokeOpacity="0.4" />
            <rect x="-2" y="0" width="6" height="9" rx="2" fill={accent} fillOpacity="0.4" stroke={accent} strokeWidth="0.7" />
            <rect x="14" y="0" width="6" height="9" rx="2" fill={accent} fillOpacity="0.4" stroke={accent} strokeWidth="0.7" />
          </g>
        ))
      ))}

      {/* Pink exercise ball */}
      <circle cx="68" cy="148" r="22" fill="white" stroke="#C4788A" strokeWidth="1.5" strokeOpacity="0.45" />
      <circle cx="68" cy="148" r="22" fill="#C4788A" fillOpacity="0.1" />
      <ellipse cx="62" cy="140" rx="7" ry="4" fill="white" fillOpacity="0.5" transform="rotate(-30 62 140)" />

      {/* Yoga mat */}
      <rect x="44" y="160" width="80" height="12" rx="4" fill="#C4788A" fillOpacity="0.15" stroke="#C4788A" strokeWidth="0.8" strokeOpacity="0.4" />
      <line x1="44" y1="166" x2="124" y2="166" stroke="#C4788A" strokeWidth="0.6" strokeOpacity="0.3" />
    </svg>
  );
}

const ILLUSTRATIONS = {
  tasks: TasksIllustration,
  budget: BudgetIllustration,
  kitchen: KitchenIllustration,
  kids: KidsIllustration,
  selfcare: SelfCareIllustration,
  workout: WorkoutIllustration,
};

export function LuxuryScreenHeader({ screen, title, subtitle }: LuxuryHeaderProps) {
  const config = CONFIGS[screen];
  const Illustration = ILLUSTRATIONS[screen];
  const isDark = 'dark' in config && config.dark;

  return (
    <div
      style={{
        background: config.bg,
        height: 180,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '0 24px 24px',
      }}
    >
      {/* Illustration */}
      <Illustration accent={config.accent} />

      {/* Title */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 300,
          color: isDark ? 'rgba(255,255,255,0.95)' : '#3D2B35',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          margin: 0,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: 11,
            color: isDark ? 'rgba(212,168,67,0.9)' : config.accent,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginTop: 4,
            fontWeight: 500,
          }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Bottom fade border */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${config.accent}50 50%, transparent 100%)`,
      }} />
    </div>
  );
}
