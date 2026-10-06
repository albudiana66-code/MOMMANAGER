import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useTranslation, Trans } from 'react-i18next';
import { Layout } from '../components/layout/Layout';
import { Header } from '../components/layout/Header';

const SECTION_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export function TermsScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const storeName = Capacitor.getPlatform() === 'ios' ? t('legal.terms.appleAppStore') : t('legal.terms.yourAppStoreAccount');

  return (
    <Layout>
      <Header title={t('legal.terms.pageTitle')} left={
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-secondary)]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          ‹
        </button>
      } />

      <div className="px-4 mt-3 pb-10 flex flex-col gap-5 text-sm text-[var(--text-secondary)] leading-relaxed">
        <p className="text-xs text-[var(--text-secondary)]">{t('legal.lastUpdated')}</p>

        {SECTION_NUMBERS.map((n) => (
          <section key={n}>
            <h2 className="font-semibold text-[var(--text-primary)] mb-1">{t(`legal.terms.section${n}Title`)}</h2>
            <p>
              <Trans
                i18nKey={`legal.terms.section${n}Body`}
                values={n === 3 ? { storeName } : undefined}
                components={{ strong: <strong className="text-[var(--text-primary)]" /> }}
              />
            </p>
          </section>
        ))}
      </div>
    </Layout>
  );
}
