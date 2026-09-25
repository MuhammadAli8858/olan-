// ---------------------------------------------------------------------------
// Подвал: тёмный, с колонками продуктов, как у hikvision.com.
// Все ссылки собираются из контента, контакты — из CONTACT_INFO.
// ---------------------------------------------------------------------------
import { ArrowUp, Clock, Mail, MapPin, Phone } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';
import { CONTACT_INFO, localize, PORTFOLIO, PRODUCTS } from '../data/siteData.js';
import { tr } from '../lib/i18n.js';
import { oneLine } from '../lib/fx.jsx';

export function Footer({ onNavigate, onSection, onOpenDevice, onHome }) {
  const { text, language, setLanguage, languageOptions } = useSite();
  const c = CONTACT_INFO || {};
  const footer = (text && text.footer) || {};

  const devices = (PRODUCTS || []).map((p) => ({ key: p.id, label: p.brand || oneLine(localize(p.name, language)), onClick: () => onOpenDevice(p.id) }));
  const platforms = (PORTFOLIO || []).filter((p) => p.id !== 'catalog')
    .map((p) => ({ key: p.id, label: localize(p.title, language), onClick: () => onNavigate(`product-${p.id}`) }));
  const company = [
    { key: 'about', label: tr('О компании'), onClick: () => onNavigate('about') },
    { key: 'directions', label: tr('Все услуги'), onClick: () => onNavigate('directions') },
    { key: 'cases', label: tr('Задачи заказчика'), onClick: () => onNavigate('cases') },
    { key: 'projects', label: tr('Проекты'), onClick: () => onNavigate('projects') },
    { key: 'team', label: tr('Команда'), onClick: () => onNavigate('team') },
    { key: 'engagement', label: tr('Модели работы'), onClick: () => onNavigate('engagement') },
    { key: 'faq', label: tr('Частые вопросы'), onClick: () => onNavigate('faq') },
    { key: 'contact', label: tr('Контакты'), onClick: () => onSection('contact') },
  ];

  const column = (title, links) => (
    <div>
      <h4>{title}</h4>
      <ul>{links.map((l) => <li key={l.key}><button type="button" onClick={l.onClick}>{l.label}</button></li>)}</ul>
    </div>
  );

  return (
    <footer className="o-footer">
      <div className="o-wrap">
        <div className="o-footer__top">
          <div>
            <button type="button" className="o-logo" onClick={onHome}>
              <img src="/logo-mark.webp" alt="" width="38" height="38" loading="lazy" />
              <span>{text.brand}</span>
            </button>
            {footer.description ? <p className="o-footer__about">{footer.description}</p> : null}
            <div className="o-footer__contacts">
              {c.phone ? <a href={c.phoneHref}><Phone />{c.phone}</a> : null}
              {c.email ? <a href={c.emailHref}><Mail />{c.email}</a> : null}
              {c.address ? <span><MapPin />{localize(c.address, language)}</span> : null}
              {c.hours ? <span><Clock />{localize(c.hours, language)}</span> : null}
            </div>
          </div>
          <div className="o-footer__cols">
            {column(tr('Комплексы фиксации'), devices)}
            {column(tr('Продукты группы'), [...platforms, { key: 'catalog', label: tr('Каталог оборудования'), onClick: () => onNavigate('catalog') }])}
            {column(footer.company || tr('О компании'), company)}
          </div>
        </div>
        <div className="o-footer__bottom">
          <span>{footer.copyright}</span>
          <div>
            <select aria-label={text.actions.language} value={language} onChange={(e) => setLanguage(e.target.value)}>
              {languageOptions.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
            </select>
            <button type="button" className="o-icon-btn" aria-label={tr('Наверх')}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><ArrowUp /></button>
          </div>
        </div>
      </div>
    </footer>
  );
}
