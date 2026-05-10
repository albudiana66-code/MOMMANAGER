interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <div className="flex items-center gap-3 cursor-pointer" onClick={() => onChange(!checked)}>
      {label && <span className="text-sm text-[var(--text-primary)]">{label}</span>}
      <div className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-[#E91E8C]' : 'bg-white/20'}`}>
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-0.5'}`}
        />
      </div>
    </div>
  );
}
