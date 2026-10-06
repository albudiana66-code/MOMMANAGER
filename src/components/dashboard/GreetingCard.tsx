import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useDateFnsLocale } from '../../hooks/useDateFnsLocale';
import { format } from 'date-fns';

export function GreetingCard() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { theme, toggleTheme } = useApp();
  const dateLocale = useDateFnsLocale();
  const hour = new Date().getHours();

  let greeting = t('dashboard.goodMorning');
  let timeEmoji = '🌸';
  if (hour >= 12 && hour < 18) {
    greeting = t('dashboard.goodAfternoon');
    timeEmoji = '☀️';
  } else if (hour >= 18) {
    greeting = t('dashboard.goodEvening');
    timeEmoji = '🌙';
  }

  const name = profile?.name?.split(' ')[0] || '';

  return (
    <div className="px-4 pt-4">
      <div
        style={{
          background: 'linear-gradient(135deg, #FFFBF5 0%, #FFF8EE 50%, #FFF5F0 100%)',
          borderRadius: 24,
          padding: '22px 24px',
          border: '1px solid rgba(212,168,67,0.25)',
          boxShadow: '0 4px 24px rgba(212,168,67,0.10), 0 1px 4px rgba(196,120,138,0.08)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: 140,
        }}
      >
        {/* Gold foil shimmer — top right */}
        <div style={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,168,67,0.14) 0%, rgba(232,200,112,0.06) 50%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Decorative gold arc line */}
        <svg width="120" height="60" viewBox="0 0 120 60" fill="none"
          style={{ position: 'absolute', top: 8, right: 16, opacity: 0.12, pointerEvents: 'none' }}>
          <path d="M10 55 Q60 -10 110 55" stroke="#D4A843" strokeWidth="1.5" fill="none" />
          <path d="M20 55 Q60 0 100 55" stroke="#D4A843" strokeWidth="1" fill="none" />
          <circle cx="60" cy="8" r="3" fill="#D4A843" />
          <circle cx="10" cy="55" r="2" fill="#D4A843" />
          <circle cx="110" cy="55" r="2" fill="#D4A843" />
        </svg>

        {/* White flower accent */}
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none"
          style={{ position: 'absolute', bottom: 10, right: 60, opacity: 0.18, pointerEvents: 'none' }}>
          {[0,60,120,180,240,300].map(angle => (
            <ellipse key={angle} cx="24" cy="24" rx="5" ry="11"
              fill="#C4788A" transform={`rotate(${angle} 24 24)`} />
          ))}
          <circle cx="24" cy="24" r="5" fill="#D4A843" />
        </svg>

        {/* Date */}
        <p style={{ fontSize: 11, color: '#B8914A', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>
          {format(new Date(), 'EEEE, MMMM d', { locale: dateLocale })}
        </p>

        {/* Greeting */}
        <h2 style={{ fontSize: 24, fontWeight: 300, color: '#3D2B1F', letterSpacing: '-0.01em', lineHeight: 1.25, margin: 0 }}>
          {greeting}{name ? `, ${name}` : ''} {timeEmoji}
        </h2>

        {/* Theme toggle — gold circle */}
        <button
          onClick={toggleTheme}
          aria-label={t('settings.toggleTheme')}
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #D4A843 0%, #E8C870 100%)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(212,168,67,0.35)',
          }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  );
}
