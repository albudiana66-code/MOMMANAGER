import { type ReactNode } from 'react';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  title?: string;
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
}

export function Header({ title, left, right, children }: HeaderProps) {
  const { theme, toggleTheme } = useApp();

  return (
    <header className="sticky top-0 z-40 px-5 py-4 bg-[var(--bg-primary)] border-b border-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {left}
          {title && <h1 className="text-lg font-bold text-[var(--text-primary)]">{title}</h1>}
        </div>
        <div className="flex items-center gap-2">
          {right}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl bg-[var(--bg-card)] flex items-center justify-center text-lg border border-white/10"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      {children}
    </header>
  );
}
