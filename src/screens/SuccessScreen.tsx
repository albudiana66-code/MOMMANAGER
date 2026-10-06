import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { verifySession, type VerifiedSession } from '../lib/stripe';
import { useDateFnsLocale } from '../hooks/useDateFnsLocale';

type State = 'verifying' | 'success' | 'error';

export function SuccessScreen() {
  const { t } = useTranslation();
  const dateLocale = useDateFnsLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshProfile } = useAuth();

  const [state, setState] = useState<State>('verifying');
  const [session, setSession] = useState<VerifiedSession | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      // No session_id means no Stripe checkout actually happened here —
      // never grant access for arriving at this URL alone.
      setState('error');
      return;
    }

    verifySession(sessionId)
      .then(async (data) => {
        if (!data.paid) {
          setState('error');
          return;
        }
        // The stripe-verify function already updated the profile server-side —
        // just pull the authoritative row so the rest of the app sees it.
        await refreshProfile();
        setSession(data);
        setState('success');
      })
      .catch(() => {
        // Verification failed — do NOT grant access on trust. The Stripe
        // webhook will still activate the account once it fires if the
        // payment actually went through.
        setState('error');
      });
  }, []);

  if (state === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          <p className="text-[var(--text-secondary)] text-sm">{t('success.confirmingPayment')}</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-6">
        <div className="text-center flex flex-col items-center gap-4">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{t('success.paymentNotCompleted')}</h1>
          <p className="text-[var(--text-secondary)] text-sm">{t('success.cardNotCharged')}</p>
          <Button variant="primary" onClick={() => navigate('/paywall')}>{t('success.tryAgain')}</Button>
        </div>
      </div>
    );
  }

  const isPro = session?.plan?.startsWith('pro_') ?? false;
  const isYearly = session?.plan?.endsWith('_yearly') ?? false;
  const planLabel = t('success.planName', {
    plan: isPro ? t('paywall.proName') : t('paywall.standardName'),
    period: isYearly ? t('paywall.yearly') : t('paywall.monthly'),
  });
  const nextBilling = session?.nextBillingDate
    ? format(parseISO(session.nextBillingDate), 'MMMM d, yyyy', { locale: dateLocale })
    : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[var(--bg-primary)]">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        className="text-center flex flex-col items-center gap-5 max-w-sm w-full"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
          className="w-20 h-20 rounded-full flex items-center justify-center text-5xl"
          style={{ background: 'var(--accent-soft)' }}
        >
          🎉
        </motion.div>

        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {t('success.title')}
          </h1>
          <p className="text-[var(--text-secondary)] mt-1 text-sm">
            {t('success.message')}
          </p>
        </div>

        {/* Plan details */}
        <div className="rounded-2xl p-4 w-full space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">{t('success.planLabel')}</span>
            <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--accent-gold)' }}>
              👑 {planLabel}
            </span>
          </div>
          {nextBilling && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">{t('success.nextBillingDate')}</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">{nextBilling}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">{t('success.statusLabel')}</span>
            <span className="text-sm font-semibold text-green-400">{t('success.statusActive')}</span>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => navigate('/')}
        >
          {t('success.continue')}
        </Button>

        <p className="text-xs text-[var(--text-secondary)] opacity-50">
          {t('success.receiptSentNote')}
        </p>
      </motion.div>
    </div>
  );
}
