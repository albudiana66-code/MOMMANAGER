import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { to: '/', emoji: '🏡', labelKey: 'nav.home' },
  { to: '/tasks', emoji: '📅', labelKey: 'nav.tasks' },
  { to: '/kids', emoji: '🧸', labelKey: 'nav.kids' },
  { to: '/kitchen', emoji: '🍳', labelKey: 'nav.kitchen' },
  { to: '/selfcare', emoji: '💆‍♀️', labelKey: 'nav.selfcare' },
  { to: '/budget', emoji: '💳', labelKey: 'nav.budget' },
];

export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        maxWidth: 430,
        margin: '0 auto',
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderTop: '1px solid rgba(196,120,138,0.10)',
        boxShadow: '0 -2px 20px rgba(196,120,138,0.06)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all"
          >
            {({ isActive }) => (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <motion.span
                  animate={{ scale: isActive ? 1.12 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  style={{ fontSize: 22, lineHeight: 1 }}
                >
                  {item.emoji}
                </motion.span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  color: isActive ? '#C4788A' : '#9A8880',
                  lineHeight: 1,
                }}>
                  {t(item.labelKey)}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-dot"
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: '#C4788A',
                      marginTop: 1,
                    }}
                  />
                )}
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
