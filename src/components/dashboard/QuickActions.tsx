import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

function CalendarWatermark({ color }: { color: string }) {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', bottom: -5, right: -5, opacity: 0.18, pointerEvents: 'none' }}>
      <rect x="8" y="14" width="64" height="68" rx="6" stroke={color} strokeWidth="3" />
      <rect x="8" y="14" width="64" height="16" rx="6" fill={color} fillOpacity="0.2" />
      <rect x="8" y="22" width="64" height="8" fill={color} fillOpacity="0.2" />
      <circle cx="22" cy="11" r="4" stroke={color} strokeWidth="2.5" fill={color} fillOpacity="0.3" />
      <circle cx="40" cy="11" r="4" stroke={color} strokeWidth="2.5" fill={color} fillOpacity="0.3" />
      <circle cx="58" cy="11" r="4" stroke={color} strokeWidth="2.5" fill={color} fillOpacity="0.3" />
      <line x1="8" y1="46" x2="72" y2="46" stroke={color} strokeWidth="1.5" />
      <line x1="8" y1="62" x2="72" y2="62" stroke={color} strokeWidth="1.5" />
      <line x1="29" y1="30" x2="29" y2="82" stroke={color} strokeWidth="1.5" />
      <line x1="50" y1="30" x2="50" y2="82" stroke={color} strokeWidth="1.5" />
      <circle cx="18" cy="38" r="3" fill={color} fillOpacity="0.5" />
      <circle cx="40" cy="38" r="3" fill={color} fillOpacity="0.5" />
      <circle cx="61" cy="38" r="3" fill={color} fillOpacity="0.5" />
      <circle cx="18" cy="54" r="3" fill={color} />
      <circle cx="40" cy="54" r="3" fill={color} fillOpacity="0.5" />
    </svg>
  );
}

function TeddyWatermark({ color }: { color: string }) {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', bottom: -5, right: -5, opacity: 0.18, pointerEvents: 'none' }}>
      <circle cx="22" cy="28" r="13" stroke={color} strokeWidth="3" />
      <circle cx="22" cy="28" r="7" fill={color} fillOpacity="0.3" />
      <circle cx="68" cy="28" r="13" stroke={color} strokeWidth="3" />
      <circle cx="68" cy="28" r="7" fill={color} fillOpacity="0.3" />
      <circle cx="45" cy="52" r="30" stroke={color} strokeWidth="3" />
      <circle cx="35" cy="46" r="4.5" fill={color} />
      <circle cx="55" cy="46" r="4.5" fill={color} />
      <ellipse cx="45" cy="56" rx="6" ry="4" fill={color} fillOpacity="0.7" />
      <path d="M37 64 Q45 72 53 64" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function PotWatermark({ color }: { color: string }) {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', bottom: -5, right: -5, opacity: 0.18, pointerEvents: 'none' }}>
      <path d="M28 22 Q25 15 28 8 Q31 1 28 -4" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M45 22 Q42 15 45 8 Q48 1 45 -4" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M62 22 Q59 15 62 8 Q65 1 62 -4" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <rect x="18" y="24" width="54" height="9" rx="4" stroke={color} strokeWidth="2.5" />
      <rect x="36" y="18" width="18" height="8" rx="4" stroke={color} strokeWidth="2.5" />
      <rect x="14" y="33" width="62" height="48" rx="10" stroke={color} strokeWidth="3" />
      <path d="M14 44 Q4 44 4 54 Q4 64 14 64" stroke={color} strokeWidth="2.5" fill="none" />
      <path d="M76 44 Q86 44 86 54 Q86 64 76 64" stroke={color} strokeWidth="2.5" fill="none" />
      <ellipse cx="30" cy="48" rx="6" ry="4" fill={color} fillOpacity="0.3" />
    </svg>
  );
}

function CardWatermark({ color }: { color: string }) {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', bottom: -5, right: -5, opacity: 0.18, pointerEvents: 'none' }}>
      <rect x="4" y="18" width="74" height="48" rx="7" stroke={color} strokeWidth="3" />
      <rect x="4" y="26" width="74" height="10" fill={color} fillOpacity="0.3" />
      <rect x="14" y="44" width="14" height="11" rx="2.5" stroke={color} strokeWidth="2" />
      <line x1="14" y1="49.5" x2="28" y2="49.5" stroke={color} strokeWidth="1.2" />
      <line x1="21" y1="44" x2="21" y2="55" stroke={color} strokeWidth="1.2" />
      <line x1="14" y1="62" x2="64" y2="62" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="55" x2="44" y2="55" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="70" cy="72" r="12" stroke={color} strokeWidth="2.5" />
      <text x="64" y="77" fontSize="12" fontWeight="bold" fill={color} fillOpacity="0.7">$</text>
    </svg>
  );
}

function LotusWatermark({ color }: { color: string }) {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', bottom: -5, right: -5, opacity: 0.18, pointerEvents: 'none' }}>
      <rect x="38" y="52" width="14" height="30" rx="4" stroke={color} strokeWidth="2.5" />
      <path d="M45 28 Q38 40 38 50 Q38 56 45 56 Q52 56 52 50 Q52 40 45 28Z" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.25" />
      <circle cx="20" cy="64" r="9" stroke={color} strokeWidth="2.5" fill={color} fillOpacity="0.15" />
      <ellipse cx="20" cy="52" rx="6" ry="11" stroke={color} strokeWidth="2" fill="none" />
      <ellipse cx="9" cy="58" rx="6" ry="11" stroke={color} strokeWidth="2" fill="none" transform="rotate(-50 9 58)" />
      <ellipse cx="31" cy="58" rx="6" ry="11" stroke={color} strokeWidth="2" fill="none" transform="rotate(50 31 58)" />
      <line x1="20" y1="73" x2="20" y2="84" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="68" cy="24" r="9" stroke={color} strokeWidth="2" />
      <circle cx="78" cy="42" r="6" stroke={color} strokeWidth="2" />
      <circle cx="62" cy="44" r="4" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

function DumbbellWatermark({ color }: { color: string }) {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', bottom: -5, right: -5, opacity: 0.18, pointerEvents: 'none' }}>
      <line x1="18" y1="45" x2="72" y2="45" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <rect x="4" y="32" width="16" height="26" rx="5" stroke={color} strokeWidth="2.5" />
      <rect x="2" y="36" width="8" height="18" rx="3" stroke={color} strokeWidth="2" />
      <rect x="70" y="32" width="16" height="26" rx="5" stroke={color} strokeWidth="2.5" />
      <rect x="80" y="36" width="8" height="18" rx="3" stroke={color} strokeWidth="2" />
      <path d="M50 10 L43 28 L50 28 L40 48" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <polyline points="6,76 18,76 24,65 30,84 36,72 42,76 54,76 60,68 66,76 84,76"
        stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

const ACTIONS: { emoji: string; labelKey: string; label?: string; to: string; accent: string; Watermark: (p: { color: string }) => React.ReactElement }[] = [
  {
    emoji: '📅',
    labelKey: 'nav.tasks',
    to: '/tasks',
    accent: '#C4788A',
    Watermark: CalendarWatermark,
  },
  {
    emoji: '🧸',
    labelKey: 'nav.kids',
    to: '/kids',
    accent: '#E8A87C',
    Watermark: TeddyWatermark,
  },
  {
    emoji: '🍳',
    labelKey: 'nav.kitchen',
    to: '/kitchen',
    accent: '#D4A843',
    Watermark: PotWatermark,
  },
  {
    emoji: '💳',
    labelKey: 'nav.budget',
    to: '/budget',
    accent: '#7FB069',
    Watermark: CardWatermark,
  },
  {
    emoji: '💆‍♀️',
    labelKey: 'nav.selfcare',
    to: '/self-care',
    accent: '#A78BCA',
    Watermark: LotusWatermark,
  },
  {
    emoji: '💪',
    labelKey: '',
    label: 'Workout' as string | undefined,
    to: '/self-care',
    accent: '#7BAFC4',
    Watermark: DumbbellWatermark,
  },
];

export function QuickActions() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="mt-4">
      {/* Section label */}
      <div className="flex items-center px-4 mb-2">
        <h3 style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: 'rgba(61,43,31,0.5)', margin: 0 }}>
          {t('dashboard.quickActions')}
        </h3>
      </div>

      {/* Horizontal scroll row */}
      <div
        className="flex"
        style={{
          overflowX: 'auto',
          gap: 10,
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 4,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {ACTIONS.map((a, i) => (
          <motion.button
            key={a.to + a.labelKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, type: 'spring', stiffness: 320, damping: 22 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => navigate(a.to)}
            style={{
              flexShrink: 0,
              width: 70,
              minHeight: 82,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.48)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              border: '1px solid rgba(255,255,255,0.70)',
              boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              padding: '12px 4px 14px',
            }}
          >
            {/* SVG watermark illustration */}
            <a.Watermark color={a.accent} />

            {/* Emoji */}
            <span style={{ fontSize: 24, lineHeight: 1, position: 'relative', zIndex: 2 }}>
              {a.emoji}
            </span>

            {/* Label */}
            <span style={{
              fontSize: 9,
              fontWeight: 600,
              color: '#7A6A62',
              lineHeight: 1,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              position: 'relative',
              zIndex: 2,
            }}>
              {a.label ?? t(a.labelKey)}
            </span>

            {/* Bottom accent strip */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              background: a.accent,
              borderRadius: '0 0 16px 16px',
            }} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
