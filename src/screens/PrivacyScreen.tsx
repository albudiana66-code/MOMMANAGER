import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { Layout } from '../components/layout/Layout';
import { Header } from '../components/layout/Header';

const LIST_SECTIONS = new Set([2, 3, 5, 7]);
const SECTION_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export function PrivacyScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Layout>
      <Header title={t('legal.privacy.pageTitle')} left={
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-secondary)]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          ‹
        </button>
      } />

      <div className="px-4 mt-3 pb-10 flex flex-col gap-5 text-sm text-[var(--text-secondary)] leading-relaxed">
        <p className="text-xs text-[var(--text-secondary)]">{t('legal.lastUpdated')}</p>

        {SECTION_NUMBERS.map((n) => {
          const isList = LIST_SECTIONS.has(n);
          return (
            <section key={n}>
              <h2 className="font-semibold text-[var(--text-primary)] mb-1">{t(`legal.privacy.section${n}Title`)}</h2>
              {isList ? (
                <>
                  <p>{t(`legal.privacy.section${n}Intro`)}</p>
                  <ul className="list-disc pl-5 mt-1 flex flex-col gap-1">
                    {(t(`legal.privacy.section${n}Items`, { returnObjects: true }) as string[]).map((item, i) => (
                      <li key={i}>
                        <Trans i18nKey={`legal.privacy.section${n}Items.${i}`} components={{ strong: <strong className="text-[var(--text-primary)]" /> }} />
                      </li>
                    ))}
                  </ul>
                  {n === 7 && (
                    <p className="mt-1">
                      <Trans i18nKey="legal.privacy.section7Contact" components={{ strong: <strong className="text-[var(--text-primary)]" /> }} />
                    </p>
                  )}
                </>
              ) : (
                <p>
                  <Trans i18nKey={`legal.privacy.section${n}Body`} components={{ strong: <strong className="text-[var(--text-primary)]" /> }} />
                </p>
              )}
            </section>
          );
        })}
      </div>
    </Layout>
  );
}
