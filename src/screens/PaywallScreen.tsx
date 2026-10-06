import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useOfferingPricing } from '../hooks/useOfferingPricing';
import { AppLogo } from '../components/ui/AppLogo';
import { TrialDisclosure } from '../components/paywall/TrialDisclosure';
import { createCheckoutSession } from '../lib/stripe';
import { supabase } from '../context/supabaseAuth';
import { classifyPurchaseError, isNativeIOS, isNativeMobile, purchaseNativeSubscription, restoreNativePurchases } from '../lib/iap';
import { PRICES, detectCurrency, formatAmount } from '../lib/stripe';
import { formatMonthlyEquivalent } from '../lib/pricing';
import { getErrorMessage } from '../lib/errors';
import type { IAPPlan } from '../lib/iap';
import type { BillingPeriod, SubscriptionPlan } from '../types';

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

function FeatureRow({ text, color }: { text: string; color: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckIcon color={color} />
      <span className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>{text}</span>
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

// Shown in place of the headline price on native while the real RevenueCat
// offering is still loading — never a hardcoded number, per store policy.
function PriceSkeleton() {
  return (
    <div
      aria-hidden
      style={{ width: 86, height: 32, borderRadius: 8, background: 'var(--border)', opacity: 0.6 }}
      className="animate-pulse"
    />
  );
}

// Shown in place of the "billed yearly, Just X/month" subtitle while loading.
function SubtitleSkeleton() {
  return (
    <div
      aria-hidden
      style={{ width: 120, height: 12, borderRadius: 6, background: 'var(--border)', opacity: 0.5, marginTop: 2 }}
      className="animate-pulse"
    />
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export function PaywallScreen() {
  const { t } = useTranslation();
  const { user, refreshProfile } = useAuth();
  const { trialDaysLeft, trialEndDate, isFreeTrial, hasAccess } = useSubscription();
  const navigate = useNavigate();
  const [billing, setBilling] = useState<BillingPeriod>('yearly');
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlan | 'trial' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [currency] = useState(() => detectCurrency());
  // Set when the native store's offerings can't be loaded (RevenueCat not
  // configured, network issue, product not found) — shown as a persistent
  // banner with a retry action instead of a toast that just disappears, so
  // the subscribe button never just silently does nothing.
  const [offeringsError, setOfferingsError] = useState<SubscriptionPlan | null>(null);
  // Real, store-localised prices for the trial disclosure — never a
  // hardcoded currency. Falls back to the Stripe-derived price on web.
  // `nativePricingLoading` stays true on native until RevenueCat's
  // offering has actually loaded, so the headline price can show a
  // skeleton instead of ever rendering a number before it's real.
  const { pricing: nativePricing, loading: nativePricingLoading } = useOfferingPricing();

  function priceFor(plan: keyof typeof PRICES): string {
    return formatAmount(currency, PRICES[plan].amounts[currency]);
  }

  // Single source of truth for everything the paywall displays about a
  // plan's price — the big headline number, the "billed yearly, Just
  // X/month" subtitle, and the trial disclosure line all read from this.
  // Real RevenueCat/StoreKit pricing wins whenever it's loaded; the Stripe
  // table is only a fallback for the web build (native shows a skeleton
  // instead of this fallback while its own offering is still loading —
  // see `nativePricingLoading`).
  //
  // periodAbbrev is "year"/"month" (full word) for native — required so the
  // headline never reads "/mo" next to a yearly price — and stays the
  // existing "yr"/"mo" abbreviation for the web/Stripe fallback, which is
  // out of scope for this fix. Both are derived from isYearly (the plan key
  // itself), never from the store's own ISO-8601 subscriptionPeriod string:
  // a yearly Google Play base plan can report its period as "P12M" rather
  // than "P1Y", which a naive parse would misread as monthly even though
  // the price and headline (already isYearly-based) were correct.
  function planPricing(plan: keyof typeof PRICES): { amount: string; perMonthAmount: string; periodAbbrev: string; periodWord: string } {
    const isYearly = plan.endsWith('_yearly');
    const periodWord = isYearly ? t('trialDisclosure.periodYear') : t('trialDisclosure.periodMonth');
    const native = isNativeMobile() ? nativePricing[plan as IAPPlan] : undefined;
    if (native) {
      return {
        amount: native.priceString,
        perMonthAmount: isYearly ? formatMonthlyEquivalent(native) : native.priceString,
        periodAbbrev: isYearly ? 'year' : 'month',
        periodWord,
      };
    }
    const amount = priceFor(plan);
    return {
      amount,
      perMonthAmount: isYearly ? formatAmount(currency, PRICES[plan].amounts[currency] / 12) : amount,
      periodAbbrev: isYearly ? 'yr' : 'mo',
      periodWord,
    };
  }

  // True only on native while RevenueCat's own offering hasn't loaded yet —
  // the window where `planPricing` would otherwise silently fall back to
  // the Stripe table. Gates the headline price and billed-yearly subtitle
  // so they show a skeleton instead of a number that isn't the real one.
  const pricesLoading = isNativeMobile() && nativePricingLoading;

  const STANDARD_FEATURES = t('paywall.standardFeatures', { returnObjects: true }) as string[];
  const PRO_EXTRAS = t('paywall.proExtras', { returnObjects: true }) as string[];

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleFreeTrial() {
    setLoadingPlan('trial');
    try {
      const { error } = await supabase.rpc('start_free_trial');
      if (error) throw error;
      await refreshProfile();
      navigate('/');
    } catch (err: unknown) {
      showToast(getErrorMessage(err) || t('paywall.unknownError'));
    } finally {
      setLoadingPlan(null);
    }
  }

  // Central place to turn a purchase/restore failure into the right reaction:
  // silent for a deliberate cancel, a persistent retryable banner for a
  // broken store catalog, a toast for everything else. Whatever happens
  // here, the caller is responsible for clearing loadingPlan in its own
  // `finally` — this function never touches it, so it can't accidentally
  // skip the reset on some path and leave the button stuck.
  function handlePurchaseError(err: unknown, plan: SubscriptionPlan) {
    console.error('[Paywall] purchase error:', err);
    const msg = getErrorMessage(err);

    if (isNativeMobile() && /offering|product not found|package not found/i.test(msg)) {
      // The store catalog itself couldn't be loaded — a toast that
      // disappears isn't enough here, since retrying is the whole point.
      setOfferingsError(plan);
      return;
    }

    if (!isNativeMobile()) {
      // Stripe path — keep the existing generic handling.
      if (!msg.toLowerCase().includes('cancel')) {
        showToast(t('paywall.purchaseFailed', { msg: msg || t('paywall.unknownError') }));
      }
      return;
    }

    switch (classifyPurchaseError(err)) {
      case 'cancelled':
        // User deliberately backed out — no error message, just recover silently.
        break;
      case 'noPaymentMethod':
        showToast(t('paywall.purchaseNoPaymentMethod', { store: isNativeIOS() ? 'Apple' : 'Google Play' }));
        break;
      case 'notAllowed':
        showToast(t('paywall.purchaseNotAllowed'));
        break;
      case 'network':
        showToast(t('paywall.purchaseNetworkError'));
        break;
      case 'timeout':
        showToast(t('paywall.purchaseTimedOut'));
        break;
      case 'pending':
        showToast(t('paywall.purchasePending'));
        break;
      default:
        showToast(t('paywall.purchaseFailed', { msg: msg || t('paywall.unknownError') }));
    }
  }

  async function handleSubscribe(plan: SubscriptionPlan) {
    if (!plan || plan === 'free_trial') return;
    setOfferingsError(null);
    setLoadingPlan(plan);
    try {
      if (isNativeMobile()) {
        // Use RevenueCat — Apple StoreKit on iOS, Google Play Billing on Android
        const iapPlan = plan as import('../lib/iap').IAPPlan;
        const success = await purchaseNativeSubscription(iapPlan);
        if (!success) {
          // Resolved without throwing but no entitlement is active yet —
          // e.g. a deferred/pending purchase (parental approval). Not an
          // error, so no error toast; the button still must unblock.
          showToast(t('paywall.purchasePending'));
          return;
        }
        const { error } = await supabase.rpc('confirm_native_purchase', { p_plan: plan });
        if (error) throw error;
        await refreshProfile();
        navigate('/');
      } else {
        // Use Stripe on web
        if (!user?.id) {
          throw new Error(t('paywall.mustBeSignedIn'));
        }
        const url = await createCheckoutSession(plan);
        if (Capacitor.isNativePlatform()) {
          // The app's own WebView (https://localhost) can't reach Stripe's
          // return redirect, so checkout opens in an in-app browser tab —
          // the return trip comes back via the payment-callback URL scheme,
          // handled in AuthContext's appUrlOpen listener.
          showToast(t('paywall.openingCheckout'));
          await Browser.open({ url });
        } else {
          showToast(t('paywall.redirectingCheckout'));
          window.location.href = url;
        }
      }
    } catch (err: unknown) {
      handlePurchaseError(err, plan);
    } finally {
      // Runs on every path — success, thrown error, or the early `return`
      // above — so the button can never stay stuck on "Se redirecționează…".
      setLoadingPlan(null);
    }
  }

  async function handleRestorePurchase() {
    setLoadingPlan('trial');
    try {
      const restoredPlan = await restoreNativePurchases();
      if (restoredPlan) {
        const { error } = await supabase.rpc('confirm_native_purchase', { p_plan: restoredPlan });
        if (error) throw error;
        await refreshProfile();
        navigate('/');
      } else {
        showToast(t('paywall.noPreviousPurchases'));
      }
    } catch (err: unknown) {
      const kind = classifyPurchaseError(err);
      showToast(kind === 'timeout' ? t('paywall.restoreTimedOut')
        : kind === 'network' ? t('paywall.purchaseNetworkError')
        : t('paywall.couldNotRestore'));
    } finally {
      setLoadingPlan(null);
    }
  }

  const stdPlan: SubscriptionPlan = billing === 'yearly' ? 'standard_yearly' : 'standard_monthly';
  const proPlan: SubscriptionPlan = billing === 'yearly' ? 'pro_yearly' : 'pro_monthly';

  // Google Play requires a clearly visible, always-reachable way to leave a
  // paywall. Prefers going back to wherever the user came from; falls back
  // to the app's root when the paywall is the first entry in history (e.g.
  // opened directly after auth) rather than doing nothing.
  //
  // Without an active subscription/trial, App.tsx's routing redirects every
  // other route straight back to /paywall (there's no free content to show
  // instead) — so navigating here would be a silent no-op. Explaining that
  // via a toast, instead of just bouncing back with no feedback, is what
  // Google Play's policy actually requires: a clear indication that a
  // subscription is required to use the app.
  function handleClose() {
    if (!hasAccess) {
      showToast(t('paywall.subscriptionRequired'));
      return;
    }
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Dismiss button — fixed to the viewport so it stays visible without
          scrolling, and never overlaps the (centered) header content below. */}
      <button
        onClick={handleClose}
        aria-label={t('common.close')}
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
          left: 16,
          zIndex: 60,
          width: 44,
          height: 44,
          borderRadius: 22,
          background: '#FFFFFF',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 4L16 16M16 4L4 16" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>

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
              {t('paywall.chooseYourPlan')}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t('paywall.sevenDayTrialCancelAnytime')}</p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{t('paywall.subscriptionRequired')}</p>
          </div>
        </motion.div>

        {/* Free trial remaining */}
        {isFreeTrial && trialDaysLeft > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2">
            <div
              className="rounded-2xl px-4 py-3 text-center text-sm"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-strong)', color: 'var(--accent)' }}
            >
              {t('paywall.remainingInTrial', { count: trialDaysLeft })}
            </div>
            <TrialDisclosure variant="free" trialEndDate={trialEndDate} />
          </motion.div>
        )}

        {/* Offerings error — persistent banner with retry, never a dead-end toast */}
        {offeringsError && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-sm"
            style={{ background: 'rgba(220,80,80,0.08)', border: '1px solid rgba(220,80,80,0.3)', color: '#B23B3B' }}
          >
            <span>{t('paywall.offeringsUnavailable')}</span>
            <button
              onClick={() => handleSubscribe(offeringsError)}
              className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: '#B23B3B', color: '#fff' }}
            >
              {t('paywall.retry')}
            </button>
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
                {p === 'monthly' ? t('paywall.monthly') : t('paywall.yearly')}
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
                <p className="font-semibold text-base" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{t('paywall.standardName')}</p>
                {pricesLoading ? <SubtitleSkeleton /> : (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {billing === 'yearly'
                      ? t('paywall.billedYearly', { amount: planPricing('standard_yearly').perMonthAmount })
                      : t('paywall.billedMonthly')}
                  </p>
                )}
              </div>
              {pricesLoading ? <PriceSkeleton /> : (
                <PriceDisplay
                  amount={planPricing(stdPlan as keyof typeof PRICES).amount}
                  period={planPricing(stdPlan as keyof typeof PRICES).periodAbbrev}
                  color="var(--text-primary)"
                />
              )}
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
                  {isNativeMobile() ? t('paywall.openingNativeSheet') : t('paywall.redirecting')}
                </span>
              ) : t('paywall.startStandardTrial')}
            </button>
            {!pricesLoading && (
              <TrialDisclosure
                variant="billed"
                trialEndDate={null}
                estimateIfStartedToday
                price={planPricing(stdPlan as keyof typeof PRICES).amount}
                period={planPricing(stdPlan as keyof typeof PRICES).periodWord}
              />
            )}
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
              {t('paywall.mostPopular')}
            </span>

            <div className="flex items-start justify-between mt-1">
              <div>
                <p className="font-semibold text-base" style={{ color: '#5C4A2A', letterSpacing: '-0.02em' }}>{t('paywall.proName')}</p>
                {pricesLoading ? <SubtitleSkeleton /> : (
                  <p className="text-xs mt-0.5" style={{ color: '#8A7050' }}>
                    {billing === 'yearly'
                      ? t('paywall.billedYearly', { amount: planPricing('pro_yearly').perMonthAmount })
                      : t('paywall.billedMonthly')}
                  </p>
                )}
              </div>
              {pricesLoading ? <PriceSkeleton /> : (
                <PriceDisplay
                  amount={planPricing(proPlan as keyof typeof PRICES).amount}
                  period={planPricing(proPlan as keyof typeof PRICES).periodAbbrev}
                  color="var(--accent-gold)"
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-gold)' }}>{t('paywall.everythingInStandardPlus')}</p>
              {PRO_EXTRAS.map((f) => <FeatureRow key={f} text={f} color="var(--accent-gold)" />)}
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
                  {isNativeMobile() ? t('paywall.openingNativeSheet') : t('paywall.redirecting')}
                </span>
              ) : t('paywall.startProTrial')}
            </button>
            {!pricesLoading && (
              <TrialDisclosure
                variant="billed"
                trialEndDate={null}
                estimateIfStartedToday
                price={planPricing(proPlan as keyof typeof PRICES).amount}
                period={planPricing(proPlan as keyof typeof PRICES).periodWord}
              />
            )}
          </motion.div>
        </div>

        {/* No-payment trial — a genuinely different offer from the billed
            Standard/Pro plans above (no card, no store subscription,
            doesn't auto-renew). Kept in its own visually distinct section
            (dashed border, muted background, explicit "no payment" label)
            so it can't be mistaken for a third pricing tier or for the
            billed trials on the cards above. */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {t('paywall.noPaymentOptionLabel')}
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>
          <div
            className="rounded-3xl p-5 flex flex-col items-center gap-3 text-center"
            style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border-strong)' }}
          >
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('paywall.noPaymentSectionSubtitle')}</p>
            <button
              onClick={handleFreeTrial}
              disabled={loadingPlan !== null}
              className="text-sm font-semibold py-3 px-6 rounded-2xl disabled:opacity-60"
              style={{ color: 'var(--accent)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              {loadingPlan === 'trial' ? t('paywall.startingTrial') : t('paywall.startFreeTrialCta')}
            </button>
            <TrialDisclosure variant="free" trialEndDate={null} className="w-full" />
          </div>
        </motion.div>

        {/* Restore Purchases — prominent button required by Apple */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 }}>
          <button
            onClick={handleRestorePurchase}
            disabled={loadingPlan !== null}
            className="w-full py-3 rounded-2xl text-sm font-semibold disabled:opacity-50 transition-opacity"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            {loadingPlan === 'trial' ? t('paywall.restoring') : t('paywall.restorePurchases')}
          </button>
        </motion.div>

        {/* Footer links */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="flex flex-col items-center gap-2"
        >
          <div />
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <button onClick={() => navigate('/privacy')}>{t('paywall.privacyPolicy')}</button>
            <span>·</span>
            <button onClick={() => navigate('/terms')}>{t('paywall.termsOfUse')}</button>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6, maxWidth: 320, padding: '0 16px' }}>
            {t('paywall.footerRenewalNotice')}{' '}
            {isNativeIOS() ? t('paywall.manageIOS') : t('paywall.manageOther')}{' '}
            {t('paywall.footerPaymentCharge')}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
