import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
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
  const base = 'rounded-[50px] font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]';

  const variants = {
    primary: 'text-white shadow-md',
    secondary: 'bg-transparent text-[#C4788A] border border-[#C4788A]',
    ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
    danger: 'bg-red-500/10 text-red-500 border border-red-500/20',
    gold: 'text-white shadow-md',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
      boxShadow: '0 4px 14px rgba(196,120,138,0.25)',
    },
    gold: {
      background: 'linear-gradient(135deg, var(--accent-gold) 0%, #B8935A 100%)',
      boxShadow: '0 4px 14px rgba(201,169,110,0.3)',
    },
    secondary: {},
    ghost: {},
    danger: {},
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-3 text-sm',
    lg: 'px-6 py-4 text-base w-full',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      style={variantStyles[variant]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : children}
    </button>
  );
}
