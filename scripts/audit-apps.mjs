// Прогон всех четырёх приложений в браузерном окружении.
//
// Сборка не ловит обращения к несуществующим функциям: для неё это просто
// глобальные имена. Такая ошибка роняет страницу целиком, и посетитель
// видит пустой экран. Поэтому запускаем каждое приложение по-настоящему
// и смотрим, что оно отрисовало и что написало в консоль.
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { JSDOM, VirtualConsole } from 'jsdom';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP = '/tmp/audit';
fs.mkdirSync(TMP, { recursive: true });

const APPS = [
  { name: 'сайт', entry: 'apps/site/src/main.jsx', html: 'apps/site/dist/index.html' },
  { name: 'админ-панель', entry: 'apps/admin/src/main.jsx', html: 'apps/admin/dist/index.html' },
  { name: 'кабинет оператора', entry: 'apps/operator/src/main.jsx', html: 'apps/operator/dist/index.html' },
  { name: 'кабинет менеджера', entry: 'apps/manager/src/main.jsx', html: 'apps/manager/dist/index.html' },
];

// Контент берём прямо из проекта: скрипт не должен зависеть от запущенного
// сервера, иначе им не получится проверить сборку перед деплоем.
const siteData = await import(`file://${ROOT}/apps/site/src/app/data/siteData.js`);
const content = Object.fromEntries(Object.entries(siteData).filter(([k]) => k === k.toUpperCase()));
let failed = 0;

for (const app of APPS) {
  const out = `${TMP}/${app.entry.split('/')[1]}.js`;
  try {
    execSync(
      `npx esbuild ${app.entry} --bundle --format=iife --jsx=automatic --outfile=${out} `
      + `--loader:.css=empty --loader:.js=jsx --define:process.env.NODE_ENV='"production"' --log-level=error`,
      { cwd: ROOT, stdio: 'pipe' },
    );
  } catch (e) {
    console.log(`✗ ${app.name}: не собирается\n  ${String(e.stderr || e).slice(0, 300)}`);
    failed += 1;
    continue;
  }

  const errors = [];
  const vc = new VirtualConsole();
  // Отсутствие canvas — ограничение jsdom, в браузере его нет.
  vc.on('jsdomError', (e) => { if (!String(e.message).includes('getContext')) errors.push(String(e.message)); });
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

  const dom = new JSDOM(fs.readFileSync(`${ROOT}/${app.html}`, 'utf8'), {
    runScripts: 'dangerously', url: 'https://olan.uz/', pretendToBeVisual: true, virtualConsole: vc,
  });
  const { window } = dom;
  window.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });
  // Пустой наблюдатель. Пробовал сразу сообщать «элемент виден», чтобы
  // отрисовались и секции, появляющиеся при прокрутке, — но так ломаются
  // анимации появления, и страницы выходит меньше, а не больше.
  window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.scrollTo = () => {};
  window.fetch = async (u) => ({
    ok: true, status: 200,
    json: async () => (String(u).includes('/api/content') ? content : { chats: [], requests: [], operators: [], messages: [] }),
  });

  try { window.eval(fs.readFileSync(out, 'utf8')); }
  catch (e) { errors.push('падение при запуске: ' + (e.stack || e.message).split('\n').slice(0, 2).join(' ')); }

  await new Promise((r) => { setTimeout(r, 1200); });

  const root = window.document.getElementById('root');
  const size = root ? root.innerHTML.length : 0;
  const ok = size > 500 && errors.length === 0;
  if (!ok) failed += 1;
  console.log(`${ok ? '✓' : '✗'} ${app.name}: отрисовано ${size} символов, ошибок ${errors.length}`);
  errors.slice(0, 2).forEach((e) => console.log(`    → ${e.split('\n')[0].slice(0, 160)}`));
}

// ---------------------------------------------------------------------------
// Доходят ли правки из админ-панели до страницы.
//
// Сайт рисуется дважды: сперва со встроенным контентом, затем — с тем,
// что пришло с сервера. Если второй шаг ломается, страница выглядит целой,
// но показывает старое, и человек видит «в админке меняю, на сайте ничего».
// Ровно так один раз и случилось. Поэтому подменяем два поля метками и
// проверяем, что обе появились в разметке.
//
// Метки взяты по разные стороны от середины функции applyServerContent:
// первая — из начала списка, вторая — из конца. Поломка в середине
// пропустила бы первую и срезала вторую.
{
  const marked = JSON.parse(JSON.stringify(content));
  const HEAD = 'МЕТКА-НАЧАЛО-СПИСКА';
  const TAIL = 'МЕТКА-КОНЕЦ-СПИСКА';
  if (marked.BENEFITS && marked.BENEFITS[0]) marked.BENEFITS[0].title = { ru: HEAD, en: HEAD, uz: HEAD, zh: HEAD, ar: HEAD, uk: HEAD };
  if (marked.MONITOR) marked.MONITOR.title = { ru: TAIL, en: TAIL, uz: TAIL, zh: TAIL, ar: TAIL, uk: TAIL };

  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { if (!String(e.message).includes('getContext')) errors.push(String(e.message)); });
  vc.on('error', (...a) => errors.push(a.join(' ')));

  const dom = new JSDOM(fs.readFileSync(`${ROOT}/apps/site/dist/index.html`, 'utf8'), {
    runScripts: 'dangerously', url: 'https://olan.uz/', pretendToBeVisual: true, virtualConsole: vc,
  });
  const { window } = dom;
  window.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });
  // Пустой наблюдатель. Пробовал сразу сообщать «элемент виден», чтобы
  // отрисовались и секции, появляющиеся при прокрутке, — но так ломаются
  // анимации появления, и страницы выходит меньше, а не больше.
  window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.scrollTo = () => {};
  window.fetch = async (u) => ({ ok: true, status: 200, json: async () => (String(u).includes('/api/content') ? marked : {}) });

  window.eval(fs.readFileSync(`${TMP}/site.js`, 'utf8'));
  await new Promise((r) => { setTimeout(r, 1500); });

  const html = window.document.getElementById('root')?.innerHTML || '';
  const headOk = html.includes(HEAD);
  const tailOk = html.includes(TAIL);
  if (!headOk || !tailOk) failed += 1;
  console.log(`${headOk && tailOk ? '✓' : '✗'} правки из админ-панели доходят до страницы: начало списка ${headOk ? 'да' : 'НЕТ'}, конец списка ${tailOk ? 'да' : 'НЕТ'}`);
  errors.slice(0, 2).forEach((e) => console.log(`    → ${e.split('\n')[0].slice(0, 160)}`));
}

console.log(failed ? `\nПРОБЛЕМНЫХ ПРИЛОЖЕНИЙ: ${failed}` : '\nВсе проверки пройдены.');
process.exit(failed ? 1 : 0);
