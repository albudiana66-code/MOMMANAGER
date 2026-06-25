import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  gold?: boolean;
}

export function Card({ children, className = '', onClick, gold }: CardProps) {
  const goldStyle: React.CSSProperties = gold ? {
    background: 'rgba(255,252,240,0.65)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(201,169,110,0.25)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
  } : {
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.30)',
    boxShadow: '0 1px 8px rgba(0,0,0,0.03)',
  };

  return (
    <div
      className={`rounded-3xl p-4 ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`}
      style={goldStyle}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
