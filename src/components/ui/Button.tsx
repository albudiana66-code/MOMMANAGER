import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base = 'rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50';

  const variants = {
    primary: 'bg-[#E91E8C] text-white active:scale-95 shadow-lg shadow-pink-500/20',
    secondary: 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-white/10',
    ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
    danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-3 text-sm',
    lg: 'px-6 py-4 text-base w-full',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : children}
    </button>
  );
}
