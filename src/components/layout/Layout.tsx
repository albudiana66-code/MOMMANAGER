import { type CSSProperties, type ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { useApp } from '../../context/AppContext';

interface LayoutProps {
  children: ReactNode;
  noNav?: boolean;
  style?: CSSProperties;
  background?: string;
}

export function Layout({ children, noNav, style, background }: LayoutProps) {
  const { theme } = useApp();

  return (
    <div className="flex flex-col min-h-screen pb-20" style={{ position: 'relative', ...style }}>
      {/* Fixed full-screen background */}
      {background && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
        }} />
      )}
      {/* Warm dark overlay — only in dark mode */}
      {theme === 'dark' && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(30,16,10,0.42)',
          zIndex: 0,
          pointerEvents: 'none',
        }} />
      )}
      <main className="flex-1" style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </main>
      {!noNav && <BottomNav />}
    </div>
  );
}
