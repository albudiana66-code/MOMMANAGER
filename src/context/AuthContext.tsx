import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { addDays } from 'date-fns';
import type { Profile } from '../types';
import {
  type LocalUser,
  getLocalSession,
  localSignIn,
  localSignOut,
  localSignUp,
} from '../lib/localAuth';

const PROFILE_KEY = 'mm_local_profile';

function loadLocalProfile(userId: string): Profile | null {
  try {
    const raw = localStorage.getItem(`${PROFILE_KEY}_${userId}`);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

function saveLocalProfile(profile: Profile) {
  localStorage.setItem(`${PROFILE_KEY}_${profile.id}`, JSON.stringify(profile));
}

function createLocalProfile(user: LocalUser): Profile {
  const now = new Date();
  const profile: Profile = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: '',
    language: localStorage.getItem('mm_language') || 'en',
    currency: 'GBP',
    theme: 'dark',
    subscription_status: null,
    created_at: now.toISOString(),
  };
  saveLocalProfile(profile);
  return profile;
}

interface AuthContextType {
  user: LocalUser | null;
  session: null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<string | null>;
  signUpWithEmail: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const existing = getLocalSession();
    if (existing) {
      setUser(existing);
      let p = loadLocalProfile(existing.id);
      if (!p) p = createLocalProfile(existing);
      setProfile(p);
    }
    setLoading(false);
  }, []);

  async function signInWithGoogle() {
    const GOOGLE_EMAIL = 'albudiana66@gmail.com';
    const GOOGLE_NAME = 'Diana';
    // Try existing account first, create if not found
    let result = localSignIn(GOOGLE_EMAIL, '__google__');
    if (!result.user) {
      result = localSignUp(GOOGLE_EMAIL, '__google__');
      // Fix name to Diana (localSignUp derives name from email)
      if (result.user) {
        const users = JSON.parse(localStorage.getItem('mm_local_users') || '[]');
        const fixed = users.map((u: LocalUser & { password: string }) =>
          u.email === GOOGLE_EMAIL ? { ...u, name: GOOGLE_NAME } : u
        );
        localStorage.setItem('mm_local_users', JSON.stringify(fixed));
        const fixedUser = { ...result.user, name: GOOGLE_NAME };
        localStorage.setItem('mm_local_session', JSON.stringify(fixedUser));
        result = { user: fixedUser };
      }
    }
    if (!result.user) return;
    setUser(result.user);
    let p = loadLocalProfile(result.user.id);
    if (!p) p = createLocalProfile({ ...result.user, name: GOOGLE_NAME });
    setProfile(p);
  }

  async function signInWithEmail(email: string, password: string): Promise<string | null> {
    const { user: u, error } = localSignIn(email, password);
    if (error || !u) return error || 'Eroare necunoscută.';
    setUser(u);
    let p = loadLocalProfile(u.id);
    if (!p) p = createLocalProfile(u);
    setProfile(p);
    return null;
  }

  async function signUpWithEmail(email: string, password: string): Promise<string | null> {
    const { user: u, error } = localSignUp(email, password);
    if (error || !u) return error || 'Eroare necunoscută.';
    const p = createLocalProfile(u);
    setUser(u);
    setProfile(p);
    return null;
  }

  async function signOut() {
    localSignOut();
    setUser(null);
    setProfile(null);
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!profile) return;
    const updated = { ...profile, ...updates };
    saveLocalProfile(updated);
    setProfile(updated);
  }

  async function refreshProfile() {
    if (!user) return;
    const p = loadLocalProfile(user.id);
    if (p) setProfile(p);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session: null,
        profile,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
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
