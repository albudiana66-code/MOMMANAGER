import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ro from './locales/ro.json';
import ru from './locales/ru.json';
import uk from './locales/uk.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ar from './locales/ar.json';
import it from './locales/it.json';
import pl from './locales/pl.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ro: { translation: ro },
      ru: { translation: ru },
      uk: { translation: uk },
      fr: { translation: fr },
      de: { translation: de },
      ar: { translation: ar },
      it: { translation: it },
      pl: { translation: pl },
    },
    lng: localStorage.getItem('mm_language') || 'en',
    fallbackLng: 'en',
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'mm_language',
    },
  });

export default i18n;
