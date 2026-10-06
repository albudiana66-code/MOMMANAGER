import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { Browser } from '@capacitor/browser';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from './supabaseAuth';
import type { Profile } from '../types';

// Custom URL scheme (must match ios/App/App/Info.plist and android AndroidManifest.xml,
// and be registered in Supabase Dashboard -> Auth -> URL Configuration -> Redirect URLs)
const GOOGLE_NATIVE_REDIRECT = 'com.soldoutdigital.mommanager://auth-callback';

// Stripe checkout return, on native only — see stripe-checkout edge function.
const PAYMENT_CALLBACK_HOST = 'com.soldoutdigital.mommanager://payment-callback';
const PAYMENT_CANCEL_HOST = 'com.soldoutdigital.mommanager://payment-cancel';

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─────────────────────────────────────────────
// Dev bypass — set VITE_DEV_BYPASS=true in .env.local
// to skip Supabase auth in local preview
// ─────────────────────────────────────────────

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === 'true';

const DEV_USER: User = {
  id: 'dev-user-001',
  email: 'dev@mommanager.app',
  app_metadata: {},
  user_metadata: { full_name: 'Dev User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as unknown as User;

const DEV_PROFILE: Profile = {
  id: 'dev-user-001',
  email: 'dev@mommanager.app',
  name: 'Dev User',
  avatar_url: '',
  language: 'en',
  currency: 'GBP',
  theme: 'light',
  subscription_status: 'pro_monthly',
  created_at: new Date().toISOString(),
  ai_consent: true,
};

// ─────────────────────────────────────────────
// Profile helpers
// ─────────────────────────────────────────────

async function fetchProfile(userId: string): Promise<Profile | null> {
  console.log('[Auth] fetchProfile: querying profiles table for', userId);
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('[Auth] fetchProfile error for', userId, '-', error.message, error);
    return null;
  }
  console.log('[Auth] fetchProfile: row found for', userId, data);
  return data ?? null;
}

async function createProfile(user: User): Promise<Profile | null> {
  console.log('[Auth] createProfile: no existing row, inserting profile for', user.id);
  const meta = user.user_metadata ?? {};
  const name =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    user.email?.split('@')[0] ||
    'User';

  const profile = {
    id: user.id,
    email: user.email ?? '',
    name,
    avatar_url: typeof meta.avatar_url === 'string' ? meta.avatar_url : '',
    language: 'en',
    currency: 'GBP',
    theme: 'light',
    subscription_status: null,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single();

  if (error) {
    console.error('[Auth] createProfile insert error for', user.id, '-', error.message, error);
    // Profile may already exist (e.g. created by the DB trigger) — re-fetch
    return fetchProfile(user.id);
  }
  console.log('[Auth] createProfile: inserted profile for', user.id, data);
  return data ?? null;
}

async function getOrCreateProfile(user: User): Promise<Profile | null> {
  console.log('[Auth] getOrCreateProfile: start for', user.id);
  const existing = await fetchProfile(user.id);
  if (existing) return existing;
  return createProfile(user);
}

// ─────────────────────────────────────────────
// Context type
// ─────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<string | null>;
  signInWithApple: () => Promise<string | null>;
  signInWithAppleWeb: () => Promise<string | null>;
  signInWithEmail: (email: string, password: string) => Promise<string | null>;
  signUpWithEmail: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<string | null>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(DEV_BYPASS ? DEV_USER : null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(DEV_BYPASS ? DEV_PROFILE : null);
  const [loading, setLoading] = useState(!DEV_BYPASS);

  useEffect(() => {
    if (DEV_BYPASS) return; // skip Supabase in dev bypass mode

    // 1. Restore existing session on mount
    console.log('[Auth] mount: calling getSession()');
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      console.log('[Auth] getSession() resolved, user:', s?.user?.id ?? null);
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const p = await getOrCreateProfile(s.user);
        console.log('[Auth] mount: profile resolved:', p);
        setProfile(p);
      }
      setLoading(false);
      console.log('[Auth] mount: loading set to false');
      // Clean OAuth tokens from URL after redirect-back
      if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    // 2. Listen for auth state changes
    // NOTE: this callback is kept synchronous (no top-level `await`). Awaiting
    // another Supabase call directly inside onAuthStateChange can deadlock the
    // client's internal auth lock (documented Supabase gotcha, worst on the
    // first SIGNED_IN event right after signup/login). Async work is deferred
    // via setTimeout(0) so it runs after the lock is released.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        console.log('[Auth] onAuthStateChange fired:', event, 'user:', s?.user?.id ?? null);
        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
          setTimeout(async () => {
            console.log(`[Auth] (${event}) deferred: fetching/creating profile for`, s.user.id);
            const p = await getOrCreateProfile(s.user);
            console.log(`[Auth] (${event}) deferred: profile resolved:`, p);
            setProfile(p);
          }, 0);
        }

        if (event === 'SIGNED_OUT') {
          console.log('[Auth] SIGNED_OUT — clearing profile');
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Native deep-link callback (Google OAuth in-app browser sheet) ────────
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
      console.log('[Auth] appUrlOpen received:', url);
      await Browser.close().catch(() => {});

      if (url.startsWith(PAYMENT_CALLBACK_HOST)) {
        // Stripe checkout finished — hand off to SuccessScreen, which verifies
        // the session server-side before granting anything.
        const sessionId = new URLSearchParams(url.split('?')[1] ?? '').get('session_id');
        if (sessionId) navigate(`/success?session_id=${sessionId}`);
        return;
      }

      if (url.startsWith(PAYMENT_CANCEL_HOST)) {
        // Underlying screen never navigated away — closing the browser above
        // already returns the user to the paywall, nothing else to do.
        return;
      }

      if (!url.startsWith(GOOGLE_NATIVE_REDIRECT)) return;

      // Supabase returns either a PKCE `?code=` (query string) or an
      // implicit-flow `#access_token=`/`refresh_token=` (URL fragment) —
      // which one shows up here depends on the project's Auth flow type, so
      // both must be handled rather than assuming PKCE.
      const query = new URLSearchParams(url.split('?')[1]?.split('#')[0] ?? '');
      const fragment = new URLSearchParams(url.split('#')[1] ?? '');
      const code = query.get('code');
      const accessToken = fragment.get('access_token');
      const refreshToken = fragment.get('refresh_token');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) console.error('[Auth] exchangeCodeForSession error:', error.message);
        else console.log('[Auth] exchangeCodeForSession succeeded');
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) console.error('[Auth] setSession error:', error.message);
        else console.log('[Auth] setSession succeeded');
      } else {
        console.error('[Auth] appUrlOpen: no code or access_token in callback URL');
      }
    });

    return () => {
      listenerPromise.then((listener) => listener.remove());
    };
  }, []);

  // ── Sign in with Google ──────────────────────────────────────────────────
  async function signInWithGoogle(): Promise<string | null> {
    if (Capacitor.isNativePlatform()) {
      console.log('[Auth] signInWithGoogle: native flow, opening in-app browser sheet');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: GOOGLE_NATIVE_REDIRECT, skipBrowserRedirect: true },
      });
      if (error || !data?.url) {
        console.error('[Auth] signInWithGoogle native error:', error?.message);
        return error?.message ?? 'Could not start Google sign-in.';
      }
      await Browser.open({ url: data.url, presentationStyle: 'popover' });
      // Completion happens asynchronously via the appUrlOpen listener — do not navigate here.
      return null;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    // Browser redirects away — session picked up on return via onAuthStateChange
    return error?.message ?? null;
  }

  // ── Sign in with Apple (native on iOS, web OAuth elsewhere) ──────────────
  async function signInWithApple(): Promise<string | null> {
    if (Capacitor.getPlatform() === 'ios') {
      console.log('[Auth] signInWithApple: native iOS flow');
      try {
        const rawNonce = generateNonce();
        const hashedNonce = await sha256Hex(rawNonce);
        const { response } = await SignInWithApple.authorize({
          clientId: 'com.soldoutdigital.mommanager',
          redirectURI: window.location.origin,
          scopes: 'email name',
          nonce: hashedNonce,
        });
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: response.identityToken,
          nonce: rawNonce,
        });
        if (error) {
          console.error('[Auth] signInWithApple native error:', error.message);
          return error.message;
        }
        console.log('[Auth] signInWithApple native: success');
        return null;
      } catch (e) {
        console.error('[Auth] signInWithApple native exception:', e);
        return e instanceof Error ? e.message : 'Apple sign-in was cancelled or failed.';
      }
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    });
    if (error) return error.message;
    return null;
  }

  async function signInWithAppleWeb(): Promise<string | null> {
    return signInWithApple();
  }

  // ── Email sign-in ────────────────────────────────────────────────────────
  async function signInWithEmail(email: string, password: string): Promise<string | null> {
    console.log('[Auth] signInWithEmail: calling signInWithPassword for', email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[Auth] signInWithEmail error:', error.message, error);
      if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
        return 'Email or password is incorrect.';
      }
      if (error.message.includes('Email not confirmed')) {
        return 'Please confirm your email address before signing in.';
      }
      return error.message;
    }
    console.log('[Auth] signInWithEmail: success, session user:', data.session?.user?.id ?? null);
    return null;
  }

  // ── Email sign-up ────────────────────────────────────────────────────────
  async function signUpWithEmail(email: string, password: string): Promise<string | null> {
    console.log('[Auth] signUpWithEmail: calling signUp for', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      console.error('[Auth] signUpWithEmail error:', error.message, error);
      if (error.message.includes('already registered') || error.message.includes('user_already_exists')) {
        return 'An account with this email already exists. Try signing in.';
      }
      if (error.message.includes('Password should be')) {
        return 'Password must be at least 6 characters.';
      }
      return error.message;
    }
    // Email confirmation required — session is null until confirmed
    if (!data.session) {
      console.log('[Auth] signUpWithEmail: no session returned — email confirmation required for', email);
      return 'Check your email to confirm your account, then sign in.';
    }
    console.log('[Auth] signUpWithEmail: success, session created immediately for', data.session.user?.id);
    return null;
  }

  // ── Sign out ─────────────────────────────────────────────────────────────
  async function signOut(): Promise<void> {
    console.log('[Auth] signOut: calling supabase.auth.signOut()');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    console.log('[Auth] signOut: local state cleared');
  }

  // ── Delete account ───────────────────────────────────────────────────────
  async function deleteAccount(): Promise<string | null> {
    if (!user) return 'Not signed in.';
    try {
      // Delete profile row (RLS ensures user can only delete their own)
      await supabase.from('profiles').delete().eq('id', user.id);
      // Request auth user deletion via Edge Function (if available)
      await supabase.functions.invoke('delete-user').catch(() => {
        // Edge function optional — profile deletion is sufficient for compliance
      });
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Could not delete account.';
    }
  }

  // ── Update profile ───────────────────────────────────────────────────────
  async function updateProfile(updates: Partial<Profile>): Promise<void> {
    if (!user || !profile) return;
    const optimistic = { ...profile, ...updates };
    setProfile(optimistic);

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      console.error('updateProfile error:', error.message);
      setProfile(profile); // revert
    }
  }

  // ── Refresh profile from DB ──────────────────────────────────────────────
  async function refreshProfile(): Promise<void> {
    if (!user) return;
    const p = await fetchProfile(user.id);
    if (p) setProfile(p);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signInWithGoogle,
        signInWithApple,
        signInWithAppleWeb,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        deleteAccount,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
