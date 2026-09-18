import { useEffect, useMemo, useRef, useState } from 'react';
import { Save, LogOut, Plus, Trash2, RotateCcw, Box, Lightbulb, Type, Languages, Image as ImageIcon, Award, ListChecks, HelpCircle, Building2, Phone, RefreshCw, FileCode, Users, Activity } from 'lucide-react';
import StaffSection from './components/StaffSection.jsx';
import { Menu, X, Undo2, ArrowLeft, Globe, GitBranch, Download, FileDown } from 'lucide-react';
import { describeChange } from './lib/changes.js';
import { ImageField, ImageListEditor } from './components/ImageUpload.jsx';
import GenericEditor from './components/GenericEditor.jsx';
import { Building2 as BuildingIcon, Layers, Package, Route, Workflow as WorkflowIcon, UsersRound } from 'lucide-react';
import { getJson, postJson, API_BASE_URL } from './lib/api.js';

const KEY_STORE = 'olan-admin-key';

// Русский, английский и узбекский сервер заполняет сам при каждом сохранении.
const AUTO_LANGS = ['ru', 'en', 'uz', 'uk'];
// Китайский и арабский — только вручную или по отдельной команде.
const MANUAL_LANGS = ['zh', 'ar'];
const DEFAULT_LANGS = [
  { code: 'ru', label: 'Русский' },
  { code: 'uz', label: 'Oʻzbekcha' },
  { code: 'en', label: 'English' },
  { code: 'uk', label: 'Українська' },
  { code: 'zh', label: '中文' },
  { code: 'kk', label: 'Қазақша' },
  { code: 'be', label: 'Беларуская' },
];
const SOLUTION_ICONS = ['Gauge', 'CircleDot', 'SquareParking', 'TrainFront', 'BusFront', 'BadgeCheck', 'ShieldCheck', 'Factory', 'Truck'];
const BENEFIT_ICONS = ['Radar', 'Cpu', 'Shield', 'Headphones', 'BadgeCheck'];
const PROCESS_ICONS = ['Search', 'MessageSquare', 'ShoppingBag', 'Truck'];
const ABOUT_ICONS = ['ShieldCheck', 'Award', 'Factory', 'BadgeCheck'];

const inputCls = 'w-full rounded-xl border border-cyan-500/20 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500';
const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400';
const cardCls = 'rounded-2xl border border-cyan-500/15 bg-slate-950 p-4';

function genId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}
function isLong(value) {
  return typeof value === 'string' && (value.length > 60 || value.includes('\n'));
}
function setByPath(obj, pathArr, value) {
  let node = obj;
  for (let i = 0; i < pathArr.length - 1; i += 1) node = node[pathArr[i]];
  node[pathArr[pathArr.length - 1]] = value;
}

function ListEditor({ items, onChange, placeholder }) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div className="space-y-2">
      {list.map((value, index) => (
        <div key={index} className="flex gap-2">
          <input
            className={inputCls}
            value={value}
            placeholder={placeholder}
            onChange={(e) => { const next = [...list]; next[index] = e.target.value; onChange(next); }}
          />
          <button type="button" onClick={() => onChange(list.filter((_, i) => i !== index))} className="shrink-0 rounded-xl border border-red-500/30 px-3 text-red-300 transition hover:bg-red-500/10">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...list, ''])} className="inline-flex items-center gap-1 rounded-xl border border-cyan-500/30 px-3 py-1.5 text-xs text-cyan-300 transition hover:bg-cyan-500/10">
        <Plus className="h-3.5 w-3.5" /> Добавить
      </button>
    </div>
  );
}

function TranslateBtn({ onClick, busy, lang }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-50">
      <Languages className="h-4 w-4" /> {busy ? 'Перевод…' : `Перевести с ${lang.toUpperCase()} на все языки`}
    </button>
  );
}

function DeleteBtn({ onClick, label }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 rounded-xl border border-red-500/30 px-3 py-1.5 text-sm text-red-300 transition hover:bg-red-500/10">
      <Trash2 className="h-4 w-4" /> {label}
    </button>
  );
}

// ---------------- Приборы ----------------
function ProductsEditor({ content, patch, lang, onTranslate, busyId, adminKey }) {
  const products = content.PRODUCTS || [];
  const categories = content.UI_TEXT?.[lang]?.catalog?.categories || content.UI_TEXT?.ru?.catalog?.categories || {};
  const catKeys = Object.keys(categories);
  const add = () => patch((c) => {
    c.PRODUCTS = c.PRODUCTS || [];
    c.PRODUCTS.unshift({ id: genId('prod'), brand: 'Новый прибор', category: [], inStock: true, price: { ru: 'По запросу' }, badge: { ru: '' }, name: { ru: 'Новый прибор' }, short: { ru: '' }, description: { ru: '' }, specs: { ru: [] }, applications: { ru: [] }, images: [] });
  });
  return (
    <div className="space-y-4">
      <button type="button" onClick={add} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Добавить прибор</button>
      {products.length === 0 && <div className="text-sm text-slate-500">Приборов пока нет.</div>}
      {products.map((p, i) => (
        <details key={p.id || i} className={cardCls}>
          <summary className="flex cursor-pointer items-center justify-between">
            <span className="font-semibold text-white">{p.brand || '—'} <span className="text-slate-500">· {p.name?.[lang] || p.name?.ru || ''}</span></span>
            <span className="text-xs text-slate-500">{(p.category || []).join(', ')}</span>
          </summary>
          <div className="mt-3"><TranslateBtn lang={lang} busy={busyId === (p.id || i)} onClick={() => onTranslate('PRODUCTS', i, ['name', 'short', 'description', 'price', 'badge'], ['specs', 'applications'], p.id || i)} /></div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><label className={labelCls}>Бренд / модель (не переводится)</label><input className={inputCls} value={p.brand || ''} onChange={(e) => patch((c) => { c.PRODUCTS[i].brand = e.target.value; })} /></div>
            <div><label className={labelCls}>ID (латиницей, уникальный)</label><input className={inputCls} value={p.id || ''} onChange={(e) => patch((c) => { c.PRODUCTS[i].id = e.target.value; })} /></div>
            <div><label className={labelCls}>Цена ({lang})</label><input className={inputCls} value={p.price?.[lang] || ''} onChange={(e) => patch((c) => { c.PRODUCTS[i].price = { ...(c.PRODUCTS[i].price || {}), [lang]: e.target.value }; })} /></div>
            <div><label className={labelCls}>Бейдж ({lang})</label><input className={inputCls} value={p.badge?.[lang] || ''} onChange={(e) => patch((c) => { c.PRODUCTS[i].badge = { ...(c.PRODUCTS[i].badge || {}), [lang]: e.target.value }; })} /></div>
            <div className="md:col-span-2"><label className={labelCls}>Название ({lang}) — Enter для переноса</label><textarea rows={2} className={inputCls} value={p.name?.[lang] || ''} onChange={(e) => patch((c) => { c.PRODUCTS[i].name = { ...(c.PRODUCTS[i].name || {}), [lang]: e.target.value }; })} /></div>
            <div className="md:col-span-2"><label className={labelCls}>Краткое описание ({lang})</label><textarea rows={2} className={inputCls} value={p.short?.[lang] || ''} onChange={(e) => patch((c) => { c.PRODUCTS[i].short = { ...(c.PRODUCTS[i].short || {}), [lang]: e.target.value }; })} /></div>
            <div className="md:col-span-2"><label className={labelCls}>Полное описание ({lang})</label><textarea rows={3} className={inputCls} value={p.description?.[lang] || ''} onChange={(e) => patch((c) => { c.PRODUCTS[i].description = { ...(c.PRODUCTS[i].description || {}), [lang]: e.target.value }; })} /></div>
            <div><label className={labelCls}>Характеристики ({lang})</label><ListEditor items={p.specs?.[lang]} placeholder="Гарантия: 12 мес." onChange={(arr) => patch((c) => { c.PRODUCTS[i].specs = { ...(c.PRODUCTS[i].specs || {}), [lang]: arr }; })} /></div>
            <div><label className={labelCls}>Где применяется ({lang})</label><ListEditor items={p.applications?.[lang]} placeholder="Магистрали" onChange={(arr) => patch((c) => { c.PRODUCTS[i].applications = { ...(c.PRODUCTS[i].applications || {}), [lang]: arr }; })} /></div>
            <div className="md:col-span-2">
              <label className={labelCls}>Категории</label>
              <div className="flex flex-wrap gap-2">
                {catKeys.map((k) => {
                  const active = (p.category || []).includes(k);
                  return <button key={k} type="button" onClick={() => patch((c) => { const s = new Set(c.PRODUCTS[i].category || []); if (s.has(k)) s.delete(k); else s.add(k); c.PRODUCTS[i].category = [...s]; })} className={`rounded-full px-3 py-1 text-xs transition ${active ? 'bg-cyan-500 text-white' : 'border border-cyan-500/30 text-slate-300'}`}>{String(categories[k]).replace(/\n/g, ' ')}</button>;
                })}
              </div>
            </div>
            <div className="md:col-span-2"><label className={labelCls}>Картинки — загрузите с компьютера или впишите путь</label><ImageListEditor adminKey={adminKey} items={p.images} placeholder="/products/my-device.png" onChange={(arr) => patch((c) => { c.PRODUCTS[i].images = arr; })} /></div>
            <div className="flex items-center gap-4 md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={!!p.inStock} onChange={(e) => patch((c) => { c.PRODUCTS[i].inStock = e.target.checked; })} /> В наличии</label>
              <DeleteBtn label="Удалить прибор" onClick={() => { if (confirm('Удалить этот прибор?')) patch((c) => { c.PRODUCTS.splice(i, 1); }); }} />
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

// ---------------- Решения ----------------
function SolutionsEditor({ content, patch, lang, onTranslate, busyId }) {
  const items = content.VIOLATION_SOLUTIONS || [];
  const categories = content.UI_TEXT?.[lang]?.catalog?.categories || content.UI_TEXT?.ru?.catalog?.categories || {};
  const catKeys = Object.keys(categories);
  const add = () => patch((c) => { c.VIOLATION_SOLUTIONS = c.VIOLATION_SOLUTIONS || []; c.VIOLATION_SOLUTIONS.unshift({ id: genId('sol'), category: catKeys[0] || 'speed', icon: 'Gauge', title: { ru: 'Новая задача' }, problem: { ru: '' }, solution: { ru: '' } }); });
  return (
    <div className="space-y-4">
      <button type="button" onClick={add} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Добавить решение</button>
      {items.length === 0 && <div className="text-sm text-slate-500">Решений пока нет.</div>}
      {items.map((s, i) => (
        <details key={s.id || i} className={cardCls}>
          <summary className="cursor-pointer font-semibold text-white">{s.title?.[lang] || s.title?.ru || '—'}</summary>
          <div className="mt-3"><TranslateBtn lang={lang} busy={busyId === (s.id || i)} onClick={() => onTranslate('VIOLATION_SOLUTIONS', i, ['title', 'problem', 'solution'], [], s.id || i)} /></div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><label className={labelCls}>ID (латиницей)</label><input className={inputCls} value={s.id || ''} onChange={(e) => patch((c) => { c.VIOLATION_SOLUTIONS[i].id = e.target.value; })} /></div>
            <div><label className={labelCls}>Иконка</label><select className={inputCls} value={s.icon || 'Gauge'} onChange={(e) => patch((c) => { c.VIOLATION_SOLUTIONS[i].icon = e.target.value; })}>{SOLUTION_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}</select></div>
            <div className="md:col-span-2"><label className={labelCls}>Категория (для кнопки «Подобрать комплекс»)</label><select className={inputCls} value={s.category || ''} onChange={(e) => patch((c) => { c.VIOLATION_SOLUTIONS[i].category = e.target.value; })}>{catKeys.map((k) => <option key={k} value={k}>{String(categories[k]).replace(/\n/g, ' ')}</option>)}</select></div>
            <div className="md:col-span-2"><label className={labelCls}>Заголовок ({lang})</label><input className={inputCls} value={s.title?.[lang] || ''} onChange={(e) => patch((c) => { c.VIOLATION_SOLUTIONS[i].title = { ...(c.VIOLATION_SOLUTIONS[i].title || {}), [lang]: e.target.value }; })} /></div>
            <div className="md:col-span-2"><label className={labelCls}>Задача ({lang})</label><textarea rows={2} className={inputCls} value={s.problem?.[lang] || ''} onChange={(e) => patch((c) => { c.VIOLATION_SOLUTIONS[i].problem = { ...(c.VIOLATION_SOLUTIONS[i].problem || {}), [lang]: e.target.value }; })} /></div>
            <div className="md:col-span-2"><label className={labelCls}>Решение ({lang})</label><textarea rows={2} className={inputCls} value={s.solution?.[lang] || ''} onChange={(e) => patch((c) => { c.VIOLATION_SOLUTIONS[i].solution = { ...(c.VIOLATION_SOLUTIONS[i].solution || {}), [lang]: e.target.value }; })} /></div>
            <div className="md:col-span-2"><DeleteBtn label="Удалить решение" onClick={() => { if (confirm('Удалить это решение?')) patch((c) => { c.VIOLATION_SOLUTIONS.splice(i, 1); }); }} /></div>
          </div>
        </details>
      ))}
    </div>
  );
}

// ---------------- Проекты ----------------
function ProjectsEditor({ content, patch, lang, onTranslate, busyId, adminKey }) {
  const items = content.PROJECTS || [];
  const add = () => patch((c) => { c.PROJECTS = c.PROJECTS || []; c.PROJECTS.unshift({ id: genId('proj'), title: { ru: 'Новый проект' }, location: { ru: '' }, image: '' }); });
  return (
    <div className="space-y-4">
      <button type="button" onClick={add} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Добавить проект</button>
      {items.length === 0 && <div className="text-sm text-slate-500">Проектов пока нет.</div>}
      {items.map((p, i) => (
        <details key={p.id || i} className={cardCls}>
          <summary className="cursor-pointer font-semibold text-white">{p.title?.[lang] || p.title?.ru || '—'}</summary>
          <div className="mt-3"><TranslateBtn lang={lang} busy={busyId === (p.id || i)} onClick={() => onTranslate('PROJECTS', i, ['title', 'location'], [], p.id || i)} /></div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><label className={labelCls}>ID</label><input className={inputCls} value={p.id || ''} onChange={(e) => patch((c) => { c.PROJECTS[i].id = e.target.value; })} /></div>
            <div className="md:col-span-2"><label className={labelCls}>Картинка — загрузите с компьютера или впишите путь</label><ImageField adminKey={adminKey} value={p.image} onChange={(v) => patch((c) => { c.PROJECTS[i].image = v; })} /></div>
            <div><label className={labelCls}>Заголовок ({lang})</label><input className={inputCls} value={p.title?.[lang] || ''} onChange={(e) => patch((c) => { c.PROJECTS[i].title = { ...(c.PROJECTS[i].title || {}), [lang]: e.target.value }; })} /></div>
            <div><label className={labelCls}>Подпись / место ({lang})</label><input className={inputCls} value={p.location?.[lang] || ''} onChange={(e) => patch((c) => { c.PROJECTS[i].location = { ...(c.PROJECTS[i].location || {}), [lang]: e.target.value }; })} /></div>
            <div className="md:col-span-2"><DeleteBtn label="Удалить проект" onClick={() => { if (confirm('Удалить этот проект?')) patch((c) => { c.PROJECTS.splice(i, 1); }); }} /></div>
          </div>
        </details>
      ))}
    </div>
  );
}

// ---------------- Преимущества ----------------
function BenefitsEditor({ content, patch, lang, onTranslate, busyId }) {
  const items = content.BENEFITS || [];
  const add = () => patch((c) => { c.BENEFITS = c.BENEFITS || []; c.BENEFITS.unshift({ id: genId('benefit'), icon: 'BadgeCheck', title: { ru: 'Новое преимущество' }, description: { ru: '' } }); });
  return (
    <div className="space-y-4">
      <button type="button" onClick={add} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Добавить преимущество</button>
      {items.length === 0 && <div className="text-sm text-slate-500">Пока пусто.</div>}
      {items.map((b, i) => (
        <details key={b.id || i} className={cardCls}>
          <summary className="cursor-pointer font-semibold text-white">{b.title?.[lang] || b.title?.ru || '—'}</summary>
          <div className="mt-3"><TranslateBtn lang={lang} busy={busyId === (b.id || i)} onClick={() => onTranslate('BENEFITS', i, ['title', 'description'], [], b.id || i)} /></div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><label className={labelCls}>Иконка</label><select className={inputCls} value={b.icon || 'BadgeCheck'} onChange={(e) => patch((c) => { c.BENEFITS[i].icon = e.target.value; })}>{BENEFIT_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}</select></div>
            <div><label className={labelCls}>Заголовок ({lang})</label><input className={inputCls} value={b.title?.[lang] || ''} onChange={(e) => patch((c) => { c.BENEFITS[i].title = { ...(c.BENEFITS[i].title || {}), [lang]: e.target.value }; })} /></div>
            <div className="md:col-span-2"><label className={labelCls}>Описание ({lang})</label><textarea rows={2} className={inputCls} value={b.description?.[lang] || ''} onChange={(e) => patch((c) => { c.BENEFITS[i].description = { ...(c.BENEFITS[i].description || {}), [lang]: e.target.value }; })} /></div>
            <div className="md:col-span-2"><DeleteBtn label="Удалить" onClick={() => { if (confirm('Удалить?')) patch((c) => { c.BENEFITS.splice(i, 1); }); }} /></div>
          </div>
        </details>
      ))}
    </div>
  );
}

// ---------------- Как купить (шаги) ----------------
function ProcessEditor({ content, patch, lang, onTranslate, busyId }) {
  const items = content.PROCESS_STEPS || [];
  const add = () => patch((c) => { c.PROCESS_STEPS = c.PROCESS_STEPS || []; const n = String(c.PROCESS_STEPS.length + 1).padStart(2, '0'); c.PROCESS_STEPS.push({ id: genId('step'), icon: 'Search', number: n, title: { ru: 'Новый шаг' }, description: { ru: '' } }); });
  return (
    <div className="space-y-4">
      <button type="button" onClick={add} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Добавить шаг</button>
      {items.length === 0 && <div className="text-sm text-slate-500">Пока пусто.</div>}
      {items.map((s, i) => (
        <details key={s.id || i} className={cardCls}>
          <summary className="cursor-pointer font-semibold text-white">{s.number} · {s.title?.[lang] || s.title?.ru || '—'}</summary>
          <div className="mt-3"><TranslateBtn lang={lang} busy={busyId === (s.id || i)} onClick={() => onTranslate('PROCESS_STEPS', i, ['title', 'description'], [], s.id || i)} /></div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><label className={labelCls}>Номер</label><input className={inputCls} value={s.number || ''} onChange={(e) => patch((c) => { c.PROCESS_STEPS[i].number = e.target.value; })} /></div>
            <div><label className={labelCls}>Иконка</label><select className={inputCls} value={s.icon || 'Search'} onChange={(e) => patch((c) => { c.PROCESS_STEPS[i].icon = e.target.value; })}>{PROCESS_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}</select></div>
            <div className="md:col-span-2"><label className={labelCls}>Заголовок ({lang})</label><input className={inputCls} value={s.title?.[lang] || ''} onChange={(e) => patch((c) => { c.PROCESS_STEPS[i].title = { ...(c.PROCESS_STEPS[i].title || {}), [lang]: e.target.value }; })} /></div>
            <div className="md:col-span-2"><label className={labelCls}>Описание ({lang})</label><textarea rows={2} className={inputCls} value={s.description?.[lang] || ''} onChange={(e) => patch((c) => { c.PROCESS_STEPS[i].description = { ...(c.PROCESS_STEPS[i].description || {}), [lang]: e.target.value }; })} /></div>
            <div className="md:col-span-2"><DeleteBtn label="Удалить шаг" onClick={() => { if (confirm('Удалить?')) patch((c) => { c.PROCESS_STEPS.splice(i, 1); }); }} /></div>
          </div>
        </details>
      ))}
    </div>
  );
}

// ---------------- FAQ ----------------
function FaqEditor({ content, patch, lang, onTranslate, busyId }) {
  const items = content.FAQ_ITEMS || [];
  const add = () => patch((c) => { c.FAQ_ITEMS = c.FAQ_ITEMS || []; c.FAQ_ITEMS.unshift({ id: genId('faq'), question: { ru: 'Новый вопрос' }, answer: { ru: '' } }); });
  return (
    <div className="space-y-4">
      <button type="button" onClick={add} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Добавить вопрос</button>
      {items.length === 0 && <div className="text-sm text-slate-500">Пока пусто.</div>}
      {items.map((f, i) => (
        <details key={f.id || i} className={cardCls}>
          <summary className="cursor-pointer font-semibold text-white">{f.question?.[lang] || f.question?.ru || '—'}</summary>
          <div className="mt-3"><TranslateBtn lang={lang} busy={busyId === (f.id || i)} onClick={() => onTranslate('FAQ_ITEMS', i, ['question', 'answer'], [], f.id || i)} /></div>
          <div className="mt-4 space-y-3">
            <div><label className={labelCls}>Вопрос ({lang})</label><input className={inputCls} value={f.question?.[lang] || ''} onChange={(e) => patch((c) => { c.FAQ_ITEMS[i].question = { ...(c.FAQ_ITEMS[i].question || {}), [lang]: e.target.value }; })} /></div>
            <div><label className={labelCls}>Ответ ({lang})</label><textarea rows={3} className={inputCls} value={f.answer?.[lang] || ''} onChange={(e) => patch((c) => { c.FAQ_ITEMS[i].answer = { ...(c.FAQ_ITEMS[i].answer || {}), [lang]: e.target.value }; })} /></div>
            <DeleteBtn label="Удалить вопрос" onClick={() => { if (confirm('Удалить?')) patch((c) => { c.FAQ_ITEMS.splice(i, 1); }); }} />
          </div>
        </details>
      ))}
    </div>
  );
}

// ---------------- О компании (блоки) ----------------
function AboutEditor({ content, patch, lang, onTranslate, busyId }) {
  const items = content.ABOUT_FEATURES || [];
  const add = () => patch((c) => { c.ABOUT_FEATURES = c.ABOUT_FEATURES || []; c.ABOUT_FEATURES.unshift({ id: genId('feat'), icon: 'ShieldCheck', title: { ru: 'Новый блок' }, short: { ru: '' }, details: { ru: [] } }); });
  return (
    <div className="space-y-4">
      <button type="button" onClick={add} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Добавить блок</button>
      {items.length === 0 && <div className="text-sm text-slate-500">Пока пусто.</div>}
      {items.map((f, i) => (
        <details key={f.id || i} className={cardCls}>
          <summary className="cursor-pointer font-semibold text-white">{f.title?.[lang] || f.title?.ru || '—'}</summary>
          <div className="mt-3"><TranslateBtn lang={lang} busy={busyId === (f.id || i)} onClick={() => onTranslate('ABOUT_FEATURES', i, ['title', 'short'], ['details'], f.id || i)} /></div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><label className={labelCls}>Иконка</label><select className={inputCls} value={f.icon || 'ShieldCheck'} onChange={(e) => patch((c) => { c.ABOUT_FEATURES[i].icon = e.target.value; })}>{ABOUT_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}</select></div>
            <div><label className={labelCls}>Заголовок ({lang})</label><input className={inputCls} value={f.title?.[lang] || ''} onChange={(e) => patch((c) => { c.ABOUT_FEATURES[i].title = { ...(c.ABOUT_FEATURES[i].title || {}), [lang]: e.target.value }; })} /></div>
            <div className="md:col-span-2"><label className={labelCls}>Краткий текст ({lang})</label><textarea rows={2} className={inputCls} value={f.short?.[lang] || ''} onChange={(e) => patch((c) => { c.ABOUT_FEATURES[i].short = { ...(c.ABOUT_FEATURES[i].short || {}), [lang]: e.target.value }; })} /></div>
            <div className="md:col-span-2"><label className={labelCls}>Подробности — список ({lang})</label><ListEditor items={f.details?.[lang]} placeholder="Пункт списка" onChange={(arr) => patch((c) => { c.ABOUT_FEATURES[i].details = { ...(c.ABOUT_FEATURES[i].details || {}), [lang]: arr }; })} /></div>
            <div className="md:col-span-2"><DeleteBtn label="Удалить блок" onClick={() => { if (confirm('Удалить?')) patch((c) => { c.ABOUT_FEATURES.splice(i, 1); }); }} /></div>
          </div>
        </details>
      ))}
    </div>
  );
}

// ---------------- Контакты ----------------
function ContactEditor({ content, patch, lang, onTranslateContact, busy }) {
  const ci = content.CONTACT_INFO || {};
  const setPlain = (field, value) => patch((c) => { c.CONTACT_INFO = c.CONTACT_INFO || {}; c.CONTACT_INFO[field] = value; });
  const setML = (field, value) => patch((c) => { c.CONTACT_INFO = c.CONTACT_INFO || {}; c.CONTACT_INFO[field] = { ...(c.CONTACT_INFO[field] || {}), [lang]: value }; });
  return (
    <div className={cardCls}>
      <div className="mb-3"><TranslateBtn lang={lang} busy={busy} onClick={onTranslateContact} /></div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div><label className={labelCls}>Телефон (текст)</label><input className={inputCls} value={ci.phone || ''} onChange={(e) => setPlain('phone', e.target.value)} /></div>
        <div><label className={labelCls}>Телефон (ссылка, tel:)</label><input className={inputCls} value={ci.phoneHref || ''} onChange={(e) => setPlain('phoneHref', e.target.value)} /></div>
        <div><label className={labelCls}>Email (текст)</label><input className={inputCls} value={ci.email || ''} onChange={(e) => setPlain('email', e.target.value)} /></div>
        <div><label className={labelCls}>Email (ссылка, mailto:)</label><input className={inputCls} value={ci.emailHref || ''} onChange={(e) => setPlain('emailHref', e.target.value)} /></div>
        <div><label className={labelCls}>Время работы ({lang})</label><input className={inputCls} value={ci.hours?.[lang] || ''} onChange={(e) => setML('hours', e.target.value)} /></div>
        <div><label className={labelCls}>Адрес ({lang})</label><input className={inputCls} value={ci.address?.[lang] || ''} onChange={(e) => setML('address', e.target.value)} /></div>
        <div className="md:col-span-2"><label className={labelCls}>Карта (ссылка для встраивания, mapEmbed)</label><textarea rows={2} className={inputCls} value={ci.mapEmbed || ''} onChange={(e) => setPlain('mapEmbed', e.target.value)} /></div>
      </div>
    </div>
  );
}

// ---------------- Мониторинг («Комплексы на связи») ----------------
function MonitorEditor({ content, patch, lang }) {
  const mon = content.MONITOR || {};
  const setML = (field, value) => patch((c) => {
    c.MONITOR = c.MONITOR || {};
    c.MONITOR[field] = { ...(c.MONITOR[field] || {}), [lang]: value };
  });
  const setStat = (index, field, value) => patch((c) => {
    c.MONITOR = c.MONITOR || {};
    const list = Array.isArray(c.MONITOR.stats) ? [...c.MONITOR.stats] : [];
    const item = { ...(list[index] || {}) };
    item[field] = { ...(item[field] || {}), [lang]: value };
    list[index] = item;
    c.MONITOR.stats = list;
  });
  const addStat = () => patch((c) => {
    c.MONITOR = c.MONITOR || {};
    const list = Array.isArray(c.MONITOR.stats) ? [...c.MONITOR.stats] : [];
    list.push({ label: {}, value: {}, note: {} });
    c.MONITOR.stats = list;
  });
  const removeStat = (index) => patch((c) => {
    if (!c.MONITOR || !Array.isArray(c.MONITOR.stats)) return;
    c.MONITOR.stats = c.MONITOR.stats.filter((_, i) => i !== index);
  });

  const addRow = (field) => patch((c) => {
    c.MONITOR = c.MONITOR || {};
    c.MONITOR[field] = [...(c.MONITOR[field] || []), {}];
  });
  const setRow = (field, index, value) => patch((c) => {
    c.MONITOR = c.MONITOR || {};
    const list = [...(c.MONITOR[field] || [])];
    list[index] = { ...(list[index] || {}), [lang]: value };
    c.MONITOR[field] = list;
  });
  const removeRow = (field, index) => patch((c) => {
    if (!c.MONITOR || !Array.isArray(c.MONITOR[field])) return;
    c.MONITOR[field] = c.MONITOR[field].filter((_, i) => i !== index);
  });

  const stats = Array.isArray(mon.stats) ? mon.stats : [];
  const field = (key) => mon[key]?.[lang] || '';

  return (
    <div className="space-y-4">
      <div className={cardCls}>
        <div className="mb-3 text-sm font-semibold text-white">Заголовок блока</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div><label className={labelCls}>Надзаголовок ({lang})</label>
            <input className={inputCls} value={field('tag')} onChange={(e) => setML('tag', e.target.value)} /></div>
          <div><label className={labelCls}>Заголовок ({lang})</label>
            <input className={inputCls} value={field('title')} onChange={(e) => setML('title', e.target.value)} /></div>
          <div className="md:col-span-2"><label className={labelCls}>Описание под заголовком ({lang})</label>
            <textarea rows={2} className={inputCls} value={field('lead')} onChange={(e) => setML('lead', e.target.value)} /></div>
        </div>
      </div>

      <div className={cardCls}>
        <div className="mb-3 text-sm font-semibold text-white">Лента фиксаций</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div><label className={labelCls}>Заголовок ленты ({lang})</label>
            <input className={inputCls} value={field('feedTitle')} onChange={(e) => setML('feedTitle', e.target.value)} /></div>
          <div><label className={labelCls}>Пометка «демонстрация» ({lang})</label>
            <input className={inputCls} value={field('demoLabel')} onChange={(e) => setML('demoLabel', e.target.value)} /></div>
          <div><label className={labelCls}>Значок «в работе» ({lang})</label>
            <input className={inputCls} value={field('activeLabel')} onChange={(e) => setML('activeLabel', e.target.value)} /></div>
          <div><label className={labelCls}>Значок «эфир» ({lang})</label>
            <input className={inputCls} value={field('liveLabel')} onChange={(e) => setML('liveLabel', e.target.value)} /></div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Сами строки ленты формируются автоматически из решений и проектов — это демонстрация работы, а не реальные данные.
        </p>
      </div>

      <div className={cardCls}>
        <div className="mb-2 text-sm font-semibold text-white">Номера в ленте</div>
        <p className="text-xs leading-relaxed text-slate-400">
          Номера подставляются автоматически и вручную не задаются. Генератор собирает
          их по правилам шести стран СНГ — Узбекистан, Россия, Казахстан, Кыргызстан,
          Таджикистан, Беларусь — с настоящими кодами регионов и форматом каждой страны.
          В ленте они идут вперемешку.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Правила описаны в файле <code>apps/site/src/app/lib/plates.js</code> — там же
          меняется список стран и частота, с которой каждая попадается.
        </p>
      </div>

      <div className={cardCls}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">Виды нарушений в ленте</div>
          <button type="button" onClick={() => addRow('kinds')}
            className="rounded-xl border border-cyan-500/30 px-3 py-1.5 text-xs text-cyan-300 transition hover:border-cyan-500">
            + Добавить
          </button>
        </div>
        <div className="space-y-2">
          {(mon.kinds || []).length === 0 && (
            <div className="text-xs text-slate-500">
              Список пуст — в ленте будут показываться заголовки из раздела «Задачи».
            </div>
          )}
          {(mon.kinds || []).map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input className={inputCls} value={item?.[lang] || ''}
                onChange={(e) => setRow('kinds', index, e.target.value)} />
              <button type="button" onClick={() => removeRow('kinds', index)}
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-red-500/10 hover:text-red-400">
                удалить
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={cardCls}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">Места в ленте</div>
          <button type="button" onClick={() => addRow('places')}
            className="rounded-xl border border-cyan-500/30 px-3 py-1.5 text-xs text-cyan-300 transition hover:border-cyan-500">
            + Добавить
          </button>
        </div>
        <div className="space-y-2">
          {(mon.places || []).length === 0 && (
            <div className="text-xs text-slate-500">
              Список пуст — в ленте будут показываться адреса из раздела «Наши проекты».
            </div>
          )}
          {(mon.places || []).map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input className={inputCls} value={item?.[lang] || ''}
                onChange={(e) => setRow('places', index, e.target.value)} />
              <button type="button" onClick={() => removeRow('places', index)}
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-red-500/10 hover:text-red-400">
                удалить
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={cardCls}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">Плитки с показателями</div>
          <button type="button" onClick={addStat}
            className="rounded-xl border border-cyan-500/30 px-3 py-1.5 text-xs text-cyan-300 transition hover:border-cyan-500">
            + Добавить плитку
          </button>
        </div>
        <div className="space-y-3">
          {stats.length === 0 && <div className="text-xs text-slate-500">Плиток нет. Добавьте первую.</div>}
          {stats.map((item, index) => (
            <div key={index} className="rounded-xl border border-slate-800 bg-black/30 p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div><label className={labelCls}>Подпись ({lang})</label>
                  <input className={inputCls} value={item.label?.[lang] || ''} onChange={(e) => setStat(index, 'label', e.target.value)} /></div>
                <div><label className={labelCls}>Значение ({lang})</label>
                  <input className={inputCls} value={item.value?.[lang] || ''} onChange={(e) => setStat(index, 'value', e.target.value)} /></div>
                <div><label className={labelCls}>Пояснение ({lang})</label>
                  <input className={inputCls} value={item.note?.[lang] || ''} onChange={(e) => setStat(index, 'note', e.target.value)} /></div>
              </div>
              <div className="mt-2 flex justify-end">
                <button type="button" onClick={() => removeStat(index)}
                  className="rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-red-500/10 hover:text-red-400">
                  Удалить плитку
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Тексты сайта ----------------
function TextNode({ value, path, onEdit, depth }) {
  if (typeof value === 'string' || typeof value === 'number') {
    const str = String(value);
    return isLong(str)
      ? <textarea rows={2} className={inputCls} value={str} onChange={(e) => onEdit(path, e.target.value)} />
      : <input className={inputCls} value={str} onChange={(e) => onEdit(path, e.target.value)} />;
  }
  if (Array.isArray(value)) {
    return (
      <div className="space-y-2 border-l border-cyan-500/15 pl-3">
        {value.map((item, index) => (
          <div key={index}><div className="text-[11px] text-slate-500">#{index + 1}</div><TextNode value={item} path={[...path, index]} onEdit={onEdit} depth={depth + 1} /></div>
        ))}
      </div>
    );
  }
  if (value && typeof value === 'object') {
    return (
      <div className="space-y-2 border-l border-cyan-500/15 pl-3">
        {Object.keys(value).map((key) => (
          <div key={key}><label className={labelCls}>{key}</label><TextNode value={value[key]} path={[...path, key]} onEdit={onEdit} depth={depth + 1} /></div>
        ))}
      </div>
    );
  }
  return null;
}

function TextsEditor({ content, patch, lang }) {
  const root = content.UI_TEXT?.[lang];
  const onEdit = (pathArr, value) => patch((c) => { setByPath(c.UI_TEXT[lang], pathArr, value); });
  if (!root) return <div className="text-sm text-slate-500">Для языка «{lang}» текстов нет.</div>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">Меняйте любой текст сайта для языка «{lang}». Разделы можно сворачивать.</p>
      {Object.keys(root).map((section) => (
        <details key={section} className={cardCls}>
          <summary className="cursor-pointer font-semibold text-cyan-300">{section}</summary>
          <div className="mt-3"><TextNode value={root[section]} path={[section]} onEdit={onEdit} depth={0} /></div>
        </details>
      ))}
    </div>
  );
}

export default function App() {
  const [key, setKey] = useState(() => {
    if (typeof window === 'undefined') return '';
    try { return localStorage.getItem(KEY_STORE) || ''; } catch { return ''; }
  });
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [content, setContent] = useState(null);
  const [lang, setLang] = useState('ru');
  const [tab, setTab] = useState('products');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  // Есть ли несохранённые правки в админке.
  const [dirty, setDirty] = useState(false);
  // Файл siteData.js изменили в редакторе кода — предлагаем подтянуть.
  const [codeChanged, setCodeChanged] = useState(false);
  // Выпадающее меню разделов на узких экранах (телефон, планшет).
  const [menuOpen, setMenuOpen] = useState(false);
  const versionRef = useRef(null);
  const ignoreVersionRef = useRef(null);
  // История правок для отмены по одному шагу.
  // Каждая запись хранит состояние ДО изменения и описание того, что сделали.
  const [history, setHistory] = useState([]);
  const [undoTarget, setUndoTarget] = useState(null);
  // Куда вернуться из раздела «Сотрудники».
  const [prevTab, setPrevTab] = useState('products');
  // Сколько строк ещё не переведено: отдельно автоязыки и ручные.
  const [transLeft, setTransLeft] = useState(null);
  // Прогон перевода всего сайта: текст прогресса в шапке.
  const [transRun, setTransRun] = useState('');
  // Захватывать ли китайский и арабский при переводе. По умолчанию нет:
  // их правят руками, и затирать чужую работу не годится.
  const [withManual, setWithManual] = useState(false);
  // Настроена ли выгрузка контента обратно в репозиторий.
  const [gitInfo, setGitInfo] = useState(null);
  const [publishing, setPublishing] = useState(false);
  // Таймер опроса фоновой задачи перевода.
  const watchRef = useRef(null);

  const langs = useMemo(() => (content?.LANGUAGE_OPTIONS?.length ? content.LANGUAGE_OPTIONS : DEFAULT_LANGS), [content]);

  // На какие языки переводим кнопками. Автоязыки всегда, ручные — по галочке.
  const translateTargets = useMemo(() => {
    const codes = langs.map((l) => l.code);
    const allowed = withManual ? [...AUTO_LANGS, ...MANUAL_LANGS] : AUTO_LANGS;
    return codes.filter((c) => allowed.includes(c) && c !== lang);
  }, [langs, lang, withManual]);

  const patch = (fn) => {
    setDirty(true);
    setContent((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);

      // Записываем шаг в историю. Подряд идущие правки одного и того же поля
      // (например, набор текста по буквам) считаем одним шагом — иначе отмена
      // возвращала бы по одному символу.
      const change = describeChange(prev, next);
      if (change) {
        setHistory((items) => {
          const last = items[items.length - 1];
          const now = Date.now();
          if (last && last.kind === 'edit' && change.kind === 'edit'
              && last.path === change.path && now - last.at < 2000) {
            const merged = items.slice(0, -1);
            merged.push({ ...last, at: now, label: change.label, undoText: change.undoText });
            return merged;
          }
          const appended = [...items, { ...change, before: prev, at: now }];
          // Больше 50 шагов держать незачем — это лишняя память.
          return appended.length > 50 ? appended.slice(appended.length - 50) : appended;
        });
      }
      return next;
    });
  };

  // Отмена последнего шага. Сначала спрашиваем подтверждение и показываем,
  // что именно откатится.
  const askUndo = () => {
    const last = history[history.length - 1];
    if (!last) { setStatus('Отменять нечего — правок пока не было.'); return; }
    setUndoTarget(last);
  };

  const doUndo = () => {
    const last = history[history.length - 1];
    if (!last) { setUndoTarget(null); return; }
    setContent(last.before);
    setHistory((items) => items.slice(0, -1));
    setDirty(true);
    setUndoTarget(null);
    setStatus(`Отменено: ${last.label}`);
  };

  // Читает контент прямо из siteData.js (через сервер).
  const loadContent = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setStatus('');
    try {
      const data = await getJson('/api/content');
      setContent(data && typeof data === 'object' ? data : {});
      setDirty(false);
      setCodeChanged(false);
      setHistory([]);
      try {
        const meta = await getJson('/api/content/version');
        versionRef.current = meta.version;
      } catch { /* не критично */ }
    } catch (e) {
      setStatus(`Не удалось загрузить контент: ${e.message}`);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { if (key) { loadContent(); refreshTranslationStatus(); refreshGitStatus(); } /* eslint-disable-next-line */ }, [key]);
  useEffect(() => () => { if (watchRef.current) clearInterval(watchRef.current); }, []);

  // ---- Синхронизация «код → админка» ----
  // Каждые 2.5 секунды спрашиваем сервер, не менялся ли siteData.js.
  // Если менялся и несохранённых правок нет — подтягиваем молча.
  // Если правки есть — показываем баннер, чтобы ничего не затереть.
  useEffect(() => {
    if (!key) return undefined;
    let stopped = false;
    const tick = async () => {
      try {
        const meta = await getJson('/api/content/version');
        if (stopped) return;
        if (versionRef.current === null) { versionRef.current = meta.version; return; }
        if (meta.version === versionRef.current) return;
        if (ignoreVersionRef.current === meta.version) { versionRef.current = meta.version; return; }
        if (dirty) {
          setCodeChanged(true);
        } else {
          versionRef.current = meta.version;
          await loadContent({ silent: true });
          setStatus('Контент обновлён: siteData.js изменили в коде.');
        }
      } catch { /* сервер недоступен — молчим */ }
    };
    const id = setInterval(tick, 2500);
    return () => { stopped = true; clearInterval(id); };
    /* eslint-disable-next-line */
  }, [key, dirty]);

  // Предупреждаем о несохранённых правках при закрытии вкладки.
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const doLogin = async () => {
    const login = loginInput.trim();
    const password = passwordInput;
    if (!login || !password) { setAuthError('Введите логин и пароль.'); return; }
    try {
      await postJson('/api/admin/login', { login, password });
      try { localStorage.setItem(KEY_STORE, password); } catch { /* */ }
      setKey(password);
      setAuthError('');
      setPasswordInput('');
    } catch (e) {
      if (/логин|парол|401|unauthorized/i.test(e.message)) setAuthError('Неверный логин или пароль.');
      else setAuthError('Сервер недоступен. Запущен ли он? (npm run server)');
    }
  };
  const logout = () => { try { localStorage.removeItem(KEY_STORE); } catch { /* */ } setKey(''); setContent(null); };

  const save = async () => {
    if (!content) return;
    setSaving(true); setStatus('');
    try {
      const res = await postJson('/api/admin/save', { key, content });
      // Эту версию мы создали сами — не считаем её «изменением в коде».
      if (res && typeof res.version === 'number') {
        ignoreVersionRef.current = res.version;
        versionRef.current = res.version;
      }
      // Сервер мог дописать английский и узбекский — забираем его версию,
      // иначе в админке останется старый текст, а в файле будет новый.
      if (res && res.content) setContent(res.content);
      setDirty(false);
      setCodeChanged(false);
      setHistory([]);
      setStatus('Сохранено в siteData.js. Перевод на EN и UZ идёт фоном.');
      // Следим за фоновой задачей: она допереводит изменённое и
      // отправит файл в репозиторий, когда закончит.
      watchTranslationJob();
    } catch (e) {
      setStatus(/ключ|401/i.test(e.message) ? 'Неверный ключ администратора.' : `Ошибка сохранения: ${e.message}`);
    } finally { setSaving(false); }
  };

  const resetContent = async () => {
    if (!confirm('Сбросить весь контент к исходному состоянию? Ваши изменения будут потеряны.')) return;
    try { await postJson('/api/admin/reset', { key }); await loadContent(); setStatus('Контент сброшен к исходному.'); }
    catch (e) { setStatus(`Ошибка сброса: ${e.message}`); }
  };

  // Умеет ли сервер возвращать правки в исходный код.
  const refreshGitStatus = async () => {
    try {
      const res = await getJson(`/api/admin/publish/status?key=${encodeURIComponent(key)}`);
      setGitInfo(res);
    } catch { /* не критично */ }
  };

  // Ручная выгрузка в GitHub — на случай, когда автовыгрузка выключена
  // или в прошлый раз не прошла (например, сервер был без интернета).
  const publishToGit = async () => {
    setPublishing(true);
    try {
      const res = await postJson('/api/admin/publish', { key });
      if (res.skipped) setStatus('В репозитории уже та же версия — коммит не нужен.');
      else setStatus(`Контент отправлен в ${res.repo}, ветка ${res.branch}. Коммит ${res.sha}.`);
    } catch (e) {
      setStatus(`Не удалось выгрузить в GitHub: ${e.message}`);
    } finally { setPublishing(false); }
  };

  // Взять контент из репозитория. Нужно после деплоя, когда в коде появился
  // новый текст (например, ещё один язык), а на диске лежит старая версия.
  const reseedFromRepo = async () => {
    if (!confirm('Заменить контент на версию из репозитория?\n\nТекущая версия уйдёт в резервные копии, откатиться можно. Правки, сделанные в админке и не выгруженные в код, будут потеряны.')) return;
    try {
      await postJson('/api/admin/reseed', { key });
      await loadContent();
      await refreshTranslationStatus();
      setStatus('Контент обновлён из репозитория.');
    } catch (e) {
      setStatus(`Не удалось обновить: ${e.message}`);
    }
  };

  // Запасной путь: скачать файл и положить его в проект руками.
  const downloadContentFile = () => {
    window.open(`${API_BASE_URL}/api/admin/content/file?key=${encodeURIComponent(key)}`, '_blank');
  };

  // Сколько строк ещё без перевода — показываем числом у кнопки.
  const refreshTranslationStatus = async () => {
    try {
      const res = await getJson(`/api/admin/translate/status?key=${encodeURIComponent(key)}`);
      setTransLeft(res);
      // Перевод мог быть запущен раньше и идти прямо сейчас — подхватываем.
      if (res.job && res.job.running) watchTranslationJob();
    } catch { /* не критично: просто не покажем счётчик */ }
  };

  // Следим за фоновым переводом: спрашиваем статус раз в две секунды,
  // показываем прогресс и в конце подтягиваем обновлённый контент.
  const watchTranslationJob = () => {
    if (watchRef.current) return;
    watchRef.current = setInterval(async () => {
      try {
        const res = await getJson(`/api/admin/translate/status?key=${encodeURIComponent(key)}`);
        setTransLeft(res);
        const job = res.job || {};
        if (job.running) {
          const percent = job.total ? Math.round((job.done / job.total) * 100) : 0;
          setTransRun(job.total ? `Перевод: ${job.done} из ${job.total} (${percent}%)` : 'Перевод…');
          return;
        }
        // Задача закончилась — прибираемся и показываем итог.
        clearInterval(watchRef.current);
        watchRef.current = null;
        setTransRun('');
        if (job.error) {
          // Сразу выясняем причину: сеть, блокировка или ключ.
          let hint = '';
          try {
            const check = await getJson(`/api/admin/translate/check?key=${encodeURIComponent(key)}`);
            hint = check.ok
              ? ` Связь есть (${check.mode}) — попробуйте запустить ещё раз.`
              : ` Способ: ${check.mode}. Ответ: ${check.message}`;
          } catch { /* диагностика не обязательна */ }
          setStatus(`Перевод остановлен: ${job.error}${hint}`);
        } else if (job.done) {
          await loadContent({ silent: true });
          setStatus(`Перевод завершён: ${job.done} строк. Проверьте текст и при необходимости поправьте вручную.`);
        }
      } catch {
        clearInterval(watchRef.current);
        watchRef.current = null;
        setTransRun('');
      }
    }, 2000);
  };

  // Перевод всего сайта. Сервер берёт работу в фон и сразу отвечает,
  // поэтому кнопка не блокирует админку даже на тысяче строк.
  const translateWholeSite = async () => {
    if (dirty) { setStatus('Сначала сохраните правки — перевод работает с тем, что записано в файл.'); return; }
    const targets = withManual ? [...AUTO_LANGS, ...MANUAL_LANGS] : AUTO_LANGS;
    const list = langs.map((l) => l.code).filter((c) => targets.includes(c) && c !== 'ru');
    if (!confirm(`Перевести весь сайт на: ${list.join(', ').toUpperCase()}?\n\nЗаполнятся только пустые поля, уже написанные тексты останутся как есть.\nПеревод идёт фоном — админкой можно пользоваться дальше.`)) return;

    setTransRun('Запускаю…');
    try {
      await postJson('/api/admin/translate-all', { key, targets: list, from: 'ru' });
      setStatus('Перевод запущен. Идёт фоном, прогресс виден на кнопке.');
      watchTranslationJob();
    } catch (e) {
      setTransRun('');
      setStatus(`Не удалось запустить перевод: ${e.message}`);
    }
  };

  // Перевод одной карточки с текущего языка на остальные.
  const onTranslate = async (collection, index, stringKeys, arrayKeys, itemKey) => {
    setBusyId(itemKey); setStatus('Перевод…');
    try {
      const item = content[collection][index];
      const targets = translateTargets;
      const texts = [];
      stringKeys.forEach((k) => texts.push((item[k] && item[k][lang]) || ''));
      arrayKeys.forEach((k) => ((item[k] && item[k][lang]) || []).forEach((v) => texts.push(v || '')));
      const { translations } = await postJson('/api/admin/translate', { key, from: lang, to: targets, texts });
      patch((c) => {
        const it = c[collection][index];
        targets.forEach((tl) => {
          const arr = translations[tl] || [];
          let p = 0;
          stringKeys.forEach((k) => { const v = arr[p]; p += 1; if (v != null && String(v).trim() !== '') { it[k] = it[k] || {}; it[k][tl] = v; } });
          arrayKeys.forEach((k) => {
            const src = (it[k] && it[k][lang]) || [];
            const out = src.map((s) => { const v = arr[p]; p += 1; return (v != null && String(v).trim() !== '') ? v : s; });
            if (src.length) { it[k] = it[k] || {}; it[k][tl] = out; }
          });
        });
      });
      setStatus('Переведено на все языки. Не забудьте «Сохранить».');
    } catch (e) { setStatus(`Ошибка перевода: ${e.message}`); }
    finally { setBusyId(''); }
  };

  // Перевод одного многоязычного поля — используется универсальным редактором.
  const translateField = async (value, apply) => {
    setBusyId('field'); setStatus('Перевод…');
    try {
      const source = (value && value[lang]) || '';
      if (!String(source).trim()) { setStatus('Поле пустое — переводить нечего.'); return; }
      const targets = translateTargets;
      const { translations } = await postJson('/api/admin/translate', { key, from: lang, to: targets, texts: [source] });
      const next = { ...value };
      targets.forEach((code) => {
        const translated = (translations[code] || [])[0];
        if (translated != null && String(translated).trim() !== '') next[code] = translated;
      });
      apply(next);
      setStatus('Поле переведено. Не забудьте «Сохранить».');
    } catch (e) {
      setStatus(`Не удалось перевести: ${e.message}`);
    } finally { setBusyId(''); }
  };

  const onTranslateContact = async () => {
    setBusyId('contact'); setStatus('Перевод…');
    try {
      const ci = content.CONTACT_INFO || {};
      const targets = translateTargets;
      const texts = [(ci.hours && ci.hours[lang]) || '', (ci.address && ci.address[lang]) || ''];
      const { translations } = await postJson('/api/admin/translate', { key, from: lang, to: targets, texts });
      patch((c) => {
        c.CONTACT_INFO = c.CONTACT_INFO || {};
        const x = c.CONTACT_INFO;
        targets.forEach((tl) => {
          const arr = translations[tl] || [];
          if (arr[0] && arr[0].trim()) { x.hours = x.hours || {}; x.hours[tl] = arr[0]; }
          if (arr[1] && arr[1].trim()) { x.address = x.address || {}; x.address[tl] = arr[1]; }
        });
      });
      setStatus('Переведено. Не забудьте «Сохранить».');
    } catch (e) { setStatus(`Ошибка перевода: ${e.message}`); }
    finally { setBusyId(''); }
  };

  if (!key) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-cyan-500/20 bg-slate-950 p-8 shadow-2xl">
          <div className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-center text-2xl font-bold text-transparent">OLAN — Админ-панель</div>
          <p className="mt-2 text-center text-sm text-slate-400">Введите логин и пароль, чтобы редактировать сайт.</p>
          <label className="mb-1 mt-6 block text-xs font-semibold uppercase tracking-wide text-slate-400">Логин</label>
          <input type="text" autoComplete="username" value={loginInput} onChange={(e) => setLoginInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') doLogin(); }} placeholder="Логин" className="w-full rounded-2xl border border-cyan-500/20 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500" />
          <label className="mb-1 mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-400">Пароль</label>
          <input type="password" autoComplete="current-password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') doLogin(); }} placeholder="Пароль" className="w-full rounded-2xl border border-cyan-500/20 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500" />
          {authError && <div className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{authError}</div>}
          <button type="button" onClick={doLogin} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white">Войти</button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'products', label: 'Приборы', icon: Box },
    { id: 'solutions', label: 'Решения', icon: Lightbulb },
    { id: 'projects', label: 'Наши проекты', icon: ImageIcon },
    { id: 'benefits', label: 'Преимущества', icon: Award },
    { id: 'process', label: 'Как купить', icon: ListChecks },
    { id: 'faq', label: 'Частые вопросы', icon: HelpCircle },
    { id: 'about', label: 'Страница «О нас»', icon: Building2 },
    { id: 'contact', label: 'Контакты', icon: Phone },
    { id: 'monitor', label: 'Мониторинг', icon: Activity },
    { id: 'texts', label: 'Тексты сайта', icon: Type },
    { id: 'company', label: 'Профиль компании', icon: BuildingIcon },
    { id: 'directions', label: 'Направления', icon: Layers },
    { id: 'cases', label: 'Задачи заказчика', icon: Route },
    { id: 'portfolio', label: 'Продукты группы', icon: Package },
    { id: 'engagement', label: 'Модели работы', icon: Route },
    { id: 'workflow', label: 'Этапы и SLA', icon: WorkflowIcon },
    { id: 'team', label: 'Команда', icon: UsersRound },
    { id: 'staff', label: 'Сотрудники', icon: Users },
  ];

  // Раздел «Сотрудники» живёт отдельно от контента сайта: он ничего не пишет
  // в siteData.js, поэтому кнопки «Сохранить» и «Сбросить» к нему не относятся.
  const isStaffTab = tab === 'staff';

  // Вкладки контента. «Сотрудники» вынесены отдельно — они всегда на виду.
  const contentTabs = tabs.filter((t) => t.id !== 'staff');
  const activeTab = contentTabs.find((t) => t.id === tab);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-30 border-b border-cyan-500/15 bg-slate-950/95 px-3 py-3 backdrop-blur sm:px-5">
        <div className="flex w-full items-center gap-2">
          {/* Логотип слева */}
          <div className="shrink-0 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-base font-bold text-transparent sm:text-lg">
            OLAN<span className="hidden sm:inline"> — Админка</span>
          </div>

          {/* Кнопка списка разделов — только на узком экране */}
          {!isStaffTab && (
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-cyan-500/20 px-2.5 text-xs text-slate-300 transition hover:text-white lg:hidden"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              <span className="max-w-[90px] truncate">{activeTab ? activeTab.label : 'Разделы'}</span>
            </button>
          )}

          {/* Всё управление — справа */}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            {!isStaffTab && (
              <>
                {dirty && <span className="hidden rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] text-amber-300 sm:inline">не сохранено</span>}

                <select value={lang} onChange={(e) => setLang(e.target.value)}
                  className="rounded-xl border border-cyan-500/20 bg-slate-900 px-2 py-1.5 text-xs text-white sm:text-sm">
                  {langs.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>

                {/* Перевод всего сайта. Русский, английский и узбекский
                    сервер и так держит в актуальном состоянии при каждом
                    сохранении — кнопка нужна для первого прогона и для
                    китайского с арабским по галочке. */}
                <label className="hidden items-center gap-1.5 rounded-xl border border-cyan-500/20 px-2 py-1.5 text-[11px] text-slate-300 xl:inline-flex"
                  title="Захватить китайский и арабский. Обычно их правят вручную.">
                  <input type="checkbox" checked={withManual} onChange={(e) => setWithManual(e.target.checked)} className="accent-cyan-500" />
                  ZH / AR
                </label>

                <button type="button" onClick={translateWholeSite} disabled={!!transRun || !content}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-cyan-500/20 px-2.5 text-xs text-slate-300 transition hover:text-white disabled:opacity-40"
                  title="Перевести весь сайт: заполнить пустые поля на других языках">
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">{transRun || 'Перевести сайт'}</span>
                  {!transRun && transLeft && (transLeft.auto + (withManual ? transLeft.manual : 0)) > 0 && (
                    <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] text-amber-300">
                      {transLeft.auto + (withManual ? transLeft.manual : 0)}
                    </span>
                  )}
                </button>

                {/* Правки живут в файле siteData.js. Локально это файл проекта,
                    на хостинге — файл на диске, поэтому его отдельно
                    отправляют в репозиторий. */}
                {gitInfo && !gitInfo.local && (
                  <button type="button" onClick={publishToGit} disabled={publishing || !gitInfo.configured}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-cyan-500/20 px-2.5 text-xs text-slate-300 transition hover:text-white disabled:opacity-40"
                    title={gitInfo.configured
                      ? `Отправить контент в ${gitInfo.repo}, ветка ${gitInfo.branch}`
                      : 'Выгрузка в GitHub не настроена: добавьте GITHUB_TOKEN и GITHUB_REPO'}>
                    <GitBranch className="h-4 w-4" />
                    <span className="hidden sm:inline">{publishing ? 'Отправляю…' : 'В код'}</span>
                  </button>
                )}

                {gitInfo && !gitInfo.local && (
                  <button type="button" onClick={reseedFromRepo}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/20 text-slate-300 transition hover:text-white"
                    title="Обновить контент из репозитория — нужно после деплоя с новыми текстами"><FileDown className="h-4 w-4" /></button>
                )}

                {gitInfo && !gitInfo.local && !gitInfo.configured && (
                  <button type="button" onClick={downloadContentFile}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/20 text-slate-300 transition hover:text-white"
                    title="Скачать siteData.js, чтобы положить его в проект вручную"><Download className="h-4 w-4" /></button>
                )}

                <button type="button" onClick={() => loadContent()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/20 text-slate-300 transition hover:text-white"
                  title="Перечитать siteData.js"><RefreshCw className="h-4 w-4" /></button>

                <button type="button" onClick={askUndo} disabled={history.length === 0}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-cyan-500/20 px-2.5 text-xs text-slate-300 transition hover:text-white disabled:opacity-40"
                  title="Отменить последнее изменение">
                  <Undo2 className="h-4 w-4" />
                  {history.length > 0 && <span className="rounded-full bg-slate-800 px-1.5 text-[10px]">{history.length}</span>}
                </button>

                <button type="button" onClick={resetContent}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/20 text-slate-300 transition hover:text-white"
                  title="Сбросить весь контент к исходному"><RotateCcw className="h-4 w-4" /></button>

                <button type="button" onClick={save} disabled={saving || !content}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 sm:px-4 sm:text-sm">
                  <Save className="h-4 w-4" /> <span className="hidden sm:inline">{saving ? 'Сохраняю…' : 'Сохранить'}</span>
                </button>
              </>
            )}

            {isStaffTab ? (
              <button type="button" onClick={() => setTab(prevTab)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/20 px-3 py-2 text-xs font-medium text-slate-300 transition hover:text-white sm:text-sm">
                <ArrowLeft className="h-4 w-4" /> Назад к контенту
              </button>
            ) : (
              <button type="button" onClick={() => { setPrevTab(tab); setTab('staff'); setMenuOpen(false); }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/20 px-3 py-2 text-xs font-medium text-slate-300 transition hover:text-white sm:text-sm">
                <Users className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Сотрудники</span>
              </button>
            )}

            <button type="button" onClick={logout}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/20 text-slate-300 transition hover:text-white"
              aria-label="Выйти">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {undoTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15">
                <Undo2 className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Отменить изменение?</h3>
            </div>
            <div className="rounded-xl bg-black/40 px-3 py-2 text-sm text-slate-200">{undoTarget.label}</div>
            <p className="mt-3 text-sm leading-relaxed text-amber-200">{undoTarget.undoText}</p>
            <p className="mt-2 text-xs text-slate-500">
              Отменяется один шаг. Осталось шагов в истории: {history.length}.
            </p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setUndoTarget(null)}
                className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800">
                Оставить как есть
              </button>
              <button type="button" onClick={doUndo}
                className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400">
                Отменить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Разделы контента — вертикальным списком слева, содержимое справа */}
      <div className="flex w-full items-start">
        {!isStaffTab && (
          <>
            {/* Боковая колонка на широком экране */}
            <aside className="sticky top-[61px] hidden w-52 shrink-0 self-start border-r border-cyan-500/15 bg-slate-950/60 p-2 lg:block">
              <nav className="flex flex-col gap-1">
                {contentTabs.map((t) => (
                  <button key={t.id} type="button" onClick={() => setTab(t.id)}
                    className={`inline-flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition ${tab === t.id ? 'bg-cyan-500 text-white' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}>
                    <t.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </nav>
            </aside>

            {/* Тот же список выпадающим меню на узком экране */}
            {menuOpen && (
              <div className="fixed inset-x-0 top-[61px] z-20 border-b border-cyan-500/20 bg-slate-950 p-2 lg:hidden">
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {contentTabs.map((t) => (
                    <button key={t.id} type="button" onClick={() => { setTab(t.id); setMenuOpen(false); }}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition ${tab === t.id ? 'bg-cyan-500 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                      <t.icon className="h-4 w-4 shrink-0" /> <span className="truncate">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      <main className="min-w-0 flex-1 px-3 py-5 sm:px-5 sm:py-6">
        {codeChanged && !isStaffTab && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <FileCode className="h-4 w-4 shrink-0" />
            <span className="flex-1">Файл <code className="rounded bg-black/30 px-1">siteData.js</code> изменили в коде, а у вас есть несохранённые правки. Что делаем?</span>
            <button type="button" onClick={() => loadContent()} className="rounded-xl border border-amber-400/40 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20">Взять версию из кода</button>
            <button type="button" onClick={save} className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-amber-400">Сохранить мою версию</button>
          </div>
        )}
        {status && !isStaffTab && <div className="mb-4 rounded-2xl bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">{status}</div>}

        {isStaffTab && <StaffSection adminKey={key} />}

        {!isStaffTab && loading && <div className="text-sm text-slate-400">Загрузка…</div>}
        {!isStaffTab && !loading && content && (
          <>
            {tab === 'products' && <ProductsEditor content={content} patch={patch} lang={lang} onTranslate={onTranslate} busyId={busyId} adminKey={key} />}
            {tab === 'solutions' && <SolutionsEditor content={content} patch={patch} lang={lang} onTranslate={onTranslate} busyId={busyId} />}
            {tab === 'projects' && <ProjectsEditor content={content} patch={patch} lang={lang} onTranslate={onTranslate} busyId={busyId} adminKey={key} />}
            {tab === 'benefits' && <BenefitsEditor content={content} patch={patch} lang={lang} onTranslate={onTranslate} busyId={busyId} />}
            {tab === 'process' && <ProcessEditor content={content} patch={patch} lang={lang} onTranslate={onTranslate} busyId={busyId} />}
            {tab === 'faq' && <FaqEditor content={content} patch={patch} lang={lang} onTranslate={onTranslate} busyId={busyId} />}
            {tab === 'about' && <AboutEditor content={content} patch={patch} lang={lang} onTranslate={onTranslate} busyId={busyId} />}
            {tab === 'monitor' && <MonitorEditor content={content} patch={patch} lang={lang} />}
            {tab === 'contact' && <ContactEditor content={content} patch={patch} lang={lang} onTranslateContact={onTranslateContact} busy={busyId === 'contact'} />}
            {tab === 'texts' && <TextsEditor content={content} patch={patch} lang={lang} />}

            {/* Блоки из корпоративной презентации. Правятся универсальным
                редактором: он сам разбирает структуру данных, поэтому новые
                поля появляются в админке без правок кода. */}
            {tab === 'company' && (
              <GenericEditor
                title="О компании"
                hint="Подзаголовок, вступление, миссия «к чему стремимся», опоры группы, блок «Один партнёр» и локальный контур в Узбекистане."
                value={content.COMPANY}
                onChange={(v) => patch((c) => { c.COMPANY = v; })}
                lang={lang} onTranslate={translateField} translating={busyId === 'field'} adminKey={key}
              />
            )}
            {tab === 'directions' && (
              <div className="space-y-8">
                <GenericEditor
                  title="Направления деятельности"
                  hint="Семь направлений группы — карточки на главной странице."
                  value={content.DIRECTIONS}
                  onChange={(v) => patch((c) => { c.DIRECTIONS = v; })}
                  lang={lang} onTranslate={translateField} translating={busyId === 'field'} adminKey={key}
                />
                <GenericEditor
                  title="Цифры компании"
                  hint="Четыре показателя под блоком «О компании». Числа на сайте набегают при появлении на экране."
                  value={content.COMPANY_STATS}
                  onChange={(v) => patch((c) => { c.COMPANY_STATS = v; })}
                  lang={lang} onTranslate={translateField} translating={busyId === 'field'} adminKey={key}
                />
              </div>
            )}
            {tab === 'cases' && (
              <GenericEditor
                title="Задачи заказчика"
                hint="Проблема клиента и услуга, которая её закрывает. Показывается на странице «Задачи» и в разделе «Услуги». Поле link — куда ведёт кнопка: product-<id>, card-directions-<id> или название страницы."
                value={content.SERVICE_CASES}
                onChange={(v) => patch((c) => { c.SERVICE_CASES = v; })}
                lang={lang} onTranslate={translateField} translating={busyId === 'field'} adminKey={key}
              />
            )}
            {tab === 'portfolio' && (
              <div className="space-y-8">
              <GenericEditor
                title="Продуктовая линейка"
                hint="Девять продуктов группы. Каждый открывается отдельной страницей: состав, области применения и референсы."
                value={content.PORTFOLIO}
                onChange={(v) => patch((c) => { c.PORTFOLIO = v; })}
                lang={lang} onTranslate={translateField} translating={busyId === 'field'} adminKey={key}
              />
              <GenericEditor
                title="Варианты исполнения комплексов"
                hint="Пять сценариев контроля. Показываются на странице продукта «W-SPACE и URALAN»."
                value={content.FORM_FACTORS}
                onChange={(v) => patch((c) => { c.FORM_FACTORS = v; })}
                lang={lang} onTranslate={translateField} translating={busyId === 'field'} adminKey={key}
              />
              <GenericEditor
                title="Особенности ПО комплексов"
                hint="Девять возможностей программного обеспечения."
                value={content.SOFTWARE_FEATURES}
                onChange={(v) => patch((c) => { c.SOFTWARE_FEATURES = v; })}
                lang={lang} onTranslate={translateField} translating={busyId === 'field'} adminKey={key}
              />
              </div>
            )}
            {tab === 'engagement' && (
              <GenericEditor
                title="Модели сотрудничества"
                hint="Таблица «Роль OLAN в проектах партнёров»."
                value={content.ENGAGEMENT_MODELS}
                onChange={(v) => patch((c) => { c.ENGAGEMENT_MODELS = v; })}
                lang={lang} onTranslate={translateField} translating={busyId === 'field'} adminKey={key}
              />
            )}
            {tab === 'workflow' && (
              <GenericEditor
                title="Этапы проекта и сервис по SLA"
                hint="Десять этапов от обследования до интеграции, а также блок эксплуатации."
                value={content.WORKFLOW}
                onChange={(v) => patch((c) => { c.WORKFLOW = v; })}
                lang={lang} onTranslate={translateField} translating={busyId === 'field'} adminKey={key}
              />
            )}
            {tab === 'team' && (
              <GenericEditor
                title="Команда"
                hint="Состав команды, профессиональные компетенции и принципы работы."
                value={content.TEAM}
                onChange={(v) => patch((c) => { c.TEAM = v; })}
                lang={lang} onTranslate={translateField} translating={busyId === 'field'} adminKey={key}
              />
            )}
          </>
        )}
        {!isStaffTab && (
          <div className="mt-8 text-center text-xs text-slate-600">
            «Сохранить» записывает изменения прямо в <code className="text-slate-500">apps/site/src/app/data/siteData.js</code>.<br />
            Правки в этом файле из VSCode подхватываются админкой автоматически.
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
