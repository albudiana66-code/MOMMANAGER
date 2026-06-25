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
        className={`rounded-xl px-4 py-3 text-sm placeholder:text-[var(--text-muted)] focus:outline-none transition-colors ${className}`}
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'; }}
        onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)'; }}
        {...props}
      />
      {error && <span className="text-red-500 text-xs">{error}</span>}
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
        className={`rounded-xl px-4 py-3 text-sm placeholder:text-[var(--text-muted)] focus:outline-none transition-colors resize-none ${className}`}
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--accent)'; }}
        onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border)'; }}
        {...props}
      />
      {error && <span className="text-red-500 text-xs">{error}</span>}
    </div>
  );
}
