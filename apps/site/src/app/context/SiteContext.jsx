import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { UI_TEXT, LANGUAGE_OPTIONS } from '../data/siteData.js';

const SiteContext = createContext(null);

const SUPPORTED = LANGUAGE_OPTIONS.map((option) => option.code);
const DEFAULT_LANGUAGE = 'ru';
const LANG_STORAGE_KEY = 'olan-lang';

function getInitialLanguage() {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_LANGUAGE;
}

export function SiteProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Светлая тема по умолчанию: основной контент читают и печатают,
    // а часть аудитории смотрит сайт при ярком свете. Тёмная остаётся
    // переключателем и запоминается для каждого посетителя.
    if (typeof window === 'undefined') return 'light';
    try {
      return localStorage.getItem('olan-theme') || 'light';
    } catch {
      return 'light';
    }
  });
  const [language, setLanguageState] = useState(getInitialLanguage);

  useEffect(() => {
    try {
      localStorage.setItem('olan-theme', theme);
    } catch {
      /* ignore */
    }
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, language);
    } catch {
      /* ignore */
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      // Арабский пишется справа налево — переключаем направление страницы,
      // иначе вёрстка будет читаться наизнанку.
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [language]);

  const setLanguage = (lang) => {
    if (SUPPORTED.includes(lang)) setLanguageState(lang);
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      languageOptions: LANGUAGE_OPTIONS,
      theme,
      setTheme,
      toggleTheme: () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark')),
      text: UI_TEXT[language] || UI_TEXT.ru,
    }),
    [theme, language],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error('useSite must be used inside SiteProvider');
  }
  return context;
}
