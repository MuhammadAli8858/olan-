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

console.log(failed ? `\nПРОБЛЕМНЫХ ПРИЛОЖЕНИЙ: ${failed}` : '\nВсе четыре приложения запускаются без ошибок.');
process.exit(failed ? 1 : 0);
