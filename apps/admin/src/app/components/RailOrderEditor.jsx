// ---------------------------------------------------------------------------
// Порядок карточек в ленте «Продукты OLAN» на главной.
//
// Карточку можно перетащить мышью или сдвинуть стрелками, а глазом —
// скрыть из ленты (в меню, подвале и на своей странице она останется).
// Хранится в контенте как HOME_RAIL: [{ key: 'device:w-space', hidden }].
// Новые приборы и продукты, которых ещё нет в списке, сами встают в конец.
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsDown, ChevronsUp, Eye, EyeOff, GripVertical, RotateCcw } from 'lucide-react';
import { resolveMediaUrl } from './ImageUpload.jsx';

const ruText = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v.ru || '' : v || '');
const oneLine = (s) => String(s || '').replace(/\s*\n\s*/g, ' ').trim();

export function railCards(content) {
  const devices = (content.PRODUCTS || []).map((p) => {
    const full = oneLine(ruText(p.name));
    return {
      key: `device:${p.id}`, kind: 'Комплекс фиксации', name: p.brand || full,
      sub: p.brand ? full.replace(p.brand, '').trim() : '', image: (p.images || [])[0] || '',
    };
  });
  const products = (content.PORTFOLIO || []).filter((p) => p.id !== 'catalog').map((p) => ({
    key: `product:${p.id}`, kind: 'Продукт группы', name: ruText(p.title), sub: ruText(p.subtitle), image: p.image || '',
  }));
  return [...devices, ...products];
}

export function orderedRail(content) {
  const cards = railCards(content);
  const byKey = new Map(cards.map((card) => [card.key, card]));
  const saved = Array.isArray(content.HOME_RAIL) ? content.HOME_RAIL : [];
  const out = [];
  const seen = new Set();
  saved.forEach((entry) => {
    const key = entry && entry.key;
    if (!key || seen.has(key) || !byKey.has(key)) return;
    seen.add(key);
    out.push({ ...byKey.get(key), hidden: Boolean(entry.hidden) });
  });
  cards.forEach((card) => { if (!seen.has(card.key)) out.push({ ...card, hidden: false }); });
  return out;
}

export function RailOrderEditor({ content, patch }) {
  const list = orderedRail(content);
  const [dragKey, setDragKey] = useState(null);
  const [overKey, setOverKey] = useState(null);
  const commit = (next) => patch((c) => { c.HOME_RAIL = next.map((x) => ({ key: x.key, hidden: Boolean(x.hidden) })); });
  const moveTo = (from, to) => {
    if (from === to || from < 0 || to < 0 || to >= list.length) return;
    const next = list.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commit(next);
  };
  const toggle = (i) => commit(list.map((x, j) => (j === i ? { ...x, hidden: !x.hidden } : x)));
  const reset = () => patch((c) => { c.HOME_RAIL = railCards(c).map((x) => ({ key: x.key, hidden: false })); });
  const shown = list.filter((x) => !x.hidden).length;
  const btn = 'rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent';

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Порядок продуктов на главной</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            В таком порядке карточки идут в ленте «Продукты OLAN» на главной странице. Перетащите карточку мышью
            или двигайте стрелками, затем нажмите «Сохранить». Скрытая карточка не показывается в ленте, но остаётся
            в меню, в подвале и на своей странице. Новые приборы и продукты сами добавляются в конец списка.
          </p>
        </div>
        <button type="button" onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5">
          <RotateCcw className="h-4 w-4" /> Исходный порядок
        </button>
      </div>
      <div className="mb-3 text-xs text-slate-500">Показано в ленте: {shown} из {list.length}</div>
      <ol className="space-y-2">
        {list.map((item, i) => (
          <li key={item.key} draggable
            onDragStart={(e) => {
              setDragKey(item.key);
              e.dataTransfer.effectAllowed = 'move';
              try { e.dataTransfer.setData('text/plain', item.key); } catch { /* старые браузеры */ }
            }}
            onDragOver={(e) => { if (!dragKey) return; e.preventDefault(); if (overKey !== item.key) setOverKey(item.key); }}
            onDragLeave={() => { if (overKey === item.key) setOverKey(null); }}
            onDrop={(e) => {
              e.preventDefault();
              const from = list.findIndex((x) => x.key === dragKey);
              if (from >= 0) moveTo(from, i);
              setDragKey(null);
              setOverKey(null);
            }}
            onDragEnd={() => { setDragKey(null); setOverKey(null); }}
            className={`flex items-center gap-3 rounded-2xl border px-3 py-2 transition ${
              overKey === item.key && dragKey !== item.key ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/10 bg-slate-900/60'
            } ${dragKey === item.key ? 'opacity-40' : ''}`}>
            <GripVertical className="h-5 w-5 shrink-0 cursor-grab text-slate-500" aria-hidden="true" />
            <span className="w-6 shrink-0 text-right text-sm tabular-nums text-slate-500">{i + 1}</span>
            <span className={`flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/90 ${item.hidden ? 'opacity-40' : ''}`}>
              {item.image
                ? <img src={resolveMediaUrl(item.image)} alt="" className="h-full w-full object-contain" loading="lazy"
                    onError={(e) => { e.currentTarget.replaceWith(Object.assign(document.createElement('span'), { className: 'px-1 text-center text-[10px] leading-tight text-slate-500', textContent: 'нет фото' })); }} />
                : <span className="px-1 text-center text-[10px] leading-tight text-slate-500">нет фото</span>}
            </span>
            <span className={`min-w-0 flex-1 ${item.hidden ? 'opacity-50' : ''}`}>
              <span className="block truncate font-medium text-white">{item.name}</span>
              <span className="block truncate text-xs text-slate-400">{item.kind}{item.sub ? ` · ${item.sub}` : ''}</span>
            </span>
            {item.hidden ? <span className="hidden rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300 sm:inline">скрыта</span> : null}
            <span className="flex shrink-0 items-center gap-0.5">
              <button type="button" className={btn} title="В начало" aria-label="В начало" disabled={i === 0} onClick={() => moveTo(i, 0)}><ChevronsUp className="h-4 w-4" /></button>
              <button type="button" className={btn} title="Выше" aria-label="Выше" disabled={i === 0} onClick={() => moveTo(i, i - 1)}><ArrowUp className="h-4 w-4" /></button>
              <button type="button" className={btn} title="Ниже" aria-label="Ниже" disabled={i === list.length - 1} onClick={() => moveTo(i, i + 1)}><ArrowDown className="h-4 w-4" /></button>
              <button type="button" className={btn} title="В конец" aria-label="В конец" disabled={i === list.length - 1} onClick={() => moveTo(i, list.length - 1)}><ChevronsDown className="h-4 w-4" /></button>
              <button type="button" className={btn} title={item.hidden ? 'Показать в ленте' : 'Скрыть из ленты'}
                aria-label={item.hidden ? 'Показать в ленте' : 'Скрыть из ленты'} onClick={() => toggle(i)}>
                {item.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
