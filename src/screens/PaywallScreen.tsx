import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { AppLogo } from '../components/ui/AppLogo';
import { createCheckoutSession } from '../lib/stripe';
import { isNativeIOS, purchaseAppleSubscription, restoreApplePurchases } from '../lib/iap';
import type { BillingPeriod, SubscriptionPlan } from '../types';

// ── Feature lists ────────────────────────────────────────────────────────────

const STANDARD_FEATURES = [
  'Calendar & tasks with reminders & notifications',
  'Mom & Kids separate plans',
  'AI activity generator for kids',
  'Kitchen & meal planning',
  'Basic self-care routines',
  'Basic budget tracker',
  '9 languages supported',
];

const PRO_EXTRAS: { text: string; soon?: boolean }[] = [
  { text: 'Advanced skincare with AI product recommendations' },
  { text: 'Workout tracker with progress & streaks' },
  { text: 'Cross-family AI nutrition plans' },
  { text: 'Import bank statements (CSV & PDF)' },
  { text: 'AI weekly recap & predictions' },
  { text: 'Priority support' },
];

// ── Small helpers ────────────────────────────────────────────────────────────

function CheckIcon({ color }: { color: string }) {
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full"
      style={{ width: 18, height: 18, background: `${color}20` }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 5l2 2 4-4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function ClockIcon() {
  return (
    <div className="shrink-0 flex items-center justify-center rounded-full" style={{ width: 18, height: 18, background: 'var(--border)' }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
      </svg>
    </div>
  );
}

function FeatureRow({ text, color }: { text: string; color: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckIcon color={color} />
      <span className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>{text}</span>
    </div>
  );
}

function ProFeatureRow({ text, soon, color }: { text: string; soon?: boolean; color: string }) {
  if (!soon) return <FeatureRow text={text} color={color} />;
  return (
    <div className="flex items-start gap-2">
      <ClockIcon />
      <span className="text-sm leading-snug flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--text-muted)' }}>
        {text}
        <span style={{
          fontSize: 10, fontWeight: 600, borderRadius: 9999,
          padding: '2px 7px', lineHeight: 1.4,
          background: 'var(--accent-gold-soft, #FFF8E6)',
          color: 'var(--accent-gold, #B8860B)',
        }}>
          Soon
        </span>
      </span>
    </div>
  );
}

function PriceDisplay({ amount, period, color }: { amount: string; period: string; color: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', color }}>{amount}</span>
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>/{period}</span>
    </div>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export function PaywallScreen() {
  const { updateProfile } = useAuth();
  const { trialDaysLeft, isFreeTrial } = useSubscription();
  const navigate = useNavigate();
  const [billing, setBilling] = useState<BillingPeriod>('yearly');
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlan | 'trial' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleFreeTrial() {
    setLoadingPlan('trial');
    const now = new Date();
    await updateProfile({
      subscription_status: 'free_trial',
      subscription_expires_at: addDays(now, 7).toISOString(),
      trial_start: now.toISOString(),
      trial_end: addDays(now, 7).toISOString(),
    });
    setLoadingPlan(null);
    navigate('/');
  }

  async function handleSubscribe(plan: SubscriptionPlan) {
    if (!plan || plan === 'free_trial') return;
    setLoadingPlan(plan);
    try {
      if (isNativeIOS()) {
        // Use Apple StoreKit on iOS
        const iapPlan = plan as import('../lib/iap').IAPPlan;
        const success = await purchaseAppleSubscription(iapPlan);
        if (success) {
          await updateProfile({ subscription_status: plan });
          navigate('/');
        } else {
          showToast('Purchase could not be completed. Please try again.');
        }
      } else {
        // Use Stripe on web/Android
        const url = await createCheckoutSession(plan);
        showToast('Redirecting to secure checkout…');
        window.location.href = url;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.toLowerCase().includes('cancel')) {
        showToast('Could not complete purchase. Please try again.');
      }
      setLoadingPlan(null);
    }
  }

  async function handleRestorePurchase() {
    setLoadingPlan('trial');
    try {
      const restored = await restoreApplePurchases();
      if (restored) {
        await updateProfile({ subscription_status: 'pro_yearly' }); // will be overridden by webhook
        navigate('/');
      } else {
        showToast('No previous purchases found.');
      }
    } catch {
      showToast('Could not restore purchases.');
    } finally {
      setLoadingPlan(null);
    }
  }

  const stdPlan: SubscriptionPlan = billing === 'yearly' ? 'standard_yearly' : 'standard_monthly';
  const proPlan: SubscriptionPlan = billing === 'yearly' ? 'pro_yearly' : 'pro_monthly';

  const PRICES = {
    standard_monthly: '£9.99', standard_yearly: '£79.99',
    pro_monthly: '£14.99', pro_yearly: '£129.99',
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-lg"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', maxWidth: 320 }}
        >
          {toast}
        </motion.div>
      )}

      <div className="px-5 pt-12 pb-16 flex flex-col gap-6 max-w-md mx-auto w-full">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 text-center">
          <AppLogo size={64} />
          <div>
            <h1 className="text-2xl text-[var(--text-primary)]" style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
              Choose your plan
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>7-day free trial • Cancel anytime</p>
          </div>
        </motion.div>

        {/* Free trial remaining */}
        {isFreeTrial && trialDaysLeft > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl px-4 py-3 text-center text-sm"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-strong)', color: 'var(--accent)' }}
          >
            🌸 {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining in your free trial
          </motion.div>
        )}

        {/* Billing toggle */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex items-center justify-center"
        >
          <div className="flex rounded-2xl p-1 gap-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {(['monthly', 'yearly'] as BillingPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setBilling(p)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all"
                style={billing === p
                  ? { background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)', color: '#fff' }
                  : { color: 'var(--text-secondary)' }
                }
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
                {p === 'yearly' && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: billing === 'yearly' ? 'rgba(255,255,255,0.2)' : 'var(--accent-gold-soft)', color: billing === 'yearly' ? '#fff' : 'var(--accent-gold)' }}
                  >
                    −33%
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Plan cards */}
        <div className="flex flex-col gap-4">

          {/* Standard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-3xl p-5 flex flex-col gap-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-base" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Standard</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {billing === 'yearly' ? '£6.67/mo, billed yearly' : 'billed monthly'}
                </p>
              </div>
              <PriceDisplay
                amount={billing === 'yearly' ? PRICES.standard_yearly : PRICES.standard_monthly}
                period={billing === 'yearly' ? 'yr' : 'mo'}
                color="var(--text-primary)"
              />
            </div>

            <div className="flex flex-col gap-2">
              {STANDARD_FEATURES.map((f) => <FeatureRow key={f} text={f} color="var(--sage)" />)}
            </div>

            <button
              onClick={() => handleSubscribe(stdPlan)}
              disabled={loadingPlan !== null}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
              style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)', boxShadow: '0 4px 14px rgba(196,120,138,0.25)' }}
            >
              {loadingPlan === stdPlan ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".3" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                  Redirecting…
                </span>
              ) : 'Start Standard – 7 Days Free'}
            </button>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
              Try free for 7 days, then {billing === 'yearly' ? '£79.99/year' : '£9.99/month'}. Cancel before trial ends to avoid being charged.
            </p>
          </motion.div>

          {/* Pro — featured */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            className="relative rounded-3xl p-5 flex flex-col gap-4"
            style={{
              background: 'linear-gradient(145deg, #FAF3E8 0%, #F5ECD8 100%)',
              border: '1px solid rgba(201,169,110,0.4)',
              boxShadow: '0 6px 28px rgba(201,169,110,0.18)',
              transform: 'scale(1.02)',
            }}
          >
            {/* Badge */}
            <span
              className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, var(--accent-gold) 0%, #B8935A 100%)', color: '#fff', boxShadow: '0 2px 8px rgba(201,169,110,0.4)' }}
            >
              MOST POPULAR
            </span>

            <div className="flex items-start justify-between mt-1">
              <div>
                <p className="font-semibold text-base" style={{ color: '#5C4A2A', letterSpacing: '-0.02em' }}>Pro</p>
                <p className="text-xs mt-0.5" style={{ color: '#8A7050' }}>
                  {billing === 'yearly' ? '£10.83/mo, billed yearly' : 'billed monthly'}
                </p>
              </div>
              <PriceDisplay
                amount={billing === 'yearly' ? PRICES.pro_yearly : PRICES.pro_monthly}
                period={billing === 'yearly' ? 'yr' : 'mo'}
                color="var(--accent-gold)"
              />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-gold)' }}>Everything in Standard, plus:</p>
              {PRO_EXTRAS.map((f) => <ProFeatureRow key={f.text} text={f.text} soon={f.soon} color="var(--accent-gold)" />)}
            </div>

            <button
              onClick={() => handleSubscribe(proPlan)}
              disabled={loadingPlan !== null}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
              style={{ background: 'linear-gradient(135deg, var(--accent-gold) 0%, #B8935A 100%)', boxShadow: '0 4px 14px rgba(201,169,110,0.35)' }}
            >
              {loadingPlan === proPlan ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".3" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                  Redirecting…
                </span>
              ) : 'Start Pro – 7 Days Free'}
            </button>
            <p style={{ fontSize: 11, color: '#8A7050', textAlign: 'center', lineHeight: 1.5 }}>
              Try free for 7 days, then {billing === 'yearly' ? '£129.99/year' : '£14.99/month'}. Cancel before trial ends to avoid being charged.
            </p>
          </motion.div>
        </div>

        {/* Free trial CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="flex flex-col items-center gap-1"
        >
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>
          <button
            onClick={handleFreeTrial}
            disabled={loadingPlan !== null}
            className="text-sm font-medium py-3 disabled:opacity-60"
            style={{ color: 'var(--accent)' }}
          >
            {loadingPlan === 'trial' ? 'Starting trial…' : 'Start 7-Day Free Trial →'}
          </button>
        </motion.div>

        {/* Restore Purchases — prominent button required by Apple */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 }}>
          <button
            onClick={handleRestorePurchase}
            disabled={loadingPlan !== null}
            className="w-full py-3 rounded-2xl text-sm font-semibold disabled:opacity-50 transition-opacity"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            {loadingPlan === 'trial' ? 'Restoring…' : '🔄 Restore Purchases'}
          </button>
        </motion.div>

        {/* Footer links */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="flex flex-col items-center gap-2"
        >
          <div />
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <button onClick={() => navigate('/privacy')}>Privacy Policy</button>
            <span>·</span>
            <button onClick={() => navigate('/terms')}>Terms of Use</button>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6, maxWidth: 320, padding: '0 16px' }}>
            Subscription renews automatically at the plan price shown above. To avoid charges, cancel at least 24 hours before your 7-day trial ends. On Android: Google Play → Subscriptions. On iOS: iPhone Settings → Apple ID → Subscriptions. Payment will be charged to your store account at confirmation of purchase.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
