import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../../hooks/useSubscription';

interface ProGateProps {
  children: ReactNode;
  feature?: string;
}

export function ProGate({ children, feature }: ProGateProps) {
  const { t } = useTranslation();
  const { canUseProFeature } = useSubscription();
  const navigate = useNavigate();

  if (canUseProFeature) return <>{children}</>;

  return (
    <div className="relative rounded-3xl overflow-hidden">
      {/* Blurred preview */}
      <div style={{ filter: 'blur(3px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.5 }}>
        {children}
      </div>

      {/* Lock overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl"
        style={{ background: 'rgba(250,248,245,0.88)', backdropFilter: 'blur(4px)' }}
      >
        {/* Lock icon */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, var(--accent-gold-soft) 0%, #EDE0C8 100%)', border: '1px solid rgba(201,169,110,0.3)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <div className="text-center px-4">
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {t('proGate.proFeature')}
          </p>
          {feature && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{feature}</p>
          )}
        </div>

        <button
          onClick={() => navigate('/paywall')}
          className="px-5 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg, var(--accent-gold) 0%, #B8935A 100%)', boxShadow: '0 4px 12px rgba(201,169,110,0.3)' }}
        >
          {t('proGate.upgradeToPro')}
        </button>
      </div>
    </div>
  );
}
