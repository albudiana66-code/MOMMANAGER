import { type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[var(--text-secondary)]">{label}</label>}
      <input
        className={`bg-[var(--bg-primary)] border border-white/10 rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[#E91E8C] transition-colors ${className}`}
        {...props}
      />
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[var(--text-secondary)]">{label}</label>}
      <textarea
        className={`bg-[var(--bg-primary)] border border-white/10 rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[#E91E8C] transition-colors resize-none ${className}`}
        {...props}
      />
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  );
}
