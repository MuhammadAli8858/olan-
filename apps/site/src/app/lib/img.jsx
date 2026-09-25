// ---------------------------------------------------------------------------
// Картинки. Для каждого фото из /products заранее сделаны WebP нескольких
// ширин (apps/site/public/img) — браузер сам берёт нужную по ширине экрана.
// Было: PNG по 1–3 МБ. Стало: 30–150 КБ на экран.
// Пока фото грузится, под ним видно размытое превью размером в сотню байт.
// Картинки, загруженные через админку позже, показываются как есть.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import MANIFEST from '../data/images.json';

export function imgInfo(src) {
  return (src && MANIFEST[src]) || null;
}

export function isStudio(src) {
  const info = imgInfo(src);
  return Boolean(info && info.s);
}

export function srcSetOf(info, portrait = false) {
  const list = portrait ? info.p : info.v;
  const mid = portrait ? '-p-' : '-';
  return list.map((w) => `/img/${info.b}${mid}${w}.webp ${w}w`).join(', ');
}

function lqipStyle(info, style) {
  if (!info || !info.q) return style;
  return { backgroundImage: `url(${info.q})`, backgroundSize: 'cover', backgroundPosition: 'center', ...style };
}

export function Img({ src, alt = '', sizes = '100vw', eager = false, className, style, fallback = null, lqip = true, ...rest }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [src]);
  if (!src || broken) return fallback;
  const info = imgInfo(src);
  const common = {
    alt,
    className,
    decoding: 'async',
    loading: eager ? 'eager' : 'lazy',
    onError: () => setBroken(true),
    ...(eager ? { fetchpriority: 'high' } : null),
    ...rest,
  };
  if (!info) return <img src={src} style={style} {...common} />;
  const mid = info.v[Math.min(1, info.v.length - 1)];
  return (
    <img src={`/img/${info.b}-${mid}.webp`} srcSet={srcSetOf(info)} sizes={sizes} width={info.w} height={info.h}
      style={lqip ? lqipStyle(info, style) : style} {...common} />
  );
}

// Кадр баннера: на вертикальном экране телефона — отдельный вертикальный кроп,
// иначе горизонтальный кадр пришлось бы растягивать почти вдвое.
export const PORTRAIT_QUERY = '(max-aspect-ratio: 4/5)';

export function HeroPicture({ src, alt = '', eager = false, imgRef, onLoad }) {
  const info = imgInfo(src);
  const common = { ref: imgRef, alt, decoding: 'async', loading: eager ? 'eager' : 'lazy', onLoad, ...(eager ? { fetchpriority: 'high' } : null) };
  if (!info) return <img src={src} {...common} />;
  return (
    <picture>
      {info.p ? <source media={PORTRAIT_QUERY} srcSet={srcSetOf(info, true)} sizes="100vw" /> : null}
      <img src={`/img/${info.b}-${info.v[info.v.length - 1]}.webp`} srcSet={srcSetOf(info)} sizes="100vw"
        width={info.w} height={info.h} style={lqipStyle(info)} {...common} />
    </picture>
  );
}
