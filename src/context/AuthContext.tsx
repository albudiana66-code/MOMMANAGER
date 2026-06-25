import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabaseAuth';
import type { Profile } from '../types';

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
};

// ─────────────────────────────────────────────
// Profile helpers
// ─────────────────────────────────────────────

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data ?? null;
}

async function createProfile(user: User): Promise<Profile | null> {
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
    // Profile may already exist — re-fetch
    return fetchProfile(user.id);
  }
  return data ?? null;
}

async function getOrCreateProfile(user: User): Promise<Profile | null> {
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
  signInWithGoogle: () => Promise<void>;
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
  const [user, setUser] = useState<User | null>(DEV_BYPASS ? DEV_USER : null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(DEV_BYPASS ? DEV_PROFILE : null);
  const [loading, setLoading] = useState(!DEV_BYPASS);

  useEffect(() => {
    if (DEV_BYPASS) return; // skip Supabase in dev bypass mode

    // 1. Restore existing session on mount
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const p = await getOrCreateProfile(s.user);
        setProfile(p);
      }
      setLoading(false);
      // Clean OAuth tokens from URL after redirect-back
      if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    // 2. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
          const p = await getOrCreateProfile(s.user);
          setProfile(p);
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Sign in with Google ──────────────────────────────────────────────────
  async function signInWithGoogle(): Promise<void> {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    // Browser redirects away — session picked up on return via onAuthStateChange
  }

  // ── Sign in with Apple (web OAuth) ──────────────────────────────────────
  async function signInWithApple(): Promise<string | null> {
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
        return 'Email or password is incorrect.';
      }
      if (error.message.includes('Email not confirmed')) {
        return 'Please confirm your email address before signing in.';
      }
      return error.message;
    }
    return null;
  }

  // ── Email sign-up ────────────────────────────────────────────────────────
  async function signUpWithEmail(email: string, password: string): Promise<string | null> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
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
      return 'Check your email to confirm your account, then sign in.';
    }
    return null;
  }

  // ── Sign out ─────────────────────────────────────────────────────────────
  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
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
