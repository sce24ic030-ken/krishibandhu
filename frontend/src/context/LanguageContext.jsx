import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  TRANSLATIONS,
} from './translations';

// ==========================================
// LANGUAGE CONTEXT
// English (default) / Marathi / Hindi
// Persists the choice in localStorage and
// applies the lang attribute to <html>.
// ==========================================

const LanguageContext = createContext(null);

const LANG_KEY = 'krishibandhu_lang';

const SUPPORTED = ['en', 'mr', 'hi'];

const getInitialLang = () => {
  const stored = localStorage.getItem(LANG_KEY);

  if (stored && SUPPORTED.includes(stored)) {
    return stored;
  }

  return 'en';
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(getInitialLang);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);

    document.documentElement.lang = lang;
  }, [lang]);

  const translate = (key, ...args) => {
    const lookup = TRANSLATIONS[lang] || {};

    const template =
      lang === 'en'
        ? key
        : lookup[key] || key;

    let text = template;

    args.forEach((arg, index) => {
      text = text
        .split(`{${index}}`)
        .join(String(arg ?? ''));
    });

    return text;
  };

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: translate,
      supportedLanguages: SUPPORTED,
    }),
    [lang],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      'useLanguage must be used inside LanguageProvider.',
    );
  }

  return context;
};