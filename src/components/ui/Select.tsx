import { type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[var(--text-secondary)]">{label}</label>}
      <select
        className={`rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors appearance-none ${className}`}
        style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.40)', color: 'var(--text-primary)' }}
        onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = 'var(--accent)'; }}
        onBlur={(e) => { (e.target as HTMLSelectElement).style.borderColor = 'var(--border)'; }}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
