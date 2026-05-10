import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

type Mode = 'signin' | 'signup';

export function AuthScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate('/');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleEmailSubmit() {
    setError(null);
    if (!email || !password) {
      setError(t('auth.fillEmailAndPassword'));
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signin') {
        const err = await signInWithEmail(email, password);
        if (err) {
          setError(err);
        } else {
          navigate('/');
        }
      } else {
        const err = await signUpWithEmail(email, password);
        if (err) {
          setError(err);
        } else {
          navigate('/');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[var(--bg-primary)]">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm flex flex-col items-center gap-8"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#E91E8C] to-[#c2185b] flex items-center justify-center shadow-2xl shadow-pink-500/30"
          >
            <span className="text-5xl">💗</span>
          </motion.div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">
              {t('app.name')}
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">
              {t('auth.tagline')}
            </p>
          </div>
        </div>

        {/* Auth card */}
        <div className="w-full bg-[var(--bg-card)] rounded-3xl p-6 flex flex-col gap-4 shadow-xl border border-white/5">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {t('auth.welcome')}
            </h2>
          </div>

          {/* Google button */}
          <Button
            variant="secondary"
            size="lg"
            loading={googleLoading}
            onClick={handleGoogleLogin}
            className="border-white/15 gap-3"
          >
            {!googleLoading && (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {googleLoading ? t('auth.signingIn') : t('auth.signInWithGoogle')}
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-[var(--text-secondary)]">{t('auth.or')}</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email + password inputs */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-[var(--bg-primary)] border border-white/10 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[#E91E8C] transition-colors"
          />
          <input
            type="password"
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
            className="w-full rounded-xl bg-[var(--bg-primary)] border border-white/10 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[#E91E8C] transition-colors"
          />

          {/* Error / success */}
          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}


          {/* Submit button */}
          <Button
            variant="primary"
            size="lg"
            loading={loading}
            onClick={handleEmailSubmit}
          >
            {loading
              ? t('auth.signingIn')
              : mode === 'signin'
              ? t('auth.signIn')
              : t('auth.signUp')}
          </Button>

          {/* Mode toggle */}
          <p className="text-center text-xs text-[var(--text-secondary)]">
            {mode === 'signin' ? (
              <>
                {t('auth.newAccount')}{' '}
                <button
                  onClick={() => { setMode('signup'); setError(null); }}
                  className="text-[#E91E8C] font-semibold"
                >
                  {t('auth.signUp')}
                </button>
              </>
            ) : (
              <>
                {t('auth.alreadyHaveAccount')}{' '}
                <button
                  onClick={() => { setMode('signin'); setError(null); }}
                  className="text-[#E91E8C] font-semibold"
                >
                  {t('auth.signIn')}
                </button>
              </>
            )}
          </p>
        </div>

        <p className="text-xs text-[var(--text-secondary)] text-center opacity-60">
          MomManager © 2025
        </p>
      </motion.div>
    </div>
  );
}
