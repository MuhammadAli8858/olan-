// ---------------------------------------------------------------------------
// Проверка сведения контента (server/contentMerge.js).
//
//   npm run audit:content
//
// Берёт каждую прошлую версию siteData.js из git как «контент на диске»
// и сводит её с текущей версией из кода. Проверяет:
//   1. нетронутая старая версия превращается ровно в текущую;
//   2. правки «из админки» поверх старой версии остаются на месте:
//      текст, перевод, загруженная картинка, новая запись, удалённая
//      запись, переставленные записи, подписи интерфейса, контакты;
//   3. повторное сведение ничего не меняет.
//
// В копии проекта без git (например, распакованной из архива) прошлых версий
// взять неоткуда: тогда проверяется только сведение текущей версии с самой
// собой и то, что история выпусков на месте.
// ---------------------------------------------------------------------------

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CONTENT_KEYS } from '../server/siteDataFile.js';
import { isLocalized, loadHistory, mergeContent } from '../server/contentMerge.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = 'apps/site/src/app/data/siteData.js';
const HISTORY = path.join(root, 'server', 'content-history.json');

const failures = [];
const fail = (message) => failures.push(message);

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().filter((k) => value[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

// Где именно расходятся два значения — для понятного сообщения.
function firstDiff(a, b, p = '') {
  if (stable(a) === stable(b)) return null;
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const d = firstDiff(a[k], b[k], `${p}.${k}`);
      if (d) return d;
    }
  }
  const short = (v) => { const s = JSON.stringify(v); return s && s.length > 120 ? `${s.slice(0, 120)}…` : s; };
  return `${p}: ${short(a)} ≠ ${short(b)}`;
}

async function loadModule(text, dir, name) {
  const file = path.join(dir, `${name}.mjs`);
  writeFileSync(file, text, 'utf8');
  const module = await import(pathToFileURL(file).href);
  const content = {};
  for (const key of CONTENT_KEYS) if (module[key] !== undefined) content[key] = structuredClone(module[key]);
  return content;
}

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });

const dir = mkdtempSync(path.join(os.tmpdir(), 'olan-merge-'));
try {
  const repo = await loadModule(readFileSync(path.join(root, DATA), 'utf8'), dir, 'current');
  const history = loadHistory(HISTORY);
  if (!history.releases.length) fail('server/content-history.json пуст или не найден — запустите npm run content:history');

  const releases = [];
  let log = null;
  try { log = git('log', '--all', '--reverse', '--format=%H\t%s', '--', DATA); } catch { log = null; }
  for (const line of (log || '').split('\n').filter(Boolean)) {
    const [hash, subject] = line.split('\t');
    let text;
    try { text = git('show', `${hash}:${DATA}`); } catch { continue; }
    releases.push({ label: (subject.match(/^OLAN\s+v[\d.,]+/i) || [hash.slice(0, 7)])[0], text });
  }

  // 0. Текущий контент сводится сам с собой без изменений.
  {
    const { content } = mergeContent(structuredClone(repo), repo, history);
    const d = firstDiff(content, repo);
    if (d) fail(`текущая версия → текущая: ${d}`);
  }

  let checked = 0;
  for (const [index, release] of releases.entries()) {
    let disk;
    try { disk = await loadModule(release.text, dir, `r${index}`); } catch { continue; }
    checked += 1;

    // 1. Нетронутая старая версия → ровно текущая.
    const plain = mergeContent(structuredClone(disk), repo, history);
    const d1 = firstDiff(plain.content, repo);
    if (d1) fail(`${release.label} без правок: ${d1}`);

    // 2. Правки «из админки».
    const edited = structuredClone(disk);
    const expect = [];

    const pick = (list, test) => (Array.isArray(list) ? list.find(test) : null);
    const shared = (key) => (Array.isArray(edited[key]) && Array.isArray(repo[key])
      ? edited[key].filter((x) => x && x.id && repo[key].some((y) => y.id === x.id)) : []);

    // а) Русский текст продукта поправили.
    const product = pick(edited.PORTFOLIO, (p) => isLocalized(p.title) && repo.PORTFOLIO.some((q) => q.id === p.id));
    if (product) {
      product.title = { ...product.title, ru: `${product.title.ru} — правка` };
      const value = structuredClone(product.title);
      expect.push(['заголовок продукта', (c) => c.PORTFOLIO.find((p) => p.id === product.id)?.title, value]);
    }
    // б) Загрузили свою картинку.
    const card = pick(edited.PRODUCTS, (p) => p.id && repo.PRODUCTS.some((q) => q.id === p.id));
    if (card) {
      card.image = '/uploads/admin-photo.webp';
      expect.push(['картинка из админки', (c) => c.PRODUCTS.find((p) => p.id === card.id)?.image, '/uploads/admin-photo.webp']);
    }
    // в) Поправили только перевод там, где русский текст в коде не менялся.
    const faq = shared('FAQ_ITEMS').find((x) => isLocalized(x.question)
      && repo.FAQ_ITEMS.find((y) => y.id === x.id).question.ru === x.question.ru && x.question.en);
    if (faq) {
      faq.question = { ...faq.question, en: `${faq.question.en} (edited)` };
      expect.push(['перевод из админки', (c) => c.FAQ_ITEMS.find((x) => x.id === faq.id)?.question?.en, faq.question.en]);
    }
    // г) Добавили запись.
    if (Array.isArray(edited.FAQ_ITEMS) && edited.FAQ_ITEMS.length > 1) {
      const fresh = { id: 'new-test1', question: { ru: 'Новый вопрос' }, answer: { ru: 'Ответ' } };
      const after = edited.FAQ_ITEMS[0].id;
      edited.FAQ_ITEMS.splice(1, 0, fresh);
      expect.push(['новая запись', (c) => c.FAQ_ITEMS.find((x) => x.id === 'new-test1'), fresh]);
      expect.push(['новая запись на своём месте', (c) => {
        const i = c.FAQ_ITEMS.findIndex((x) => x.id === 'new-test1');
        return i > 0 ? c.FAQ_ITEMS[i - 1].id : null;
      }, after]);
    }
    // д) Удалили запись, которая есть и в коде.
    const removable = shared('TESTIMONIALS');
    if (removable.length > 2) {
      const gone = removable[removable.length - 1].id;
      edited.TESTIMONIALS = edited.TESTIMONIALS.filter((x) => x.id !== gone);
      expect.push(['удалённая запись не вернулась', (c) => c.TESTIMONIALS.some((x) => x.id === gone), false]);
    }
    // е) Переставили записи.
    const movable = shared('BENEFITS');
    if (movable.length > 2) {
      const a = edited.BENEFITS.indexOf(movable[0]);
      const b = edited.BENEFITS.indexOf(movable[1]);
      [edited.BENEFITS[a], edited.BENEFITS[b]] = [edited.BENEFITS[b], edited.BENEFITS[a]];
      const order = edited.BENEFITS.map((x) => x.id).filter((id) => repo.BENEFITS.some((y) => y.id === id));
      expect.push(['порядок из админки', (c) => c.BENEFITS.map((x) => x.id).filter((id) => order.includes(id)).join(), order.join()]);
    }
    // ж) Подпись интерфейса.
    if (edited.UI_TEXT?.en?.nav && typeof edited.UI_TEXT.en.nav === 'object') {
      const key = Object.keys(edited.UI_TEXT.en.nav).find((k) => typeof edited.UI_TEXT.en.nav[k] === 'string');
      if (key) {
        edited.UI_TEXT.en.nav[key] = 'Edited label';
        expect.push(['подпись интерфейса', (c) => c.UI_TEXT.en.nav[key], 'Edited label']);
      }
    }
    // з) Контакты.
    if (edited.CONTACT_INFO && typeof edited.CONTACT_INFO === 'object') {
      edited.CONTACT_INFO.phone = '+998 00 000 00 00';
      expect.push(['контакты', (c) => c.CONTACT_INFO.phone, '+998 00 000 00 00']);
    }

    const merged = mergeContent(structuredClone(edited), repo, history);
    for (const [name, get, value] of expect) {
      let got;
      try { got = get(merged.content); } catch (error) { got = `ошибка: ${error.message}`; }
      if (stable(got) !== stable(value)) fail(`${release.label}, ${name}: ${JSON.stringify(got)?.slice(0, 140)} ≠ ${JSON.stringify(value)?.slice(0, 140)}`);
    }
    // Всё, что в админке не трогали, — как в коде.
    const productInfo = (c) => (c.PORTFOLIO || []).map((p) => ({ ...p, title: undefined }));
    const d2 = firstDiff(productInfo(merged.content), productInfo(repo));
    if (d2) fail(`${release.label} с правками, продукты: ${d2}`);
    for (const key of ['COMPANY', 'COMPANY_STATS', 'SERVICE_CASES', 'HOME_RAIL', 'DIRECTIONS']) {
      const d = firstDiff(merged.content[key], repo[key]);
      if (d) fail(`${release.label} с правками, ${key}: ${d}`);
    }

    // 3. Повторное сведение ничего не меняет.
    const again = mergeContent(structuredClone(merged.content), repo, history);
    const d3 = firstDiff(again.content, merged.content);
    if (d3) fail(`${release.label}, повторное сведение: ${d3}`);
  }

  if (!releases.length) console.log('Прошлых версий в git нет (копия без git) — проверена только текущая.');
  else if (!checked) fail('ни одна прошлая версия из git не загрузилась');
  else console.log(`Проверено версий: ${checked}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`\nОшибок: ${failures.length}`);
  for (const f of failures.slice(0, 60)) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('Сведение контента: всё в порядке.');
