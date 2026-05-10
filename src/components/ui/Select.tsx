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
        className={`bg-[var(--bg-primary)] border border-white/10 rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#E91E8C] transition-colors appearance-none ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#1a1a2e]">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
