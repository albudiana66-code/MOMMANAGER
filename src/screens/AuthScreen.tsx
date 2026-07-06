import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

type Mode = 'signin' | 'signup';

export function AuthScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithApple, signInWithAppleWeb, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const isIOS = Capacitor.getPlatform() === 'ios';
  const isWeb = !Capacitor.isNativePlatform();

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate('/');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleAppleLogin() {
    setError(null);
    setAppleLoading(true);
    try {
      const err = await signInWithApple();
      if (err) setError(err);
      else navigate('/');
    } catch {
      // ignore
    } finally {
      setAppleLoading(false);
    }
  }

  async function handleEmailSubmit() {
    setError(null);
    if (!email || !password) {
      setError(t('auth.fillEmailAndPassword'));
      return;
    }
    setLoading(true);
    console.log(`[AuthScreen] handleEmailSubmit: mode=${mode}, email=${email}`);
    try {
      if (mode === 'signin') {
        const err = await signInWithEmail(email, password);
        if (err) {
          console.log('[AuthScreen] signInWithEmail returned error:', err);
          setError(err);
        } else {
          console.log('[AuthScreen] signInWithEmail succeeded — navigating to /');
          navigate('/');
        }
      } else {
        const err = await signUpWithEmail(email, password);
        if (err) {
          console.log('[AuthScreen] signUpWithEmail returned error:', err);
          setError(err);
        } else {
          console.log('[AuthScreen] signUpWithEmail succeeded — navigating to /');
          navigate('/');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        backgroundImage: "url('/bg-dashboard.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
      }}
    >
      {/* Soft overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(255,248,240,0.35)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm flex flex-col items-center gap-6"
        style={{ position: 'relative', zIndex: 1 }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ repeat: Infinity, duration: 4 }}
          >
            {/* SVG Logo — heart + calendar + crown in app colors */}
            <svg width="88" height="88" viewBox="0 0 88 88" fill="none" style={{ filter: 'drop-shadow(0 6px 20px rgba(212,168,67,0.30))' }}>
              <rect width="88" height="88" rx="22" fill="url(#logoGrad)" />
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="88" y2="88" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#EDD8C0" />
                  <stop offset="100%" stopColor="#D4A843" />
                </linearGradient>
              </defs>
              {/* Heart */}
              <path d="M44 68 C44 68 18 52 18 34 C18 25 25 18 34 18 C38.8 18 43 20.5 44 23.5 C45 20.5 49.2 18 54 18 C63 18 70 25 70 34 C70 52 44 68 44 68Z"
                fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
              {/* Crown */}
              <path d="M33 20 L36 13 L44 18 L52 13 L55 20"
                stroke="rgba(255,255,255,0.92)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              {/* Calendar */}
              <rect x="31" y="30" width="26" height="22" rx="4" fill="rgba(255,255,255,0.88)" />
              <line x1="31" y1="37" x2="57" y2="37" stroke="rgba(196,120,138,0.4)" strokeWidth="1.5" />
              <rect x="34" y="40" width="5" height="5" rx="1" fill="#C4788A" fillOpacity="0.75" />
              <rect x="41.5" y="40" width="5" height="5" rx="1" fill="#D4A843" fillOpacity="0.8" />
              <rect x="49" y="40" width="5" height="5" rx="1" fill="rgba(196,120,138,0.25)" />
              <path d="M35 43 L36.5 44.5 L39.5 41.5" stroke="#C4788A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </motion.div>
          <div className="text-center">
            <h1 style={{ fontSize: 28, fontWeight: 300, letterSpacing: '-0.02em', color: '#3D2B1F', margin: 0 }}>
              MomManager
            </h1>
            <p style={{ fontSize: 13, color: '#8A7060', marginTop: 4, letterSpacing: '0.04em', fontWeight: 400 }}>
              {t('auth.tagline')}
            </p>
          </div>
        </div>

        {/* Auth card */}
        <div
          className="w-full rounded-3xl p-6 flex flex-col gap-4"
          style={{
            background: 'rgba(255,255,255,0.22)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.50)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.06)',
          }}
        >
          <div className="text-center">
            <h2
              className="text-xl text-[var(--text-primary)]"
              style={{ fontWeight: 500, letterSpacing: '-0.01em' }}
            >
              {t('auth.welcome')}
            </h2>
          </div>

          {/* Apple button — FIRST, iOS native + web */}
          {(isIOS || isWeb) && (
            <button
              onClick={handleAppleLogin}
              disabled={appleLoading}
              className="w-full flex items-center justify-center gap-3 rounded-xl font-medium text-sm transition-opacity active:opacity-80 disabled:opacity-60"
              style={{
                background: 'rgba(30,28,26,0.88)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: '#ffffff',
                height: 50,
                letterSpacing: '-0.01em',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 14,
              }}
            >
              {appleLoading ? (
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>{t('auth.signingIn')}</span>
              ) : (
                <>
                  <svg width="18" height="22" viewBox="0 0 814 1000" fill="currentColor">
                    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105.9-57.4-155.5-127.4C46.7 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.6-50.1 185.4-50.1zm-13.4-170.8c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
                  </svg>
                  {t('auth.signInWithApple')}
                </>
              )}
            </button>
          )}

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 font-medium text-sm transition-opacity active:opacity-80 disabled:opacity-60"
            style={{
              background: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: '#3D2B1F',
              border: '1px solid rgba(255,255,255,0.70)',
              height: 50,
              borderRadius: 14,
              letterSpacing: '-0.01em',
            }}
          >
            {googleLoading ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t('auth.signInWithGoogle')}
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs text-[var(--text-muted)]">{t('auth.or')}</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          {/* Email + password inputs */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.45)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.65)',
              color: '#3D2B1F',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
          />
          <input
            type="password"
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.45)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.65)',
              color: '#3D2B1F',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
          />

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
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
                  className="text-[var(--accent)] font-medium"
                >
                  {t('auth.signUp')}
                </button>
              </>
            ) : (
              <>
                {t('auth.alreadyHaveAccount')}{' '}
                <button
                  onClick={() => { setMode('signin'); setError(null); }}
                  className="text-[var(--accent)] font-medium"
                >
                  {t('auth.signIn')}
                </button>
              </>
            )}
          </p>
        </div>

        <p className="text-xs text-[var(--text-muted)] text-center opacity-60">
          MomManager © 2025
        </p>
      </motion.div>
    </div>
  );
}
