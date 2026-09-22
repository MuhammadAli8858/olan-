// ---------------------------------------------------------------------------
// Универсальный редактор контента.
//
// Данные из презентации устроены по-разному: где-то массив карточек, где-то
// объект с вложенными списками. Писать под каждый блок отдельную форму —
// значит каждый раз лезть в код, когда на сайте появляется новое поле.
//
// Поэтому редактор разбирает структуру сам:
//   • { ru: '…', en: '…' } — многоязычный текст, показывается одно поле
//     на выбранном языке;
//   • строка, число, галочка — обычное поле;
//   • массив — список с кнопками «добавить» и «удалить»;
//   • вложенный объект — раскрывающийся блок.
//
// Служебные поля (id, icon, number) редактируются отдельной строкой сверху,
// чтобы не мешались среди текстов.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Languages, GripVertical } from 'lucide-react';
import { ImageField, ImageListEditor } from './ImageUpload.jsx';

// Коды языков сайта — по ним узнаём многоязычное поле.
// Коды языков, по которым поле узнаётся как многоязычное.
// Раньше здесь не было арабского, а у каждого текстового поля есть ключ ar:
// редактор переставал узнавать такие поля и рисовал их вложенными объектами
// с шестью сырыми строками — «▶ Заголовок», «▶ Примечание» и так далее.
// kk и be оставлены для старого контента, где они ещё встречаются.
const LANG_CODES = new Set(['ru', 'en', 'uz', 'zh', 'ar', 'uk', 'kk', 'be']);

// Поля, которые не являются текстом для перевода.
const TECHNICAL_FIELDS = new Set(['id', 'icon', 'number', 'n', 'value', 'link']);

// Поля, которые хранят путь к картинке. Для них показываем загрузку файла
// с компьютера вместо обычного текстового поля.
const IMAGE_FIELDS = new Set(['image', 'images', 'gallery', 'photo', 'photos', 'logo', 'cover']);

// Понятные подписи вместо машинных имён.
const FIELD_LABELS = {
  tagline: 'Подзаголовок компании',
  badges: 'Метки под заголовком',
  intro: 'Вступление',
  what: 'Чем занимается',
  how: 'Как сопровождает проекты',
  mission: 'К чему стремимся',
  focus: 'Специализация',
  pillars: 'Опоры группы',
  partner: 'Блок «Один партнёр»',
  proof: 'Локальный контур',
  points: 'Пункты',
  items: 'Пункты',
  steps: 'Этапы',
  note: 'Примечание',
  operation: 'Эксплуатация и SLA',
  slaText: 'Текст SLA',
  slaPoints: 'Пункты SLA',
  roles: 'Состав команды',
  capabilities: 'Профессиональные компетенции',
  strengths: 'Как работает команда',
  title: 'Заголовок',
  subtitle: 'Подзаголовок',
  text: 'Текст',
  description: 'Описание',
  label: 'Подпись',
  features: 'Что входит',
  tags: 'Метки',
  tagsTitle: 'Заголовок меток',
  meta: 'Дополнительно',
  highlight: 'Выделенная строка',
  type: 'Тип проекта',
  role: 'Роль OLAN',
  result: 'Что получает партнёр',
  value: 'Значение',
  link: 'Куда ведёт',
  image: 'Картинка',
  images: 'Картинки',
  gallery: 'Галерея фотографий',
  photo: 'Фотография',
  imageCaption: 'Подпись к картинке',
  problem: 'Проблема',
  solution: 'Решение',
  linkLabel: 'Надпись на кнопке',
  points: 'Пункты',
  role: 'Роль OLAN',
  roleTitle: 'Заголовок роли',
  roleNote: 'Примечание к роли',
  details: 'Подробное описание',
};

function labelFor(key) {
  return FIELD_LABELS[key] || key;
}

// Многоязычное ли это значение.
function isLocalized(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  return keys.every((k) => LANG_CODES.has(k));
}

const inputCls = 'w-full rounded-xl border border-cyan-500/20 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400';
const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400';

// Короткое название записи для заголовка свёрнутого блока.
function entryLabel(item, index, lang) {
  const text = (field) => {
    if (isLocalized(field)) return String(field[lang] || field.ru || '').replace(/\s+/g, ' ').trim();
    if (typeof field === 'string') return field.replace(/\s+/g, ' ').trim();
    return '';
  };

  if (item && typeof item === 'object' && !isLocalized(item)) {
    // Сначала поля, которые обычно и есть название записи.
    for (const key of ['title', 'name', 'type', 'label', 'question', 'role', 'term', 'problem']) {
      const found = text(item[key]);
      if (found) return item.number ? `${item.number} · ${found}` : found;
    }
    // Иначе — первый непустой текст записи, чтобы не было безликих «Запись 4».
    for (const [key, field] of Object.entries(item)) {
      if (TECHNICAL_FIELDS.has(key)) continue;
      const found = text(field);
      if (found) return found.length > 70 ? `${found.slice(0, 70)}…` : found;
    }
    if (item.id) return String(item.id);
  }
  const plain = text(item);
  return plain || `Запись ${index + 1}`;
}

// Заготовка новой записи: копируем структуру соседа и очищаем тексты.
function blankLike(sample) {
  if (isLocalized(sample)) return { ru: '' };
  if (Array.isArray(sample)) return [];
  if (sample && typeof sample === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(sample)) {
      if (key === 'id') { result.id = `new-${Math.random().toString(36).slice(2, 7)}`; continue; }
      result[key] = blankLike(value);
    }
    return result;
  }
  if (typeof sample === 'boolean') return false;
  if (typeof sample === 'number') return 0;
  return '';
}

// ------------------------------ поле значения ------------------------------

function ValueField({ value, onChange, lang, onTranslate, translating, fieldKey }) {
  // Многоязычный текст
  if (isLocalized(value)) {
    const current = value[lang] ?? '';
    const long = String(value.ru || '').length > 90;
    return (
      <div className="flex items-start gap-2">
        {long ? (
          <textarea
            rows={Math.min(8, Math.ceil(String(current).length / 70) + 2)}
            value={current}
            onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
            className={inputCls}
          />
        ) : (
          <input value={current} onChange={(e) => onChange({ ...value, [lang]: e.target.value })} className={inputCls} />
        )}
        {onTranslate && (
          <button
            type="button"
            onClick={() => onTranslate(value, onChange)}
            disabled={translating}
            title="Перевести это поле на остальные языки"
            className="mt-0.5 shrink-0 rounded-xl border border-cyan-500/20 p-2 text-slate-400 transition hover:text-cyan-300 disabled:opacity-40"
          >
            <Languages className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <label className="inline-flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
        {value ? 'да' : 'нет'}
      </label>
    );
  }

  if (typeof value === 'number') {
    return <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className={inputCls} />;
  }

  return <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={inputCls} placeholder={fieldKey} />;
}

// ------------------------------- список записей -------------------------------

function ListEditor({ items, onChange, lang, onTranslate, translating, depth, adminKey, frame }) {
  const list = Array.isArray(items) ? items : [];
  const [open, setOpen] = useState({});

  const setAt = (index, next) => onChange(list.map((item, i) => (i === index ? next : item)));
  // Целую запись верхнего уровня (продукт, направление, этап) удаляем
  // только после подтверждения — как в «Решениях». Строку внутри списка
  // удаляем сразу: её проще вписать заново, чем каждый раз подтверждать.
  const removeAt = (index) => {
    if (depth === 0) {
      const name = entryLabel(list[index], index, lang);
      if (typeof window !== 'undefined' && !window.confirm(`Удалить «${name}»?`)) return;
    }
    onChange(list.filter((_, i) => i !== index));
  };
  const add = () => onChange([...list, blankLike(list[0] ?? { ru: '' })]);
  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {list.map((item, index) => {
        const simple = isLocalized(item) || typeof item !== 'object';
        // Верхний уровень раздела свёрнут: сначала видно список, а подробности
        // открываются по клику — как в «Решениях». Вложенные списки внутри
        // открытой записи показываем сразу, их обычно немного.
        const expanded = open[index] !== undefined ? open[index] : depth > 0;

        if (simple) {
          return (
            <div key={index} className="flex items-start gap-2">
              <div className="flex shrink-0 flex-col pt-1.5">
                <button type="button" onClick={() => move(index, -1)} className="text-[10px] text-slate-600 hover:text-cyan-400">▲</button>
                <button type="button" onClick={() => move(index, 1)} className="text-[10px] text-slate-600 hover:text-cyan-400">▼</button>
              </div>
              <div className="min-w-0 flex-1">
                <ValueField value={item} onChange={(v) => setAt(index, v)} lang={lang} onTranslate={onTranslate} translating={translating} />
              </div>
              <button type="button" onClick={() => removeAt(index)}
                className="mt-0.5 shrink-0 rounded-xl border border-slate-700 p-2 text-slate-500 transition hover:border-red-500/40 hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        }

        return (
          <div key={index} className="rounded-2xl border border-slate-800 bg-black/30">
            <div className="flex items-center gap-2 px-3 py-2">
              <GripVertical className="h-4 w-4 shrink-0 text-slate-700" />
              <button type="button" onClick={() => setOpen((p) => ({ ...p, [index]: !expanded }))}
                className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-slate-200">
                {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <span className="truncate">{entryLabel(item, index, lang)}</span>
              </button>
              <button type="button" onClick={() => move(index, -1)} className="text-xs text-slate-600 hover:text-cyan-400">▲</button>
              <button type="button" onClick={() => move(index, 1)} className="text-xs text-slate-600 hover:text-cyan-400">▼</button>
              <button type="button" onClick={() => removeAt(index)}
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {expanded && (
              <div className="border-t border-slate-800 p-3">
                <ObjectEditor value={item} onChange={(v) => setAt(index, v)} lang={lang}
                  onTranslate={onTranslate} translating={translating} depth={depth + 1} adminKey={adminKey} frame={frame} />
              </div>
            )}
          </div>
        );
      })}

      <button type="button" onClick={add}
        className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/20 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white">
        <Plus className="h-3.5 w-3.5" /> Добавить
      </button>
    </div>
  );
}

// ------------------------------ объект с полями ------------------------------

function ObjectEditor({ value, onChange, lang, onTranslate, translating, depth = 0, adminKey, frame }) {
  const entries = Object.entries(value || {});
  const technical = entries.filter(([key]) => TECHNICAL_FIELDS.has(key) && !isLocalized(value[key]));
  const content = entries.filter(([key]) => !(TECHNICAL_FIELDS.has(key) && !isLocalized(value[key])));

  const set = (key, next) => onChange({ ...value, [key]: next });

  return (
    <div className="space-y-4">
      {technical.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {technical.map(([key, field]) => (
            <div key={key} className="w-40">
              <label className={labelCls}>{labelFor(key)}</label>
              <ValueField value={field} onChange={(v) => set(key, v)} lang={lang} fieldKey={key} />
            </div>
          ))}
        </div>
      )}

      {content.map(([key, field]) => {
        // Картинки: загрузка файла с компьютера, предпросмотр и кнопка «убрать».
        if (IMAGE_FIELDS.has(key)) {
          return (
            <div key={key}>
              <label className={labelCls}>{labelFor(key)}</label>
              {Array.isArray(field)
                ? <ImageListEditor frame={frame} adminKey={adminKey} items={field} onChange={(v) => set(key, v)} />
                : <ImageField frame={frame} adminKey={adminKey} value={field} onChange={(v) => set(key, v)} />}
            </div>
          );
        }

        if (Array.isArray(field)) {
          return (
            <div key={key}>
              <label className={labelCls}>{labelFor(key)} <span className="text-slate-600">({field.length})</span></label>
              <ListEditor items={field} onChange={(v) => set(key, v)} lang={lang}
                onTranslate={onTranslate} translating={translating} depth={depth} adminKey={adminKey} frame={frame} />
            </div>
          );
        }

        if (field && typeof field === 'object' && !isLocalized(field)) {
          return (
            <details key={key} open={depth < 1} className="rounded-2xl border border-slate-800 bg-black/20 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-cyan-300">{labelFor(key)}</summary>
              <div className="mt-3">
                <ObjectEditor value={field} onChange={(v) => set(key, v)} lang={lang}
                  onTranslate={onTranslate} translating={translating} depth={depth + 1} adminKey={adminKey} frame={frame} />
              </div>
            </details>
          );
        }

        return (
          <div key={key}>
            <label className={labelCls}>{labelFor(key)}</label>
            <ValueField value={field} onChange={(v) => set(key, v)} lang={lang}
              onTranslate={onTranslate} translating={translating} fieldKey={key} />
          </div>
        );
      })}
    </div>
  );
}

// --------------------------------- обёртка ---------------------------------

export default function GenericEditor({ title, hint, value, onChange, lang, onTranslate, translating, adminKey, frame }) {
  if (value === undefined || value === null) {
    return <div className="text-sm text-slate-500">Этот раздел пока пуст.</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {hint && <p className="mt-1 text-sm leading-6 text-slate-500">{hint}</p>}
      </div>

      <div className="rounded-3xl border border-cyan-500/15 bg-slate-900/40 p-4">
        {Array.isArray(value)
          ? <ListEditor items={value} onChange={onChange} lang={lang} onTranslate={onTranslate} translating={translating} depth={0} adminKey={adminKey} frame={frame} />
          : <ObjectEditor value={value} onChange={onChange} lang={lang} onTranslate={onTranslate} translating={translating} adminKey={adminKey} frame={frame} />}
      </div>
    </div>
  );
}

export { isLocalized };
