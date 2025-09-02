import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Build-safe i18n configuration
let isInitialized = false;

const initI18n = async () => {
  if (isInitialized || typeof window === 'undefined') {
    return i18n;
  }

  try {
    // Dynamic imports to prevent build-time issues
    const [{ default: LanguageDetector }, { default: HttpBackend }] = await Promise.all([
      import('i18next-browser-languagedetector'),
      import('i18next-http-backend')
    ]);

    await i18n
      .use(HttpBackend)
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        fallbackLng: 'en',
        defaultNS: 'common',
        ns: ['common'],
        debug: false,
        
        backend: {
          loadPath: '/locales/{{lng}}/{{ns}}.json',
        },
        
        interpolation: {
          escapeValue: false, // React already does escaping
        },
        
        detection: {
          order: ['localStorage', 'navigator', 'htmlTag'],
          caches: ['localStorage'],
        },
      });

    isInitialized = true;
    
    // Make i18n available globally for the language store
    if (typeof window !== 'undefined') {
      window.i18n = i18n;
    }
  } catch (error) {
    console.warn('Failed to initialize i18n:', error);
  }

  return i18n;
};

// Initialize only on client-side
if (typeof window !== 'undefined') {
  initI18n();
}

export default i18n;
export { initI18n };