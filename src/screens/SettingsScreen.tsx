import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Layout } from '../components/layout/Layout';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Toggle } from '../components/ui/Toggle';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useSubscription } from '../hooks/useSubscription';
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
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme, currency, setCurrency, language, setLanguage } = useApp();
  const { state, trialDaysLeft } = useSubscription();
  const [showSignOut, setShowSignOut] = useState(false);

  async function handleSignOut() {
    await signOut();
    setShowSignOut(false);
  }

  function handleManageSubscription() {
    navigate('/paywall');
  }

  function subscriptionLabel() {
    if (state === 'active') return t('settings.premiumActive');
    if (state === 'trial') return `${t('settings.trialActive')} · ${trialDaysLeft}d`;
    return t('settings.expired');
  }

  return (
    <Layout>
      <Header title={t('settings.title')} left={
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-secondary)] border border-white/10">
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
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E91E8C] to-purple-600 flex items-center justify-center text-2xl">
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

        {/* Subscription */}
        <Card>
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">{t('settings.subscription')}</h3>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[var(--text-primary)]">{t('settings.plan')}</span>
            <span className={`text-sm font-semibold ${state === 'active' ? 'text-green-400' : state === 'trial' ? 'text-[#E91E8C]' : 'text-red-400'}`}>
              {subscriptionLabel()}
            </span>
          </div>
          {profile?.trial_end && state === 'trial' && (
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              {t('settings.expiresOn', { date: format(parseISO(profile.trial_end), 'MMM d, yyyy') })}
            </p>
          )}
          <Button
            variant={state === 'active' ? 'secondary' : 'primary'}
            size="md"
            onClick={handleManageSubscription}
            className="w-full"
          >
            {state === 'active' ? t('settings.manageSubscription') : t('dashboard.upgrade')}
          </Button>
        </Card>

        {/* Legal */}
        <Card>
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Legal</h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate('/terms')}
              className="flex items-center justify-between text-sm text-[var(--text-primary)] py-1"
            >
              <span>Terms & Conditions</span>
              <span className="text-[var(--text-secondary)]">›</span>
            </button>
            <div className="border-t border-white/5" />
            <button
              onClick={() => navigate('/privacy')}
              className="flex items-center justify-between text-sm text-[var(--text-primary)] py-1"
            >
              <span>Privacy Policy</span>
              <span className="text-[var(--text-secondary)]">›</span>
            </button>
          </div>
        </Card>

        {/* Sign out */}
        <Button variant="danger" size="lg" onClick={() => setShowSignOut(true)}>
          {t('settings.signOut')}
        </Button>
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
    </Layout>
  );
}
