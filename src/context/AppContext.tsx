import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { Currency, Language } from '../types';
import i18n from '../i18n';

interface AppContextType {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  language: Language;
  setLanguage: (l: Language) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { profile, updateProfile } = useAuth();

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('mm_theme') as 'dark' | 'light') || 'light';
  });
  const [currency, setCurrencyState] = useState<Currency>(() => {
    return (localStorage.getItem('mm_currency') as Currency) || 'GBP';
  });
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('mm_language') as Language) || 'en';
  });

  useEffect(() => {
    if (profile) {
      setTheme(profile.theme || 'light');
      setCurrencyState((profile.currency as Currency) || 'GBP');
      setLanguageState((profile.language as Language) || 'ro');
    }
  }, [profile?.id]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('mm_theme', theme);
  }, [theme]);

  useEffect(() => {
    const dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', language);
    localStorage.setItem('mm_language', language);
    i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('mm_currency', currency);
  }, [currency]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    updateProfile({ theme: next });
  }

  function setCurrency(c: Currency) {
    setCurrencyState(c);
    updateProfile({ currency: c });
  }

  function setLanguage(l: Language) {
    setLanguageState(l);
    updateProfile({ language: l });
  }

  return (
    <AppContext.Provider value={{ theme, toggleTheme, currency, setCurrency, language, setLanguage }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
