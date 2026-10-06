import { enGB, ro, ru, uk, fr, de, ar, it, pl } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import type { Language } from '../types';

const DATE_FNS_LOCALES: Record<Language, Locale> = {
  en: enGB,
  ro, ru, uk, fr, de, ar, it, pl,
};

export function getDateFnsLocale(language: Language): Locale {
  return DATE_FNS_LOCALES[language] || enGB;
}
