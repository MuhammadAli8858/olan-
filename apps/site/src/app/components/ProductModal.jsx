// Карточка прибора во всплывающем окне. Вынесена в отдельный файл: окно
// с анимациями нужно только после клика, первый экран его не ждёт.
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { BaseModal } from './BaseModal.jsx';
import { useSite } from '../context/SiteContext.jsx';
import { localize } from '../data/siteData.js';
import { Icon } from '../lib/icons.jsx';
import { Img, isStudio } from '../lib/img.jsx';
import { oneLine, toList } from '../lib/fx.jsx';

export function ProductModal({ product, onClose, onContact }) {
  const { language, text } = useSite();
  const [active, setActive] = useState(0);
  useEffect(() => { setActive(0); }, [product]);
  const gallery = product ? (product.images || []).filter(Boolean) : [];
  const name = product ? oneLine(localize(product.name, language)) : '';

  return (
    <BaseModal isOpen={Boolean(product)} onClose={onClose} title={name} wide>
      {product ? (
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.95fr]">
          <div>
            <div className={`o-pp-visual${isStudio(gallery[active]) ? ' is-studio' : ''}`}>
              <Img src={gallery[active]} alt={name} eager sizes="(max-width: 1024px) 100vw, 55vw"
                fallback={<span className="o-pp-visual is-icon" style={{ position: 'absolute', inset: 0 }}><Icon name="Camera" /></span>} />
            </div>
            {gallery.length > 1 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '.5rem', marginTop: '.75rem' }}>
                {gallery.map((src, i) => (
                  <button key={`${src}-${i}`} type="button" onClick={() => setActive(i)} aria-label={`${name} ${i + 1}`}
                    className={`o-thumb${isStudio(src) ? ' is-studio' : ''}`}
                    style={{ width: '100%', height: '4.5rem', border: 0, cursor: 'pointer', outline: i === active ? '2px solid var(--o-brand)' : 'none', outlineOffset: 2 }}>
                    <Img src={src} alt="" sizes="140px" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div style={{ display: 'grid', gap: '1.5rem', alignContent: 'start' }}>
            <div>
              {product.brand ? <div style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--o-brand-text)' }}>{product.brand}</div> : null}
              {localize(product.price, language) ? (
                <>
                  <div style={{ marginTop: '.75rem', fontSize: '.85rem', color: 'var(--o-muted)' }}>{text.catalog.priceLabel}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 650, color: 'var(--o-ink)' }}>{localize(product.price, language)}</div>
                </>
              ) : null}
              <p style={{ marginTop: '1rem', lineHeight: 1.7, color: 'var(--o-text)' }}>{localize(product.description, language)}</p>
            </div>
            {toList(product.specs, language).length ? (
              <div>
                <h4 style={{ fontWeight: 650, color: 'var(--o-ink)', marginBottom: '.5rem' }}>{text.catalog.specsTitle}</h4>
                <div className="o-specs">
                  {toList(product.specs, language).map((spec) => (
                    <div key={spec} style={{ padding: '.7rem 0', borderBottom: '1px solid var(--o-line)', color: 'var(--o-text)', fontSize: '.93rem' }}>{spec}</div>
                  ))}
                </div>
              </div>
            ) : null}
            {toList(product.applications, language).length ? (
              <div>
                <h4 style={{ fontWeight: 650, color: 'var(--o-ink)', marginBottom: '.75rem' }}>{text.catalog.appsTitle}</h4>
                <div className="o-tags">{toList(product.applications, language).map((a) => <span key={a} className="o-tag">{a}</span>)}</div>
              </div>
            ) : null}
            <button type="button" className="o-btn o-btn--primary" style={{ width: '100%' }} onClick={() => { onClose(); setTimeout(onContact, 60); }}>
              {text.actions.buy} <ArrowRight className="o-arrow" />
            </button>
          </div>
        </div>
      ) : null}
    </BaseModal>
  );
}
