import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

export function SuccessScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { updateProfile, refreshProfile } = useAuth();

  useEffect(() => {
    updateProfile({ subscription_status: 'active' }).then(() => refreshProfile());
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[var(--bg-primary)]">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="text-center flex flex-col items-center gap-6"
      >
        <div className="text-7xl">🎉</div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('success.title')}</h1>
        <p className="text-[var(--text-secondary)]">{t('success.message')}</p>
        <Button variant="primary" size="lg" onClick={() => navigate('/')}>
          {t('success.continue')}
        </Button>
      </motion.div>
    </div>
  );
}
