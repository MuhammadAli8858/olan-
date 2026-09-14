import { useState } from 'react';
import { Menu, X, Sun, Moon, Phone, Globe, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSite } from '../context/SiteContext.jsx';
import { localize, PORTFOLIO } from '../data/siteData.js';

export function Header({ route, onNavigate, onSection, onHome }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  // Какое подменю сейчас раскрыто при наведении.
  const [openMenu, setOpenMenu] = useState('');
  const { text, theme, toggleTheme, language, setLanguage, languageOptions } = useSite();

  // Каждый пункт — отдельная страница со своим адресом.
  // На главной остались только первый экран, подбор по задаче,
  // преимущества, порядок заказа и блок партнёра.
  // Подменю собираются из самого контента: добавили направление или продукт
  // в админке — он сразу появится в шапке, править код не нужно.
  const productItems = (PORTFOLIO || []).map((item) => ({
    name: localize(item.title, language),
    // Каталог — не описание продукта, а сам каталог оборудования.
    target: item.id === 'catalog' ? 'catalog' : `product-${item.id}`,
  }));

  // «О компании» — без подменю: разделы открываются карточками уже
  // на самой странице. Каталог переехал внутрь «Продуктов».
  // Контакты живут на главной, отдельного пункта им не нужно.
  const navItems = [
    { name: 'О компании', target: 'about', isPage: true },
    { name: 'Услуги', target: 'directions', isPage: true },
    { name: 'Продукты', target: 'portfolio', isPage: true, children: productItems },
    { name: 'Задачи', target: 'cases', isPage: true },
    { name: text.nav.faq, target: 'faq', isPage: true },
    // Контакты — секция на главной, поэтому не страница, а переход с прокруткой.
    { name: text.nav.contact, target: 'contact', isPage: false, href: 'contact' },
  ];

  const handleNav = (item) => {
    if (item.isPage) onNavigate(item.target);
    else onSection(item.href);
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 dark:border-cyan-500/15 bg-white backdrop-blur-xl transition-colors dark:bg-black/75">
      <nav className="container mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between gap-4">
          <motion.button
            type="button"
            onClick={onHome || (() => onNavigate('home'))}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <img src="/olan_logo.svg" alt={text.brand} className="h-9 w-9 rounded-xl object-cover shadow-lg shadow-cyan-500/20" />
            <div className="hidden text-left sm:block">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-lg font-bold text-transparent">
                {text.brand}
              </div>
              <div className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-lg font-bold text-transparent">PROJECT</div>
            </div>
          </motion.button>

          <motion.div
            className="hidden items-center gap-4 lg:flex xl:gap-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {navItems.map((item) => (
              item.children && item.children.length > 0 ? (
                <div
                  key={item.target}
                  className="relative"
                  onMouseEnter={() => setOpenMenu(item.target)}
                  onMouseLeave={() => setOpenMenu('')}
                >
                  <button
                    type="button"
                    onClick={() => handleNav(item)}
                    className={`inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium transition-colors hover:text-cyan-600 dark:hover:text-cyan-400 ${route === item.target ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    {item.name}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openMenu === item.target ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {openMenu === item.target && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full z-50 w-72 pt-3"
                      >
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl shadow-slate-900/10 dark:border-cyan-500/20 dark:bg-slate-950 dark:shadow-black/40">
                          {item.children.map((child) => (
                            <button
                              key={child.target + child.name}
                              type="button"
                              onClick={() => { onNavigate(child.target); setOpenMenu(''); }}
                              className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-300 dark:hover:bg-cyan-500/10 dark:hover:text-cyan-300"
                            >
                              {child.name}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
              <button
                key={item.target || item.href}
                type="button"
                onClick={() => handleNav(item)}
                className={`relative whitespace-nowrap text-sm font-medium transition-colors hover:text-cyan-600 dark:hover:text-cyan-400 ${route === item.target ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-700 dark:text-slate-300'}`}
              >
                {item.name}
              </button>
              )
            ))}
          </motion.div>

          <div className="hidden items-center gap-3 lg:flex">
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangOpen((prev) => !prev)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 dark:border-cyan-500/20 bg-white px-3 text-sm text-slate-700 transition hover:border-cyan-500/50 hover:text-cyan-600 dark:bg-slate-900 dark:text-slate-200"
                aria-label={text.actions.language}
              >
                <Globe className="h-4 w-4" />
                <span className="font-semibold uppercase">{language}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              {langOpen && (
                <>
                  <button
                    type="button"
                    aria-hidden="true"
                    tabIndex={-1}
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setLangOpen(false)}
                  />
                  <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-slate-200 dark:border-cyan-500/20 bg-white py-1 shadow-xl dark:bg-slate-900">
                    {languageOptions.map((option) => (
                      <button
                        key={option.code}
                        type="button"
                        onClick={() => {
                          setLanguage(option.code);
                          setLangOpen(false);
                        }}
                        className={`block w-full px-4 py-2 text-left text-sm transition hover:bg-cyan-500/10 ${option.code === language ? 'font-semibold text-cyan-600 dark:text-cyan-400' : 'text-slate-700 dark:text-slate-200'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-cyan-500/20 bg-white text-slate-700 transition hover:border-cyan-500/50 hover:text-cyan-600 dark:bg-slate-900 dark:text-slate-200"
              aria-label={theme === 'dark' ? text.actions.themeLight : text.actions.themeDark}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => onSection('contact')}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 transition hover:translate-y-[-1px]"
            >
              <Phone className="h-4 w-4" />
              {text.actions.contact}
            </button>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-cyan-500/20 bg-white text-slate-700 lg:hidden dark:bg-slate-900 dark:text-slate-200"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Открыть меню"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden lg:hidden"
            >
              <div className="mt-4 space-y-3 rounded-3xl border border-slate-200 dark:border-cyan-500/20 bg-white/90 p-4 dark:bg-slate-950/90">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full rounded-2xl border border-slate-200 dark:border-cyan-500/20 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                >
                  {theme === 'dark' ? text.actions.themeLight : text.actions.themeDark}
                </button>

                <div className="rounded-2xl border border-slate-200 dark:border-cyan-500/20 p-2">
                  <div className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">{text.actions.language}</div>
                  <div className="grid grid-cols-3 gap-2">
                    {languageOptions.map((option) => (
                      <button
                        key={option.code}
                        type="button"
                        onClick={() => {
                          setLanguage(option.code);
                          setMobileMenuOpen(false);
                        }}
                        className={`rounded-xl px-2 py-2 text-sm transition ${option.code === language ? 'bg-cyan-500/15 font-semibold text-cyan-600 dark:text-cyan-300' : 'text-slate-700 hover:bg-cyan-500/10 dark:text-slate-200'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {navItems.map((item) => (
                  <button
                    key={item.target || item.href}
                    type="button"
                    onClick={() => {
                      handleNav(item);
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full rounded-2xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-cyan-500/10 hover:text-cyan-600 dark:text-slate-200"
                  >
                    {item.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    onSection('contact');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-medium text-white"
                >
                  {text.actions.contact}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
