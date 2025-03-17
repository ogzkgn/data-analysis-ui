import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations
import translationEN from './locales/en.json';
import translationTR from './locales/tr.json';

// the translations
const resources = {
  en: {
    translation: translationEN
  },
  tr: {
    translation: translationTR
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language - this will be overridden by the settings
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    fallbackLng: 'en',
    keySeparator: '.',
    react: {
      useSuspense: true
    }
  });

export default i18n; 