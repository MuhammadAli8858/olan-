// ---------------------------------------------------------------------------
// Собирает server/content-history.json — отпечатки всех выпусков контента.
//
//   npm run content:history            дописать новые версии к истории
//   npm run content:history -- --fresh собрать историю заново из git
//   npm run content:history -- --check проверить, что текущий контент в ней есть
//
// Зачем. На хостинге контент живёт на постоянном диске, и при деплое сервер
// сводит его с новой версией из кода (server/contentMerge.js). Чтобы отличить
// правку из админки от старого текста из прошлой версии, серверу нужно знать
// все прошлые версии. Их и собирает этот скрипт: берёт уже собранную историю,
// добавляет версии файла apps/site/src/app/data/siteData.js из git и текущий
// файл. Версии только добавляются — даже в копии проекта без git история
// не теряется.
//
// Запускать после каждого изменения siteData.js перед выпуском версии.
// Забыли — не страшно: сервер запомнит новую версию сам при первом запуске,
// просто правки, сделанные до этого, он будет сравнивать с меньшим набором.
// ---------------------------------------------------------------------------

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CONTENT_KEYS } from '../server/siteDataFile.js';
import { addRelease, emptyHistory, historyToJson, mergeHistoryJson } from '../server/contentMerge.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = 'apps/site/src/app/data/siteData.js';
const OUT = path.join(root, 'server', 'content-history.json');
const checkOnly = process.argv.includes('--check');
const fresh = process.argv.includes('--fresh');

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
const readJson = (file) => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };

const current = readFileSync(path.join(root, DATA), 'utf8');
const currentHash = sha256(current);

if (checkOnly) {
  // Проверка для аудита: есть ли текущий контент в собранной истории.
  const json = readJson(OUT);
  const ok = Boolean(json && Array.isArray(json.releases) && json.releases.some((r) => r.hash === currentHash));
  console.log(ok
    ? `История контента актуальна: ${json.releases.length} выпусков.`
    : 'История контента устарела: запустите npm run content:history.');
  process.exit(ok ? 0 : 1);
}

// Уже собранная история — её не теряем.
const history = emptyHistory();
const previous = fresh ? null : readJson(OUT);
if (previous) mergeHistoryJson(history, previous);
const known = new Map(history.releases.map((r) => [r.hash, r]));

// Версии файла из git, от старых к новым.
const versions = [];
let log = '';
try {
  log = git('log', '--all', '--reverse', '--format=%H\t%ad\t%s', '--date=short', '--', DATA);
} catch {
  console.warn('git недоступен — добавляю только текущий файл.');
}
for (const line of log.split('\n').filter(Boolean)) {
  const [hash, date, ...subject] = line.split('\t');
  let text;
  try { text = git('show', `${hash}:${DATA}`); } catch { continue; }
  const title = subject.join('\t');
  const label = (title.match(/^OLAN\s+v([\d.,]+)/i) || [])[1];
  versions.push({ label: label ? `v${label.replace(',', '.')}` : hash.slice(0, 7), named: Boolean(label), date, text });
}
const pkg = readJson(path.join(root, 'package.json')) || {};
versions.push({ label: `v${pkg.version || '0.0.0'}`, named: true, date: new Date().toISOString().slice(0, 10), text: current });

const dir = mkdtempSync(path.join(os.tmpdir(), 'olan-history-'));
let added = 0;
try {
  for (const version of versions) {
    const hash = sha256(version.text);
    if (known.has(hash)) {
      // Тот же файл в другом коммите: оставляем понятное имя выпуска
      // («v49»), а не номер промежуточного коммита.
      const release = known.get(hash);
      if (version.named && !/^v\d/.test(release.label || '')) Object.assign(release, { label: version.label, date: version.date });
      continue;
    }
    const file = path.join(dir, `${hash.slice(0, 16)}.mjs`);
    writeFileSync(file, version.text, 'utf8');
    let module;
    try {
      module = await import(pathToFileURL(file).href);
    } catch (error) {
      console.warn(`  ${version.label}: файл не читается, пропускаю (${error.message.split('\n')[0]})`);
      continue;
    }
    const content = {};
    for (const key of CONTENT_KEYS) if (module[key] !== undefined) content[key] = module[key];
    const release = { label: version.label, hash, date: version.date };
    addRelease(history, content, release);
    known.set(hash, release);
    added += 1;
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

history.releases = history.releases.map(({ label, hash, date }) => ({ label, hash, date }));
const json = historyToJson(history);
writeFileSync(OUT, `${JSON.stringify(json)}\n`, 'utf8');
const size = Buffer.byteLength(JSON.stringify(json));
console.log(`${previous ? 'Дописано' : 'Собрано'} выпусков: ${added}, всего ${json.releases.length} (${json.releases.map((r) => r.label).join(', ')})`);
console.log(`Значений: ${Object.keys(json.values).length}, записей: ${Object.keys(json.items).length}, размер ${(size / 1024).toFixed(0)} КБ`);
console.log(`Записано: ${path.relative(root, OUT)}`);
