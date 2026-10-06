import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { AppLogo } from '../ui/AppLogo';

interface HeaderProps {
  title?: string;
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
}

export function Header({ title, left, right, children }: HeaderProps) {
  const { theme, toggleTheme } = useApp();
  const { t } = useTranslation();

  return (
    <header
      className="sticky top-0 z-40 px-5 py-3"
      style={{
        background: 'rgba(255,255,255,0.45)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.5)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {left}
          <AppLogo size={40} />
          {title && (
            <h1
              className="text-lg text-[var(--text-primary)]"
              style={{ fontWeight: 600, letterSpacing: '-0.03em' }}
            >
              {title}
            </h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          {right}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
            aria-label={t('common.toggleTheme')}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      {children}
    </header>
  );
}
