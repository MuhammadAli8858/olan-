// Проход по всем разделам админ-панели.
//
// Входим, открываем каждую вкладку по очереди и проверяем три вещи:
// раздел отрисовался, в консоли нет ошибок, а многоязычные поля показаны
// одной строкой ввода, а не вложенным объектом с шестью сырыми полями.
// Последнее — ровно та поломка, из-за которой «Продукты группы» и соседние
// разделы превращались в простыню.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP = '/tmp/audit';
fs.mkdirSync(TMP, { recursive: true });

const siteData = await import(`file://${ROOT}/apps/site/src/app/data/siteData.js`);
const content = Object.fromEntries(Object.entries(siteData).filter(([k]) => k === k.toUpperCase()));

const TABS = [
  'Приборы', 'Решения', 'Наши проекты', 'Преимущества', 'Как купить', 'Частые вопросы',
  'Страница «О нас»', 'Контакты', 'Мониторинг', 'Тексты сайта', 'Профиль компании',
  'Направления', 'Задачи заказчика', 'Продукты группы', 'Модели работы', 'Этапы и SLA', 'Команда',
];

const out = `${TMP}/admin-tabs.js`;
execSync(
  `npx esbuild apps/admin/src/main.jsx --bundle --format=iife --jsx=automatic --outfile=${out} `
  + `--loader:.css=empty --loader:.js=jsx --define:process.env.NODE_ENV='"production"' --log-level=error`,
  { cwd: ROOT, stdio: 'pipe' },
);

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => { if (!String(e.message).includes('getContext')) errors.push(String(e.message)); });
vc.on('error', (...a) => errors.push(a.join(' ')));

const dom = new JSDOM(fs.readFileSync(`${ROOT}/apps/admin/dist/index.html`, 'utf8'), {
  runScripts: 'dangerously', url: 'https://olan.uz/admin/', pretendToBeVisual: true, virtualConsole: vc,
});
const { window } = dom;
window.localStorage.setItem('olan-admin-key', 'audit');
window.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });
window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
window.scrollTo = () => {};
window.confirm = () => true;
window.fetch = async (u) => {
  const url = String(u);
  let body = {};
  if (url.includes('/api/content/version')) body = { version: 1 };
  else if (url.includes('/api/content')) body = content;
  else if (url.includes('/api/admin/users')) body = { managers: [], orphanOperators: [] };
  else if (url.includes('/api/inbox/operators')) body = { operators: [], totals: {} };
  else if (url.includes('/api/admin/translate/status')) body = { auto: 0, manual: 0, job: {} };
  else if (url.includes('/api/admin/publish/status')) body = { configured: false, local: true };
  return { ok: true, status: 200, json: async () => body };
};

window.eval(fs.readFileSync(out, 'utf8'));
await new Promise((r) => { setTimeout(r, 1200); });

const doc = window.document;
let failed = 0;

for (const label of TABS) {
  const before = errors.length;
  const button = [...doc.querySelectorAll('button')].find((b) => b.textContent.trim() === label);
  if (!button) { console.log(`✗ ${label}: кнопки нет в меню`); failed += 1; continue; }
  button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => { setTimeout(r, 250); });

  // Раскрываем первую запись раздела: поломки внутри свёрнутых записей
  // в исходном виде страницы просто не видны.
  const firstRow = [...doc.querySelectorAll('main button')].find((b) => b.className.includes('text-left'));
  if (firstRow) {
    firstRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => { setTimeout(r, 200); });
  }
  doc.querySelectorAll('main details').forEach((d) => { d.open = true; });
  await new Promise((r) => { setTimeout(r, 100); });

  const main = doc.querySelector('main') || doc.getElementById('root');
  const size = main ? main.innerHTML.length : 0;
  const tabErrors = errors.slice(before);

  // Многоязычное поле, нарисованное как вложенный объект, выдаёт себя
  // полями с подписями ru/en/uz внутри раскрывающегося блока.
  const rawLang = [...doc.querySelectorAll('label')].filter((l) => /^(ru|en|uz|zh|ar|uk)$/i.test(l.textContent.trim())).length;

  // В разделах с картинками у поля загрузки должна стоять подсказка,
  // какого размера фото нужно, — иначе загружают что попало и сайт режет края.
  const needsHint = ['Приборы', 'Наши проекты', 'Направления', 'Продукты группы', 'Профиль компании'].includes(label);
  const hasHint = (main ? main.textContent : '').includes('Нужный размер');

  const ok = size > 800 && tabErrors.length === 0 && rawLang === 0 && (!needsHint || hasHint);
  if (!ok) failed += 1;
  const notes = [];
  if (tabErrors.length) notes.push(`ошибок ${tabErrors.length}`);
  if (rawLang) notes.push(`сырых языковых полей ${rawLang}`);
  if (needsHint) notes.push(hasHint ? 'подсказка размера есть' : 'НЕТ ПОДСКАЗКИ РАЗМЕРА');
  console.log(`${ok ? '✓' : '✗'} ${label}${notes.length ? ' — ' + notes.join(', ') : ''}`);
  tabErrors.slice(0, 1).forEach((e) => console.log(`    → ${e.split('\n')[0].slice(0, 150)}`));
}

// ---------------------------------------------------------------------------
// Превью картинок в режиме разработки.
//
// Админка при разработке открыта на порту 9000, а картинки раздаёт сервер
// на 3001. Превью обязано брать файл с сервера — иначе битая иконка, и
// кажется, что загрузка не работает. Открываем «Наши проекты» с адреса
// разработки и смотрим, откуда реально грузится картинка.
{
  const devDom = new JSDOM(fs.readFileSync(`${ROOT}/apps/admin/dist/index.html`, 'utf8'), {
    runScripts: 'dangerously', url: 'http://localhost:9000/admin/', pretendToBeVisual: true, virtualConsole: new VirtualConsole(),
  });
  const w = devDom.window;
  w.localStorage.setItem('olan-admin-key', 'audit');
  w.matchMedia = window.matchMedia; w.IntersectionObserver = window.IntersectionObserver;
  w.ResizeObserver = window.ResizeObserver; w.scrollTo = () => {}; w.confirm = () => true;
  w.fetch = window.fetch;
  w.eval(fs.readFileSync(out, 'utf8'));
  await new Promise((r) => { setTimeout(r, 1000); });
  const tab = [...w.document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Наши проекты');
  tab.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => { setTimeout(r, 250); });
  w.document.querySelectorAll('main details').forEach((d) => { d.open = true; });
  await new Promise((r) => { setTimeout(r, 150); });
  const img = w.document.querySelector('main img');
  const src = img ? img.getAttribute('src') : '';
  const ok = src.startsWith('http://localhost:3001/');
  if (!ok) failed += 1;
  console.log(`${ok ? '✓' : '✗'} превью картинок берётся с сервера: ${src || '(картинки нет)'}`);
}

console.log(failed ? `\nПРОБЛЕМНЫХ РАЗДЕЛОВ: ${failed}` : `\nВсе ${TABS.length} разделов админ-панели открываются без ошибок.`);
process.exit(failed ? 1 : 0);
