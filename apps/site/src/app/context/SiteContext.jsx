import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { UI_TEXT, LANGUAGE_OPTIONS } from '../data/siteData.js';

const SiteContext = createContext(null);

const SUPPORTED = LANGUAGE_OPTIONS.map((option) => option.code);
const DEFAULT_LANGUAGE = 'ru';
const LANG_STORAGE_KEY = 'olan-lang';
// Ключ намеренно новый.
//
// Прежние версии сайта записывали тему в 'olan-theme' при каждом заходе,
// даже когда посетитель её не выбирал. У всех, кто открывал сайт раньше,
// там осталось «решение», из-за которого системная тема не срабатывала.
// Новый ключ игнорирует эту запись: определение по системе снова работает,
// а свой выбор посетитель сделает заново одним нажатием.
const THEME_STORAGE_KEY = 'olan-theme-choice';

// Какая тема стоит в системе у посетителя.
function systemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

// Свой выбор, если посетитель уже переключал тему руками.
function savedTheme() {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

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
  // Тема берётся из настроек системы посетителя. Если человек переключил
  // её на сайте вручную, дальше уважается только его выбор — система
  // больше не вмешивается.
  const [theme, setTheme] = useState(() => savedTheme() ?? systemTheme());
  // Был ли выбор сделан руками. От этого зависит, слушать ли систему.
  const [themePinned, setThemePinned] = useState(() => savedTheme() !== null);
  const [language, setLanguageState] = useState(getInitialLanguage);

  // Применяем тему к странице. В хранилище пишем только тогда, когда
  // выбор сделан вручную: иначе автоматически определённая тема
  // записалась бы как решение посетителя и заморозилась навсегда.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    if (!themePinned) return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme, themePinned]);

  // Пока посетитель не выбрал тему сам, следим за системной настройкой:
  // переключил человек тёмный режим в операционной системе — сайт
  // переключится следом, не дожидаясь перезагрузки страницы.
  useEffect(() => {
    if (themePinned || typeof window === 'undefined' || !window.matchMedia) return undefined;

    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setTheme(event.matches ? 'dark' : 'light');

    if (query.addEventListener) query.addEventListener('change', onChange);
    else query.addListener(onChange); // старые версии Safari

    return () => {
      if (query.removeEventListener) query.removeEventListener('change', onChange);
      else query.removeListener(onChange);
    };
  }, [themePinned]);

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
      // Ручное переключение: с этого момента системная настройка
      // перестаёт влиять, а выбор сохраняется между визитами.
      toggleTheme: () => {
        setThemePinned(true);
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
      },
      // Вернуться к системной теме — на случай, если понадобится кнопка
      // «как в системе».
      useSystemTheme: () => {
        try { localStorage.removeItem(THEME_STORAGE_KEY); } catch { /* ignore */ }
        setThemePinned(false);
        setTheme(systemTheme());
      },
      themePinned,
      text: UI_TEXT[language] || UI_TEXT.ru,
    }),
    [theme, themePinned, language],
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
