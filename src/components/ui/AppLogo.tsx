interface AppLogoProps {
  size?: number;
}

export function AppLogo({ size = 48 }: AppLogoProps) {
  const r = size * 0.28;
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: r,
      background: 'linear-gradient(135deg, #E8D5C4 0%, #D4A843 100%)',
      boxShadow: '0 4px 16px rgba(212,168,67,0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 48 48" fill="none">
        {/* Heart shape */}
        <path
          d="M24 40 C24 40 6 28 6 17 C6 11.5 10.5 7 16 7 C19.5 7 22.5 8.8 24 11.5 C25.5 8.8 28.5 7 32 7 C37.5 7 42 11.5 42 17 C42 28 24 40 24 40Z"
          fill="rgba(255,255,255,0.30)"
          stroke="rgba(255,255,255,0.80)"
          strokeWidth="1.5"
        />
        {/* Crown on top */}
        <path
          d="M18 8 L20 4 L24 7 L28 4 L30 8"
          stroke="rgba(255,255,255,0.90)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Calendar grid inside heart */}
        <rect x="17" y="17" width="14" height="12" rx="2" fill="rgba(255,255,255,0.85)" />
        <line x1="17" y1="21" x2="31" y2="21" stroke="rgba(196,120,138,0.5)" strokeWidth="1" />
        <rect x="19" y="23" width="3" height="3" rx="0.5" fill="#C4788A" fillOpacity="0.7" />
        <rect x="23" y="23" width="3" height="3" rx="0.5" fill="#D4A843" fillOpacity="0.7" />
        <rect x="27" y="23" width="3" height="3" rx="0.5" fill="rgba(196,120,138,0.3)" />
        {/* Checkmark */}
        <path d="M20 25.5 L21.2 26.8 L23.5 24" stroke="#C4788A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </div>
  );
}
