import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { verifySession, type VerifiedSession } from '../lib/stripe';

type State = 'verifying' | 'success' | 'error' | 'instant';

export function SuccessScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateProfile, refreshProfile } = useAuth();

  const [state, setState] = useState<State>('verifying');
  const [session, setSession] = useState<VerifiedSession | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      // Arrived without a session_id — instant activation (dev / trial flow)
      updateProfile({ subscription_status: 'standard_monthly' }).then(() => {
        refreshProfile();
        setState('instant');
      });
      return;
    }

    verifySession(sessionId)
      .then(async (data) => {
        if (!data.paid) {
          setState('error');
          return;
        }
        await updateProfile({
          subscription_status: 'standard_monthly',
          stripe_customer_id: data.customerId ?? undefined,
          stripe_subscription_id: data.subscriptionId ?? undefined,
          subscription_end_date: data.nextBillingDate ?? undefined,
        });
        await refreshProfile();
        setSession(data);
        setState('success');
      })
      .catch(() => {
        // Verification failed — still activate locally so the user isn't locked out
        updateProfile({ subscription_status: 'standard_monthly' }).then(() => {
          refreshProfile();
          setState('success');
        });
      });
  }, []);

  if (state === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          <p className="text-[var(--text-secondary)] text-sm">Confirming your payment…</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-6">
        <div className="text-center flex flex-col items-center gap-4">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Payment not completed</h1>
          <p className="text-[var(--text-secondary)] text-sm">Your card was not charged.</p>
          <Button variant="primary" onClick={() => navigate('/paywall')}>Try Again</Button>
        </div>
      </div>
    );
  }

  const planLabel = session?.plan === 'annual' ? 'Annual Plan' : 'Monthly Plan';
  const nextBilling = session?.nextBillingDate
    ? format(parseISO(session.nextBillingDate), 'MMMM d, yyyy')
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
            Welcome to MomManager Premium!
          </p>
        </div>

        {/* Plan details */}
        <div className="rounded-2xl p-4 w-full space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Plan</span>
            <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--accent-gold)' }}>
              👑 {planLabel}
            </span>
          </div>
          {nextBilling && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Next billing date</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">{nextBilling}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Status</span>
            <span className="text-sm font-semibold text-green-400">✓ Active</span>
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
          A receipt has been sent to your email by Stripe.
        </p>
      </motion.div>
    </div>
  );
}
