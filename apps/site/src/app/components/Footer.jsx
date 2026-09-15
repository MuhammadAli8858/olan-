import { ArrowUp } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';
import { CONTACT_INFO } from '../data/siteData.js';
import { tr } from '../lib/i18n.js';

export function Footer({ onNavigate, onSection }) {
  const { text } = useSite();

  const footerLinks = [
    { label: text.nav.catalog, action: () => onSection('catalog') },
    { label: text.nav.solutions, action: () => onSection('solutions') },
    { label: text.nav.projects, action: () => onSection('projects') },
    { label: text.nav.about, action: () => onNavigate('about') },
    { label: text.nav.contact, action: () => onSection('contact') },
    { label: text.nav.faq, action: () => onSection('faq') },
  ];

  return (
    <footer className="relative border-t border-slate-200 dark:border-cyan-500/15 bg-white py-16 transition-colors dark:bg-black/80">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <img src="/olan_logo.svg" alt={text.brand} className="h-12 w-12 rounded-xl object-cover" />
              <div>
                <div className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-xl font-bold text-transparent">{text.brand}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{tr("Фиксация нарушений ПДД")}</div>
              </div>
            </div>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-600 dark:text-slate-300">{text.footer.description}</p>
          </div>
          <div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">{text.footer.company}</h4>
            <div className="mt-4 flex flex-col gap-3">
              {footerLinks.map((link) => (
                <button key={link.label} type="button" onClick={link.action} className="text-left text-sm text-slate-600 transition hover:text-cyan-600 dark:text-slate-300 dark:hover:text-cyan-400">
                  {link.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">{text.footer.support}</h4>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <a href={CONTACT_INFO.phoneHref} className="block transition hover:text-cyan-600 dark:hover:text-cyan-400">{CONTACT_INFO.phone}</a>
              <a href={CONTACT_INFO.emailHref} className="block transition hover:text-cyan-600 dark:hover:text-cyan-400">{CONTACT_INFO.email}</a>
              <div>{text.footer.privacy}</div>
              <div>{text.footer.terms}</div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-slate-200 dark:border-cyan-500/15 pt-6 md:flex-row md:items-center">
          <div className="text-sm text-slate-600 dark:text-slate-400">{text.footer.copyright}</div>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-cyan-500/20 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-500/40 hover:text-cyan-600 dark:text-slate-200"
          >
            <ArrowUp className="h-4 w-4" />
            {text.actions.backToTop}
          </button>
        </div>
      </div>
    </footer>
  );
}
