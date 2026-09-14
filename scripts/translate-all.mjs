// ---------------------------------------------------------------------------
// Разовый перевод всего сайта.
//
//   npm run translate              — заполнить пропуски на всех пяти языках
//   npm run translate -- --langs=uz,zh,ar   — только выбранные языки
//   npm run translate -- --force   — перевести заново, затерев старые переводы
//   npm run translate -- --from=en — переводить с английского, а не с русского
//
// Нужен интернет: перевод идёт через бесплатный Google Translate.
// Перед записью siteData.js складывается резервная копия в server/data/backups.
// ---------------------------------------------------------------------------

import '../server/env.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SiteDataFile } from '../server/siteDataFile.js';
import { fillMissing, countMissing, languageCodes } from '../server/translate.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const siteDataPath = process.env.SITE_DATA_FILE
  ? path.resolve(process.env.SITE_DATA_FILE)
  : path.join(rootDir, 'apps', 'site', 'src', 'app', 'data', 'siteData.js');

const file = new SiteDataFile(siteDataPath, path.join(rootDir, 'server', 'data', 'backups'));

function arg(name, fallback = '') {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : fallback;
}
const force = process.argv.includes('--force');
const from = arg('from', 'ru');

const content = await file.read();
const codes = languageCodes(content);
const targets = (arg('langs') ? arg('langs').split(',') : codes)
  .map((c) => c.trim())
  .filter((c) => c && c !== from && codes.includes(c));

if (!targets.length) {
  console.error('Не выбрано ни одного языка. Доступны:', codes.join(', '));
  process.exit(1);
}

const total = countMissing(content, { targets, source: from, force });
console.log(`[translate] Файл: ${siteDataPath}`);
console.log(`[translate] Источник: ${from} → ${targets.join(', ')}`);
console.log(`[translate] Строк к переводу: ${total}`);

if (!total) {
  console.log('[translate] Всё уже переведено, файл не менялся.');
  process.exit(0);
}

let lastShown = 0;
const started = Date.now();

const result = await fillMissing(content, {
  targets,
  source: from,
  force,
  onProgress: (done) => {
    // Печатаем не чаще, чем раз в 25 строк — иначе лог не прочитать.
    if (done - lastShown < 25 && done !== total) return;
    lastShown = done;
    const percent = Math.round((done / total) * 100);
    console.log(`[translate] ${done} / ${total} (${percent}%)`);
  },
});

file.write(content);

const seconds = Math.round((Date.now() - started) / 1000);
console.log(`[translate] Готово: ${result.translated} строк в ${result.fields} полях за ${seconds} с.`);
console.log('[translate] siteData.js перезаписан, резервная копия в server/data/backups.');
