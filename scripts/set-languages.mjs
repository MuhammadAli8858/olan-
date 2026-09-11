// Оставляет пять языков: русский, английский, узбекский, китайский, арабский.
// Украинский, казахский и белорусский удаляются из всех многоязычных полей.

import { SiteDataFile } from '../server/siteDataFile.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = new SiteDataFile(
  path.join(rootDir, 'apps', 'site', 'src', 'app', 'data', 'siteData.js'),
  path.join(rootDir, 'server', 'data', 'backups'),
);

const KEEP = ['ru', 'en', 'uz', 'zh', 'ar'];
const DROP = ['uk', 'kk', 'be'];
const ALL = new Set([...KEEP, ...DROP]);

const OPTIONS = [
  { code: 'ru', label: 'Русский', short: 'RU' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'uz', label: "O'zbekcha", short: 'UZ' },
  { code: 'zh', label: '中文', short: 'ZH' },
  { code: 'ar', label: 'العربية', short: 'AR' },
];

// Многоязычное значение: объект, все ключи которого — коды языков.
function isLocalized(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((k) => ALL.has(k));
}

let cleaned = 0;

function walk(value) {
  if (Array.isArray(value)) { value.forEach(walk); return; }
  if (!value || typeof value !== 'object') return;

  if (isLocalized(value)) {
    for (const code of DROP) {
      if (code in value) { delete value[code]; cleaned += 1; }
    }
    return;
  }
  Object.values(value).forEach(walk);
}

const content = await file.read();

// Блок UI_TEXT устроен иначе: язык — ключ верхнего уровня.
if (content.UI_TEXT) {
  for (const code of DROP) {
    if (content.UI_TEXT[code]) { delete content.UI_TEXT[code]; cleaned += 1; }
  }
  // Арабский пока берёт английские строки как основу — их можно
  // перевести в админ-панели кнопкой перевода.
  if (!content.UI_TEXT.ar && content.UI_TEXT.en) {
    content.UI_TEXT.ar = structuredClone(content.UI_TEXT.en);
  }
}

for (const [key, value] of Object.entries(content)) {
  if (key === 'UI_TEXT' || key === 'LANGUAGE_OPTIONS') continue;
  walk(value);
}

content.LANGUAGE_OPTIONS = OPTIONS;

file.write(content);
console.log(`Языки: ${KEEP.join(', ')}`);
console.log(`Удалено языковых полей: ${cleaned}`);
