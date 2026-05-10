import { type ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: ReactNode;
  noNav?: boolean;
}

export function Layout({ children, noNav }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen pb-20">
      <main className="flex-1">
        {children}
      </main>
      {!noNav && <BottomNav />}
    </div>
  );
}
