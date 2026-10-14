// ---------------------------------------------------------------------------
// Новый контент из кода — на живой сайт, правки из админки — на месте.
//
// На хостинге контент живёт на постоянном диске, а новые тексты приходят
// с деплоем в apps/site/src/app/data/siteData.js. Раньше сервер умел только
// две вещи: целиком заменить диск версией из кода или не трогать его вовсе,
// если в админке что-то правили. На живом сайте почти всегда случается
// второе — и новые разделы продуктов («Применение», «Характеристики»)
// до сайта просто не доходили.
//
// Теперь сервер сводит две версии по каждому полю:
//   • значение на диске совпадает с одной из прошлых версий из кода
//     → его никто не трогал, берём новое из кода;
//   • значение отличается от всех прошлых версий → это правка из админки,
//     она остаётся;
//   • поля или записи на диске нет → добавляем из кода;
//   • запись добавили в админке → остаётся;
//   • запись удалили в админке → обратно не возвращаем;
//   • запись убрали из кода, а в админке её не меняли → убираем.
//
// «Прошлые версии из кода» — это отпечатки всех выпусков siteData.js:
// server/content-history.json (собирает scripts/content-history.mjs)
// плюс версии, которые сервер увидел сам при деплоях (DATA_DIR).
// Хранятся не тексты, а короткие хеши, поэтому файл небольшой.
// ---------------------------------------------------------------------------

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export const HISTORY_FORMAT = 1;

const LANGS = new Set(['ru', 'en', 'uz', 'zh', 'ar', 'uk', 'kk', 'be']);
// Поля, по которым узнаём запись в списке. Порядок важен: id главнее.
const KEY_FIELDS = ['id', 'key', 'code'];

const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

// Многоязычный текст: { ru: '…', en: '…' }.
export function isLocalized(v) {
  if (!isPlainObject(v)) return false;
  const keys = Object.keys(v);
  return keys.length > 0 && keys.every((k) => LANGS.has(k));
}

// Список записей с ключом (продукты, вопросы FAQ, сотрудники…).
// Возвращает имя ключевого поля или null, если список «плоский».
export function keyFieldOf(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  for (const field of KEY_FIELDS) {
    const seen = new Set();
    const ok = list.every((item) => {
      if (!isPlainObject(item) || isLocalized(item)) return false;
      const key = item[field];
      if ((typeof key !== 'string' && typeof key !== 'number') || key === '') return false;
      if (seen.has(String(key))) return false;
      seen.add(String(key));
      return true;
    });
    if (ok) return field;
  }
  return null;
}

// Каноническая форма значения для сравнения: ключи по алфавиту,
// многоязычный текст сводится к русскому оригиналу — так машинный
// перевод, дописанный сервером, не выглядит как правка из админки.
function normal(v) {
  if (Array.isArray(v)) return v.map(normal);
  if (isLocalized(v)) return normal(v.ru ?? '');
  if (isPlainObject(v)) {
    const out = {};
    for (const key of Object.keys(v).sort()) {
      if (v[key] === undefined || typeof v[key] === 'function') continue;
      out[key] = normal(v[key]);
    }
    return out;
  }
  return v === undefined ? null : v;
}

export const canon = (v) => JSON.stringify(normal(v)) ?? 'null';
export const shortHash = (text) => createHash('sha1').update(String(text), 'utf8').digest('base64url').slice(0, 10);

// Все языки, которые встречаются в многоязычных текстах внутри значения.
function langsIn(value, out = new Set()) {
  if (isLocalized(value)) { for (const lang of Object.keys(value)) out.add(lang); return out; }
  if (Array.isArray(value)) { for (const item of value) langsIn(item, out); return out; }
  if (isPlainObject(value)) { for (const item of Object.values(value)) langsIn(item, out); }
  return out;
}

// Значение глазами одного языка: каждый многоязычный текст заменён
// его переводом. Нужен, чтобы заметить правку перевода внутри списка.
function project(value, lang) {
  if (isLocalized(value)) return value[lang] ?? null;
  if (Array.isArray(value)) return value.map((item) => project(item, lang));
  if (isPlainObject(value)) {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] === undefined || typeof value[key] === 'function') continue;
      out[key] = project(value[key], lang);
    }
    return out;
  }
  return value === undefined ? null : value;
}
const canonLang = (value, lang) => JSON.stringify(project(value, lang)) ?? 'null';
// Ключ пункта плоского списка: путь списка + отпечаток русского текста пункта.
const itemKey = (path, item) => `${path}{${shortHash(canon(item))}}`;

// Переносит переводы на язык lang из source в target (той же формы).
// onlyMissing — только туда, где в target этого перевода нет.
function applyLang(target, source, lang, onlyMissing = false) {
  if (isLocalized(source) && isLocalized(target)) {
    const has = target[lang] !== undefined && target[lang] !== '' && target[lang] !== null;
    if (onlyMissing && has) return;
    if (source[lang] !== undefined && source[lang] !== '' && source[lang] !== null) target[lang] = structuredClone(source[lang]);
    return;
  }
  if (Array.isArray(source) && Array.isArray(target)) {
    source.forEach((item, i) => {
      if (i < target.length && target[i] && typeof target[i] === 'object') applyLang(target[i], item, lang, onlyMissing);
    });
    return;
  }
  if (isPlainObject(source) && isPlainObject(target)) {
    for (const key of Object.keys(source)) {
      if (target[key] && typeof target[key] === 'object') applyLang(target[key], source[key], lang, onlyMissing);
    }
  }
}

// ---------------------------------------------------------------------------
// Разбор контента на единицы сравнения.
//
// sink.value(path, canonText, translation) — одно значение: строка, число,
//     плоский список, один язык многоязычного текста. translation = true
//     у переводов: они идут вслед за русским оригиналом и сами по себе
//     не делают значение «правленым»;
// sink.item(path)       — запись списка с ключом;
// sink.order(path, ids) — порядок записей в таком списке.
// ---------------------------------------------------------------------------
function walk(value, path, sink) {
  if (isLocalized(value)) {
    for (const [lang, text] of Object.entries(value)) sink.value(`${path}@${lang}`, canon(text), lang !== 'ru');
    return;
  }
  if (Array.isArray(value)) {
    const field = keyFieldOf(value);
    if (field) {
      sink.order(path, value.map((item) => String(item[field])));
      for (const item of value) {
        const itemPath = `${path}#${item[field]}`;
        sink.item(itemPath);
        walkFields(item, itemPath, sink);
      }
      return;
    }
    sink.value(path, canon(value), isUiTranslation(path));
    // Переводы каждого пункта отдельно. Пункт узнаём по русскому тексту,
    // а не по номеру: так правка перевода переживает и новые пункты,
    // и перестановку списка в следующей версии.
    for (const item of value) {
      const langs = langsIn(item);
      if (!langs.size) continue;
      const key = itemKey(path, item);
      for (const lang of langs) if (lang !== 'ru') sink.value(`${key}~${lang}`, canonLang(item, lang), true);
    }
    return;
  }
  if (isPlainObject(value)) {
    walkFields(value, path, sink);
    return;
  }
  sink.value(path, canon(value), isUiTranslation(path));
}

// Подпись интерфейса не на русском: «UI_TEXT.en.nav.home».
// Такие строки — перевод, как и языки многоязычного текста.
function isUiTranslation(path) {
  if (!path.startsWith('UI_TEXT.')) return false;
  const end = path.indexOf('.', 8);
  const lang = end === -1 ? path.slice(8) : path.slice(8, end);
  return lang !== 'ru';
}

function walkFields(object, path, sink) {
  for (const [key, value] of Object.entries(object)) {
    if (value === undefined || typeof value === 'function') continue;
    walk(value, `${path}.${key}`, sink);
  }
}

// UI_TEXT устроен иначе: верхний уровень — языки, внутри — обычное дерево.
// Его разбираем по языкам, иначе он выглядел бы как один огромный
// «многоязычный текст».
function walkKey(key, value, sink) {
  if (key === 'UI_TEXT' && isPlainObject(value)) {
    for (const [lang, tree] of Object.entries(value)) walk(tree, `UI_TEXT.${lang}`, sink);
    return;
  }
  walk(value, key, sink);
}

export function unitsOf(content, sink) {
  for (const [key, value] of Object.entries(content || {})) {
    if (value === undefined) continue;
    walkKey(key, value, sink);
  }
}

// ---------------------------------------------------------------------------
// История выпусков
// ---------------------------------------------------------------------------

// Наборы номеров выпусков храним диапазонами: «0-14,16».
function packRanges(set) {
  const list = [...set].sort((a, b) => a - b);
  const parts = [];
  for (let i = 0; i < list.length; i += 1) {
    let j = i;
    while (j + 1 < list.length && list[j + 1] === list[j] + 1) j += 1;
    parts.push(j > i ? `${list[i]}-${list[j]}` : String(list[i]));
    i = j;
  }
  return parts.join(',');
}

function unpackRanges(text, offset = 0) {
  const out = new Set();
  for (const part of String(text || '').split(',')) {
    if (!part) continue;
    const [a, b] = part.split('-').map(Number);
    if (!Number.isFinite(a)) continue;
    const end = Number.isFinite(b) ? b : a;
    for (let i = a; i <= end; i += 1) out.add(i + offset);
  }
  return out;
}

export function emptyHistory() {
  return { releases: [], values: new Map(), items: new Map(), orders: new Map() };
}

// Добавляет в историю один выпуск. Возвращает его номер.
//
// history.values: хеш пути → (хеш значения → номера выпусков с этим значением).
export function addRelease(history, content, release) {
  const index = history.releases.length;
  history.releases.push(release);
  unitsOf(content, {
    value(path, text) {
      const key = shortHash(path);
      if (!history.values.has(key)) history.values.set(key, new Map());
      const variants = history.values.get(key);
      const hash = shortHash(text);
      if (!variants.has(hash)) variants.set(hash, new Set());
      variants.get(hash).add(index);
    },
    item(path) {
      if (!history.items.has(path)) history.items.set(path, new Set());
      history.items.get(path).add(index);
    },
    order(path, ids) {
      if (!history.orders.has(path)) history.orders.set(path, []);
      const joined = ids.join('\u0001');
      const known = history.orders.get(path).find((o) => o.ids.join('\u0001') === joined);
      if (known) known.rel.add(index);
      else history.orders.get(path).push({ ids, rel: new Set([index]) });
    },
  });
  return index;
}

const byKey = ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0);

// Формат файла: values[хеш пути] = «хеш:выпуски хеш:выпуски», например
// «Ab3dE5gH7k:0-13 Zx9yW8vU7t:14-17».
export function historyToJson(history) {
  const values = {};
  for (const [key, variants] of [...history.values].sort(byKey)) {
    values[key] = [...variants].sort(byKey).map(([hash, rel]) => `${hash}:${packRanges(rel)}`).join(' ');
  }
  const items = {};
  for (const [path, set] of [...history.items].sort(byKey)) items[path] = packRanges(set);
  const orders = {};
  for (const [path, list] of [...history.orders].sort(byKey)) {
    orders[path] = list.map((o) => ({ ids: o.ids, rel: packRanges(o.rel) }));
  }
  return { format: HISTORY_FORMAT, releases: history.releases, values, items, orders };
}

// Вливает сохранённую историю в общую. Номера выпусков сдвигаются,
// чтобы выпуски из разных файлов не путались.
export function mergeHistoryJson(history, json) {
  if (!json || json.format !== HISTORY_FORMAT || !Array.isArray(json.releases)) return history;
  const offset = history.releases.length;
  history.releases.push(...json.releases);
  for (const [key, text] of Object.entries(json.values || {})) {
    if (!history.values.has(key)) history.values.set(key, new Map());
    const variants = history.values.get(key);
    for (const part of String(text).split(' ')) {
      const [hash, rel] = part.split(':');
      if (!hash) continue;
      if (!variants.has(hash)) variants.set(hash, new Set());
      for (const i of unpackRanges(rel, offset)) variants.get(hash).add(i);
    }
  }
  for (const [path, text] of Object.entries(json.items || {})) {
    if (!history.items.has(path)) history.items.set(path, new Set());
    const set = history.items.get(path);
    for (const i of unpackRanges(text, offset)) set.add(i);
  }
  for (const [path, list] of Object.entries(json.orders || {})) {
    if (!history.orders.has(path)) history.orders.set(path, []);
    const target = history.orders.get(path);
    for (const o of list || []) {
      if (!Array.isArray(o.ids)) continue;
      const joined = o.ids.join('\u0001');
      const rel = unpackRanges(o.rel, offset);
      const known = target.find((x) => x.ids.join('\u0001') === joined);
      if (known) for (const i of rel) known.rel.add(i);
      else target.push({ ids: o.ids.map(String), rel });
    }
  }
  return history;
}

function readJsonFile(file) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
}

// Общая история: выпуски из репозитория + выпуски, которые сервер видел сам.
export function loadHistory(...files) {
  const history = emptyHistory();
  for (const file of files) {
    if (file && existsSync(file)) mergeHistoryJson(history, readJsonFile(file));
  }
  return history;
}

// Запоминает версию из кода в локальной истории сервера, если её там ещё нет.
// Так следующее обновление узнает тексты этой версии, даже если историю
// в репозитории забыли пересобрать.
export function rememberRelease(file, content, release, knownHashes = []) {
  const local = readJsonFile(file);
  const history = emptyHistory();
  if (local) mergeHistoryJson(history, local);
  const seen = new Set([...knownHashes, ...history.releases.map((r) => r && r.hash)]);
  if (release.hash && seen.has(release.hash)) return false;
  addRelease(history, content, release);
  writeFileSync(file, JSON.stringify(historyToJson(history)), 'utf8');
  return true;
}

// ---------------------------------------------------------------------------
// Сведение
// ---------------------------------------------------------------------------

// На какой выпуск больше всего похож контент на диске: считаем совпавшие
// тексты и состав списков (какие записи есть, каких нет). Это нужно, чтобы
// отличить «запись удалили в админке» от «запись появилась в коде позже»
// и «перевод поправили в админке» от «перевод дописал автопереводчик».
export function detectBase(content, history) {
  const total = history.releases.length;
  if (!total) return -1;
  const score = new Array(total).fill(0);
  const present = new Set();
  unitsOf(content, {
    value(path, text, translation) {
      if (translation) return;
      const variants = history.values.get(shortHash(path));
      const rel = variants && variants.get(shortHash(text));
      if (rel) for (const i of rel) score[i] += 1;
    },
    item(path) { present.add(path); },
    order() {},
  });
  for (const [path, rel] of history.items) {
    const inDisk = present.has(path);
    for (let i = 0; i < total; i += 1) if (rel.has(i) === inDisk) score[i] += 1;
  }
  let best = total - 1;
  for (let i = total - 1; i >= 0; i -= 1) if (score[i] > score[best]) best = i;
  return best;
}

const clone = (v) => (v === undefined ? undefined : structuredClone(v));

// Порядок записей: сначала primary, остальные встают за своим соседом
// слева из secondary.
function arrange(primary, secondary, keep) {
  const out = primary.filter((id) => keep.has(id));
  const placed = new Set(out);
  secondary.forEach((id, i) => {
    if (!keep.has(id) || placed.has(id)) return;
    let at = 0;
    for (let j = i - 1; j >= 0; j -= 1) {
      const k = out.indexOf(secondary[j]);
      if (k !== -1) { at = k + 1; break; }
    }
    out.splice(at, 0, id);
    placed.add(id);
  });
  for (const id of keep) if (!placed.has(id)) out.push(id);
  return out;
}

class Merger {
  constructor(history, base) {
    this.history = history;
    this.base = base;
    this.stats = { updated: 0, added: 0, kept: 0, removed: 0, keptDeleted: 0 };
    this.kept = [];
  }

  knownText(path, text) {
    const variants = this.history.values.get(shortHash(path));
    return Boolean(variants && variants.has(shortHash(text)));
  }

  known(path, value) {
    return this.knownText(path, canon(value));
  }

  // Было ли что-то по этому пути в той версии, с которой засеян диск.
  // Перевод, которого там не было, на диске мог появиться только от
  // автопереводчика — тогда лучше взять выверенный перевод из кода.
  inBase(path) {
    const variants = this.history.values.get(shortHash(path));
    if (!variants) return false;
    for (const rel of variants.values()) if (rel.has(this.base)) return true;
    return false;
  }

  itemEver(path) {
    const rel = this.history.items.get(path);
    return Boolean(rel && rel.size);
  }

  itemInBase(path) {
    const rel = this.history.items.get(path);
    return Boolean(rel && rel.has(this.base));
  }

  baseOrder(path) {
    const list = this.history.orders.get(path);
    if (!list) return null;
    const hit = list.find((o) => o.rel.has(this.base));
    return hit ? hit.ids : null;
  }

  // Всё ли в этом значении совпадает с какой-нибудь версией из кода.
  // Переводы внутри не в счёт: они идут за русским текстом, и машинный
  // перевод не должен навсегда «замораживать» старый текст.
  untouched(value, path) {
    let ok = true;
    const sink = {
      value: (p, text, translation) => {
        if (!ok || (translation && p !== path)) return;
        if (!this.knownText(p, text)) ok = false;
      },
      item: (p) => { if (ok && !this.itemEver(p)) ok = false; },
      order: () => {},
    };
    walk(value, path, sink);
    return ok;
  }

  keep(path) {
    this.stats.kept += 1;
    if (this.kept.length < 40) this.kept.push(path);
  }

  value(disk, repo, path) {
    if (repo === undefined) return disk;
    if (disk === undefined) { this.stats.added += 1; return clone(repo); }
    if (isLocalized(repo) && isLocalized(disk)) return this.localized(disk, repo, path);
    if (Array.isArray(repo) && Array.isArray(disk)) {
      const field = keyFieldOf(repo);
      if (field && (disk.length === 0 || keyFieldOf(disk) === field)) return this.keyed(disk, repo, path, field);
      return this.leaf(disk, repo, path);
    }
    if (isPlainObject(repo) && isPlainObject(disk) && !isLocalized(repo) && !isLocalized(disk)) {
      return this.object(disk, repo, path);
    }
    return this.leaf(disk, repo, path);
  }

  leaf(disk, repo, path) {
    if (canon(disk) === canon(repo)) {
      return Array.isArray(repo) ? this.listTranslations(disk, repo, path) : clone(repo);
    }
    if (this.untouched(disk, path)) {
      this.stats.updated += 1;
      return Array.isArray(repo) && Array.isArray(disk) ? this.listTranslations(disk, repo, path) : clone(repo);
    }
    // Перевод подписи, которого в исходной версии не было, дописал автопереводчик.
    if (isUiTranslation(path) && !this.inBase(path)) { this.stats.updated += 1; return clone(repo); }
    this.keep(path);
    return disk;
  }

  // Список из кода (возможности продукта, пункты и т. п.) с переводами,
  // поправленными в админке. Пункт с тем же русским текстом получает перевод
  // с диска, если тот правили вручную: такой перевод не совпадает ни с одним
  // выпуском, а в исходной версии у пункта перевод уже был. Старые переводы
  // из кода и машинные уступают выверенным переводам новой версии.
  listTranslations(disk, repo, path) {
    const out = clone(repo);
    const free = new Map();
    out.forEach((item, i) => {
      const h = itemKey(path, item);
      if (!free.has(h)) free.set(h, []);
      free.get(h).push(i);
    });
    for (const item of disk) {
      const langs = langsIn(item);
      if (!langs.size) continue;
      const key = itemKey(path, item);
      const slots = free.get(key);
      if (!slots || !slots.length) continue;
      const i = slots.shift();
      for (const lang of langs) {
        if (lang === 'ru') continue;
        const text = canonLang(item, lang);
        if (text === canonLang(out[i], lang)) continue;
        const p = `${key}~${lang}`;
        if (this.knownText(p, text) || !this.inBase(p)) {
          // Чего в коде нет вовсе, не теряем.
          if (out[i] && typeof out[i] === 'object') applyLang(out[i], item, lang, true);
          continue;
        }
        if (out[i] && typeof out[i] === 'object') applyLang(out[i], item, lang);
        this.keep(p);
      }
    }
    return out;
  }

  localized(disk, repo, path) {
    if (canon(disk.ru ?? '') === canon(repo.ru ?? '')) {
      // Русский текст тот же. Переводы берём из кода, кроме поправленных
      // в админке: такой перевод не совпадает ни с одним выпуском, и по этому
      // пути перевод был уже в исходной версии.
      const out = clone(repo);
      for (const [lang, text] of Object.entries(disk)) {
        if (lang === 'ru' || text === '' || text == null) continue;
        if (!(lang in repo) || repo[lang] === '' || repo[lang] == null) { out[lang] = text; continue; }
        if (canon(text) === canon(repo[lang])) continue;
        const p = `${path}@${lang}`;
        if (this.known(p, text) || !this.inBase(p)) { this.stats.updated += 1; continue; }
        out[lang] = text;
        this.keep(p);
      }
      return out;
    }
    if (this.known(`${path}@ru`, disk.ru ?? '')) { this.stats.updated += 1; return clone(repo); }
    this.keep(path);
    return disk;
  }

  object(disk, repo, path) {
    const out = {};
    for (const key of Object.keys(repo)) {
      const merged = this.value(disk[key], repo[key], `${path}.${key}`);
      if (merged !== undefined) out[key] = merged;
    }
    for (const key of Object.keys(disk)) {
      if (key in repo || disk[key] === undefined) continue;
      // Поле убрали из кода. Если его не правили в админке — убираем и с диска.
      if (this.untouched(disk[key], `${path}.${key}`)) { this.stats.removed += 1; continue; }
      out[key] = disk[key];
      this.keep(`${path}.${key}`);
    }
    return out;
  }

  keyed(disk, repo, path, field) {
    const id = (item) => String(item[field]);
    const diskMap = new Map(disk.map((item) => [id(item), item]));
    const repoMap = new Map(repo.map((item) => [id(item), item]));
    const result = new Map();

    for (const item of repo) {
      const key = id(item);
      const itemPath = `${path}#${key}`;
      if (diskMap.has(key)) result.set(key, this.value(diskMap.get(key), item, itemPath));
      else if (this.itemInBase(itemPath)) this.stats.keptDeleted += 1; // удалили в админке
      else { result.set(key, clone(item)); this.stats.added += 1; }
    }
    for (const item of disk) {
      const key = id(item);
      if (repoMap.has(key)) continue;
      const itemPath = `${path}#${key}`;
      // Запись убрали из кода, а в админке её не трогали — убираем.
      if (this.itemEver(itemPath) && this.untouched(item, itemPath)) { this.stats.removed += 1; continue; }
      result.set(key, item);
      if (!this.itemEver(itemPath)) this.stats.kept += 1; // добавлена в админке
      else this.keep(itemPath);
    }

    // Порядок. Если в админке записи переставляли — сохраняем их порядок,
    // иначе берём порядок из кода.
    const repoOrder = repo.map(id);
    const diskOrder = disk.map(id);
    const base = this.baseOrder(path);
    let reordered = false;
    if (base) {
      const inBase = new Set(base);
      const shared = new Set(diskOrder.filter((k) => repoMap.has(k) && inBase.has(k)));
      const a = diskOrder.filter((k) => shared.has(k)).join('\u0001');
      const b = base.filter((k) => shared.has(k)).join('\u0001');
      reordered = a !== b;
    }
    const keep = new Set(result.keys());
    const order = reordered ? arrange(diskOrder, repoOrder, keep) : arrange(repoOrder, diskOrder, keep);
    return order.map((key) => result.get(key));
  }

  uiText(disk, repo) {
    if (!isPlainObject(disk)) return clone(repo);
    if (!isPlainObject(repo)) return disk;
    const out = {};
    for (const lang of Object.keys(repo)) {
      const merged = this.value(disk[lang], repo[lang], `UI_TEXT.${lang}`);
      if (merged !== undefined) out[lang] = merged;
    }
    for (const lang of Object.keys(disk)) if (!(lang in out)) out[lang] = disk[lang];
    return out;
  }
}

// disk  — контент с постоянного диска (с правками из админки);
// repo  — контент из кода новой версии;
// history — выпуски, которые считаются «нетронутыми» значениями.
//
// Возвращает { content, stats, base, kept }.
export function mergeContent(disk, repo, history) {
  const base = detectBase(disk, history);
  const merger = new Merger(history, base);
  const content = {};
  for (const key of Object.keys(repo)) {
    content[key] = key === 'UI_TEXT'
      ? merger.uiText(disk[key], repo[key])
      : merger.value(disk[key], repo[key], key);
    if (content[key] === undefined) delete content[key];
  }
  // Ключи, которых в коде больше нет, оставляем: вреда от них нет.
  for (const key of Object.keys(disk)) if (!(key in content) && disk[key] !== undefined) content[key] = disk[key];
  return {
    content,
    stats: merger.stats,
    base: base >= 0 ? history.releases[base] : null,
    kept: merger.kept,
  };
}
