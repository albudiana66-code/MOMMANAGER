import { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Layout } from '../components/layout/Layout';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Toggle } from '../components/ui/Toggle';
import { Modal } from '../components/ui/Modal';
import { TrialDisclosure } from '../components/paywall/TrialDisclosure';
import { NotificationSettingsCard } from '../components/settings/NotificationSettingsCard';
import { DebugPanel } from '../components/settings/DebugPanel';
import { useEmailPreferences } from '../hooks/useEmailPreferences';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useSubscription } from '../hooks/useSubscription';
import { useOfferingPricing } from '../hooks/useOfferingPricing';
import { createPortalSession, PRICES } from '../lib/stripe';
import { priceLabel } from '../lib/pricing';
import { classifyPurchaseError, isNativeMobile, restoreNativePurchases } from '../lib/iap';
import type { IAPPlan } from '../lib/iap';
import { supabase } from '../context/supabaseAuth';
import { useDateFnsLocale } from '../hooks/useDateFnsLocale';
import type { Currency, Language } from '../types';

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: '🇬🇧 English' },
  { value: 'ro', label: '🇷🇴 Română' },
  { value: 'ru', label: '🇷🇺 Русский' },
  { value: 'uk', label: '🇺🇦 Українська' },
  { value: 'fr', label: '🇫🇷 Français' },
  { value: 'de', label: '🇩🇪 Deutsch' },
  { value: 'ar', label: '🇸🇦 العربية' },
  { value: 'it', label: '🇮🇹 Italiano' },
  { value: 'pl', label: '🇵🇱 Polski' },
];

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'GBP', label: '🇬🇧 GBP - £' },
  { value: 'EUR', label: '🇪🇺 EUR - €' },
  { value: 'RON', label: '🇷🇴 RON - lei' },
  { value: 'USD', label: '🇺🇸 USD - $' },
  { value: 'PLN', label: '🇵🇱 PLN - zł' },
];

export function SettingsScreen() {
  const { t } = useTranslation();
  const dateLocale = useDateFnsLocale();
  const navigate = useNavigate();
  const { profile, signOut, deleteAccount, updateProfile, refreshProfile } = useAuth();
  const { theme, toggleTheme, currency, setCurrency, language, setLanguage } = useApp();
  const { plan, isFreeTrial, isStandard, isPro, trialDaysLeft, trialEndDate } = useSubscription();
  // Real, store-localised price for the active plan. On native, shows
  // nothing (planPrice() returns null) until RevenueCat's own offering has
  // loaded rather than ever falling back to the hardcoded Stripe display
  // string — only the web build uses that fallback.
  const { pricing: nativePricing, loading: nativePricingLoading } = useOfferingPricing();
  const { marketingOptIn, setMarketingOptIn } = useEmailPreferences();
  const [showSignOut, setShowSignOut] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState('');

  async function handleSignOut() {
    await signOut();
    setShowSignOut(false);
  }

  async function handleRestorePurchases() {
    setRestoreLoading(true);
    setRestoreMessage('');
    try {
      if (isNativeMobile()) {
        const restoredPlan = await restoreNativePurchases();
        if (restoredPlan) {
          const { error } = await supabase.rpc('confirm_native_purchase', { p_plan: restoredPlan });
          if (error) throw error;
          await refreshProfile();
        }
        setRestoreMessage(restoredPlan ? t('settings.restoreSuccess') : t('settings.restoreNone'));
      } else {
        setRestoreMessage(t('settings.restoreIOSOnly'));
      }
    } catch (err: unknown) {
      const kind = classifyPurchaseError(err);
      setRestoreMessage(
        kind === 'timeout' ? t('paywall.restoreTimedOut')
        : kind === 'network' ? t('paywall.purchaseNetworkError')
        : t('settings.restoreError')
      );
    } finally {
      setRestoreLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    setDeleteError('');
    const err = await deleteAccount();
    if (err) {
      setDeleteError(err);
      setDeleteLoading(false);
    }
    // On success, auth state change will redirect automatically
  }

  async function handleManageSubscription() {
    const customerId = profile?.stripe_customer_id;
    if (!customerId) {
      // No Stripe customer yet — open paywall
      navigate('/paywall');
      return;
    }
    setPortalLoading(true);
    setPortalError('');
    try {
      const url = await createPortalSession();
      window.location.href = url;
    } catch (e) {
      setPortalError(e instanceof Error ? e.message : t('settings.portalError'));
    } finally {
      setPortalLoading(false);
    }
  }

  function planDisplayName() {
    if (plan === 'standard_monthly' || plan === 'standard_yearly') return t('paywall.standardName');
    if (plan === 'pro_monthly' || plan === 'pro_yearly') return t('paywall.proName');
    return null;
  }

  function planPrice() {
    if (!plan || !(plan in PRICES)) return null;
    if (isNativeMobile()) {
      // Never fall back to the hardcoded Stripe display string on native —
      // show nothing (the caller renders a skeleton) until RevenueCat's
      // own offering has actually loaded.
      const native = nativePricing[plan as IAPPlan];
      return native ? priceLabel(native) : null;
    }
    return PRICES[plan as keyof typeof PRICES].display;
  }

  return (
    <Layout background="url('/bg-dashboard.jpg') center/cover no-repeat">
      <Header title={t('settings.title')} left={
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-secondary)]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          ‹
        </button>
      } />

      <div className="px-4 mt-3 flex flex-col gap-4">
        {/* Profile */}
        <Card>
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-2xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--lavender) 100%)' }}>
                💗
              </div>
            )}
            <div>
              <p className="font-semibold text-[var(--text-primary)]">{profile?.name}</p>
              <p className="text-sm text-[var(--text-secondary)]">{profile?.email}</p>
            </div>
          </div>
        </Card>

        {/* Appearance */}
        <Card>
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">{t('settings.theme')}</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-primary)]">
              {theme === 'dark' ? t('settings.darkMode') : t('settings.lightMode')}
            </span>
            <Toggle checked={theme === 'dark'} onChange={() => toggleTheme()} />
          </div>
        </Card>

        {/* Language */}
        <Card>
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">{t('settings.language')}</h3>
          <Select
            value={language}
            options={LANGUAGES}
            onChange={(e) => setLanguage(e.target.value as Language)}
          />
        </Card>

        {/* Currency */}
        <Card>
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">{t('settings.currency')}</h3>
          <Select
            value={currency}
            options={CURRENCIES}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          />
        </Card>

        {/* AI Assistant consent */}
        <Card>
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">{t('settings.aiAssistantTitle')}</h3>
          <div className="flex items-center justify-between">
            <div className="pr-3">
              <span className="text-sm text-[var(--text-primary)]">{t('settings.allowAiFeatures')}</span>
              <p className="text-xs text-[var(--text-muted)] mt-0.5" style={{ lineHeight: 1.4 }}>
                {t('settings.aiFeaturesDescription')}
              </p>
            </div>
            <Toggle
              checked={profile?.ai_consent === true}
              onChange={(next) => updateProfile({ ai_consent: next })}
            />
          </div>
        </Card>

        {/* Notifications */}
        <NotificationSettingsCard />

        {/* Email preferences */}
        <Card>
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">{t('settings.emailsTitle')}</h3>
          <div className="flex items-center justify-between">
            <div className="pr-3">
              <span className="text-sm text-[var(--text-primary)]">{t('settings.emailsFromMomManager')}</span>
              <p className="text-xs text-[var(--text-muted)] mt-0.5" style={{ lineHeight: 1.4 }}>
                {t('settings.emailsFromMomManagerDescription')}
              </p>
            </div>
            <Toggle
              checked={marketingOptIn ?? true}
              onChange={setMarketingOptIn}
            />
          </div>
        </Card>

        {/* Subscription */}
        <div style={{ borderRadius: 24, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.30)', boxShadow: '0 1px 8px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          <div className="px-4 pt-4 pb-3">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">{t('settings.subscription')}</h3>

            {/* FREE TRIAL */}
            {isFreeTrial && (
              <div style={{ background: 'var(--accent-soft)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ fontSize: 18 }}>🌸</span>
                  <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{t('settings.freeTrialLabel')}</p>
                  <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: '#fff', borderRadius: 9999, padding: '2px 10px' }}>
                    {trialDaysLeft}{t('settings.daysLeftSuffix')}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  {t('settings.unlockAllFeatures')}
                </p>
                <div style={{ marginBottom: 12 }}>
                  <TrialDisclosure variant="free" trialEndDate={trialEndDate} />
                </div>
                <button
                  onClick={() => navigate('/paywall')}
                  style={{
                    width: '100%', height: 44, borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                    color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  {t('settings.upgradeNow')}
                </button>
              </div>
            )}

            {/* STANDARD or PRO */}
            {(isStandard || isPro) && (
              <div style={{ marginBottom: 12 }}>
                {/* Plan header */}
                <div className="flex items-center gap-2 mb-3">
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                    {planDisplayName()}
                  </p>
                  <span style={{
                    fontSize: 11, fontWeight: 700, borderRadius: 9999, padding: '3px 10px',
                    background: isPro ? '#FFF8E6' : 'var(--accent-soft)',
                    color: isPro ? '#B8860B' : 'var(--accent)',
                  }}>
                    {isPro ? `⭐ ${t('paywall.proName').toUpperCase()}` : t('paywall.standardName').toUpperCase()}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {isNativeMobile() && nativePricingLoading ? (
                      <span aria-hidden className="animate-pulse" style={{ display: 'inline-block', width: 60, height: 12, borderRadius: 6, background: 'var(--border)', opacity: 0.5 }} />
                    ) : planPrice()}
                  </span>
                </div>

                {/* Renewal date */}
                {profile?.subscription_expires_at && (
                  <div className="flex items-center gap-2 mb-4">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {t('settings.renewsOn', { date: format(parseISO(profile.subscription_expires_at), 'MMM d, yyyy', { locale: dateLocale }) })}
                    </p>
                  </div>
                )}

                {/* What's included */}
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                    {t('settings.whatsIncluded')}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {(t('paywall.standardFeatures', { returnObjects: true }) as string[]).map((f) => (
                      <div key={f} className="flex items-start gap-2">
                        <span style={{ color: 'var(--sage)', fontSize: 12, lineHeight: 1.6 }}>✓</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f}</span>
                      </div>
                    ))}
                    {isPro && (
                      <>
                        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-gold)', marginTop: 4 }}>
                          {t('settings.everythingInStandardPlus')}
                        </p>
                        {(t('paywall.proExtras', { returnObjects: true }) as string[]).map((f) => (
                          <div key={f} className="flex items-start gap-2">
                            <span style={{ color: 'var(--accent-gold)', fontSize: 12, lineHeight: 1.6 }}>✓</span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Info note */}
                <div style={{
                  background: 'var(--accent-soft)', border: '1px solid var(--border-strong)',
                  borderRadius: 12, padding: '10px 12px', marginBottom: 12,
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <Trans i18nKey="settings.managePortalNote" components={{ strong: <strong /> }} />
                  </p>
                </div>

                {/* Manage button */}
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  style={{
                    width: '100%', height: 48, borderRadius: 14, border: 'none',
                    background: portalLoading ? 'var(--border)' : isPro
                      ? 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)'
                      : 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                    color: '#fff', fontWeight: 600, fontSize: 14, cursor: portalLoading ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {portalLoading ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      {t('settings.openingPortal')}
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      {t('settings.manageSubscriptionBtn')}
                    </>
                  )}
                </button>

                {portalError && (
                  <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8, textAlign: 'center' }}>{portalError}</p>
                )}

                <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
                  {t('settings.cancelAnytimeManaged')}
                </p>
              </div>
            )}

            {/* EXPIRED / NULL */}
            {!isFreeTrial && !isStandard && !isPro && (
              <div style={{ marginBottom: 4 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  {t('settings.noActiveSubscription')}
                </p>
                <button
                  onClick={() => navigate('/paywall')}
                  style={{
                    width: '100%', height: 48, borderRadius: 14, border: 'none',
                    background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                    color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  {t('settings.choosePlanBtn')}
                </button>
              </div>
            )}
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* Restore Purchases */}
        <Card>
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">{t('settings.purchasesSection')}</h3>
          <button
            onClick={handleRestorePurchases}
            disabled={restoreLoading}
            className="flex items-center justify-between text-sm text-[var(--text-primary)] py-1 w-full disabled:opacity-50"
          >
            <span>{restoreLoading ? t('settings.restoring') : t('settings.restorePurchases')}</span>
            <span className="text-[var(--text-secondary)]">›</span>
          </button>
          {restoreMessage ? (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>{restoreMessage}</p>
          ) : null}
        </Card>

        {/* Legal */}
        <Card>
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">{t('settings.legalSection')}</h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate('/terms')}
              className="flex items-center justify-between text-sm text-[var(--text-primary)] py-1"
            >
              <span>{t('settings.termsAndConditions')}</span>
              <span className="text-[var(--text-secondary)]">›</span>
            </button>
            <div className="border-t" style={{ borderColor: 'var(--border)' }} />
            <button
              onClick={() => navigate('/privacy')}
              className="flex items-center justify-between text-sm text-[var(--text-primary)] py-1"
            >
              <span>{t('settings.privacyPolicy')}</span>
              <span className="text-[var(--text-secondary)]">›</span>
            </button>
          </div>
        </Card>

        {/* Sign out */}
        <Button variant="danger" size="lg" onClick={() => setShowSignOut(true)}>
          {t('settings.signOut')}
        </Button>

        {/* Delete account */}
        <button
          onClick={() => setShowDeleteAccount(true)}
          style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', paddingBottom: 8, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {t('settings.deleteAccountLink')}
        </button>

        {import.meta.env.VITE_SHOW_DEBUG_PANEL === 'true' && <DebugPanel />}
      </div>

      <Modal open={showSignOut} onClose={() => setShowSignOut(false)}>
        <div className="text-center flex flex-col items-center gap-4 py-2">
          <span className="text-4xl">👋</span>
          <p className="text-[var(--text-primary)] font-medium">{t('settings.signOutConfirm')}</p>
          <div className="flex gap-3 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setShowSignOut(false)}>{t('settings.no')}</Button>
            <Button variant="danger" className="flex-1" onClick={handleSignOut}>{t('settings.yes')}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showDeleteAccount} onClose={() => { setShowDeleteAccount(false); setDeleteError(''); }}>
        <div className="text-center flex flex-col items-center gap-4 py-2">
          <span className="text-4xl">⚠️</span>
          <p className="text-[var(--text-primary)] font-semibold" style={{ fontSize: 17 }}>{t('settings.deleteAccountTitle')}</p>
          <p className="text-[var(--text-secondary)]" style={{ fontSize: 14, lineHeight: 1.5 }}>
            {t('settings.deleteAccountWarning')}
          </p>
          {deleteError ? (
            <p style={{ fontSize: 13, color: '#ef4444' }}>{deleteError}</p>
          ) : null}
          <div className="flex gap-3 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => { setShowDeleteAccount(false); setDeleteError(''); }}>
              {t('settings.cancel')}
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleDeleteAccount} disabled={deleteLoading}>
              {deleteLoading ? t('settings.deleting') : t('settings.delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
