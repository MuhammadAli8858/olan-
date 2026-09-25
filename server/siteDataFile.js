// ---------------------------------------------------------------------------
// Двусторонняя связь между админ-панелью и исходным кодом сайта.
//
//   siteData.js  --(читаем)-->  JSON  --> админ-панель
//   админ-панель --(сохраняем)--> JSON --> siteData.js
//
// Файл apps/site/src/app/data/siteData.js является ЕДИНСТВЕННЫМ источником
// правды. Правите руками в VSCode — админка это подхватит. Правите в админке —
// файл будет перезаписан, а Vite сделает горячую перезагрузку сайта.
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Ключи, которыми управляет админ-панель. Порядок = порядок в файле.
export const CONTENT_KEYS = [
  'LANGUAGE_OPTIONS',
  'UI_TEXT',
  'ABOUT_FEATURES',
  'BENEFITS',
  'PROCESS_STEPS',
  'TESTIMONIALS',
  'FAQ_ITEMS',
  'PRODUCTS',
  'CONTACT_INFO',
  'VIOLATION_SOLUTIONS',
  'PROJECTS',
  // Блоки из презентации компании
  'COMPANY',
  'COMPANY_STATS',
  'DIRECTIONS',
  'PORTFOLIO',
  'ENGAGEMENT_MODELS',
  'WORKFLOW',
  'TEAM',
  'SOFTWARE_FEATURES',
  'FORM_FACTORS',
  'SERVICE_CASES',
  // Блок «Комплексы на связи» на главной
  'MONITOR',
  // Баннеры первого экрана главной страницы
  'HERO_SLIDES',
];

const FILE_HEADER = `// ---------------------------------------------------------------------------
// Контент сайта OLAN HIGH TECH.
//
// Этот файл можно править двумя способами, результат одинаковый:
//   1) руками прямо здесь, в VSCode — админ-панель увидит изменения сама;
//   2) через админ-панель (http://localhost:9000) — она перезапишет этот файл.
//
// Структура: многоязычные поля задаются объектом { ru, uz, en, uk, zh, kk, be }.
// Резервные копии перед каждой записью лежат в server/data/backups/.
// ---------------------------------------------------------------------------

`;

const DEFAULT_FOOTER = `
export function localize(value, language) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return value;
  return value[language] ?? value.ru ?? Object.values(value)[0] ?? '';
}
`;

// ------------------------------- сериализация -------------------------------

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
// Обычные объекты/массивы схлопываются в одну строку, если помещаются.
const INLINE_LIMIT = 150;
// Плоские объекты вроде { ru: '…', uz: '…', en: '…' } держим в одну строку
// даже если они длинные — так файл выглядит как исходный и его удобно править.
const FLAT_INLINE_LIMIT = 420;

function isFlat(value) {
  return Object.values(value).every((v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean');
}

function quote(str) {
  return `'${String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')}'`;
}

function serialize(value, depth = 0) {
  const pad = '  '.repeat(depth);
  const padInner = '  '.repeat(depth + 1);

  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const parts = value.map((item) => serialize(item, depth + 1));
    const inline = `[${parts.join(', ')}]`;
    if (!inline.includes('\n') && inline.length + pad.length <= INLINE_LIMIT) return inline;
    return `[\n${parts.map((p) => padInner + p).join(',\n')},\n${pad}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => typeof v !== 'function' && v !== undefined);
    if (entries.length === 0) return '{}';
    const parts = entries.map(([k, v]) => {
      const keyText = IDENTIFIER.test(k) ? k : quote(k);
      return `${keyText}: ${serialize(v, depth + 1)}`;
    });
    const inline = `{ ${parts.join(', ')} }`;
    const limit = isFlat(value) ? FLAT_INLINE_LIMIT : INLINE_LIMIT;
    if (!inline.includes('\n') && inline.length + pad.length <= limit) return inline;
    return `{\n${parts.map((p) => padInner + p).join(',\n')},\n${pad}}`;
  }

  return 'null';
}

// ------------------------------ чтение / запись ------------------------------

export class SiteDataFile {
  constructor(filePath, backupsDir) {
    this.filePath = filePath;
    this.backupsDir = backupsDir;
    this.cache = null;
    this.cacheStamp = '';
    // Версия меняется при любом изменении файла — по ней админка понимает,
    // что контент отредактировали в коде, и подтягивает свежие данные.
    this.version = 0;
    this.lastSeenStamp = '';
    if (backupsDir) mkdirSync(backupsDir, { recursive: true });
  }

  exists() {
    return existsSync(this.filePath);
  }

  stamp() {
    try {
      const s = statSync(this.filePath);
      return `${s.mtimeMs}:${s.size}`;
    } catch {
      return '';
    }
  }

  // Меняется ли файл прямо сейчас? Возвращает true, если версия выросла.
  refreshVersion() {
    const current = this.stamp();
    if (current !== this.lastSeenStamp) {
      this.lastSeenStamp = current;
      this.version += 1;
      return true;
    }
    return false;
  }

  // Читает siteData.js как ES-модуль и достаёт из него данные.
  //
  // Файл правят руками в редакторе, и в момент правки он почти всегда
  // сломан: недописанная кавычка, лишняя запятая. Раньше такая секунда
  // роняла весь сайт — сервер отвечал ошибкой, и посетитель видел пустую
  // страницу. Теперь при неудачном чтении отдаём последнюю рабочую
  // версию и пишем причину в лог: сайт продолжает работать, а правка
  // применится, как только файл снова станет целым.
  async read() {
    const current = this.stamp();
    if (this.cache && current === this.cacheStamp) return this.cache;

    const url = `${pathToFileURL(this.filePath).href}?v=${encodeURIComponent(current || Date.now())}`;
    let module;
    try {
      module = await import(url);
    } catch (error) {
      if (this.cache) {
        if (this.brokenStamp !== current) {
          this.brokenStamp = current;
          console.warn(`[content] В siteData.js ошибка, показываем прошлую версию: ${error.message.split('\n')[0]}`);
        }
        return this.cache;
      }
      throw error;
    }

    const content = {};
    for (const key of CONTENT_KEYS) {
      if (module[key] !== undefined) content[key] = module[key];
    }
    // structuredClone, чтобы наружу не утекали ссылки на объекты модуля.
    this.cache = structuredClone(content);
    this.cacheStamp = current;
    this.brokenStamp = null;
    return this.cache;
  }

  // Сохраняет то, что пришло из админ-панели, обратно в siteData.js.
  write(content) {
    const footer = this.readFooter();
    const body = CONTENT_KEYS
      .filter((key) => content[key] !== undefined)
      .map((key) => `export const ${key} = ${serialize(content[key], 0)};`)
      .join('\n\n');

    this.backup();
    writeFileSync(this.filePath, `${FILE_HEADER}${body}\n${footer}`, 'utf8');
    this.cache = structuredClone(content);
    this.cacheStamp = this.stamp();
    this.lastSeenStamp = this.cacheStamp;
    this.version += 1;
  }

  // Всё, что идёт после данных (функция localize и прочие хелперы), сохраняем
  // как есть — чтобы запись из админки не стёрла ручной код.
  readFooter() {
    try {
      const source = readFileSync(this.filePath, 'utf8');
      const marker = source.search(/^export\s+(function|const)\s+localize\b/m);
      if (marker !== -1) return `\n${source.slice(marker)}`;
    } catch {
      /* файла ещё нет */
    }
    return DEFAULT_FOOTER;
  }

  backup(limit = 20) {
    if (!this.backupsDir || !this.exists()) return;
    try {
      const name = `siteData.${new Date().toISOString().replace(/[:.]/g, '-')}.js`;
      writeFileSync(path.join(this.backupsDir, name), readFileSync(this.filePath, 'utf8'), 'utf8');
      const files = readdirSync(this.backupsDir).filter((f) => f.startsWith('siteData.')).sort();
      while (files.length > limit) {
        const oldest = files.shift();
        try { unlinkSync(path.join(this.backupsDir, oldest)); } catch { /* ignore */ }
      }
    } catch {
      /* бэкап не критичен */
    }
  }
}

export { serialize as serializeValue };
