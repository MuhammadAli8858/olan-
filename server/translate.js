// ---------------------------------------------------------------------------
// Переводы контента сайта.
//
// Правило проекта:
//   • русский, английский и узбекский заполняются АВТОМАТИЧЕСКИ — при каждом
//     сохранении из админ-панели. Отредактировали текст на одном из них —
//     два других подтянутся сами;
//   • китайский и арабский трогаются ТОЛЬКО вручную: их правят в админке
//     по одному полю или разово прогоняют кнопкой «Перевести весь сайт»
//     с включённой галочкой ZH/AR.
//
// Переводчик — бесплатный публичный эндпоинт Google Translate, ключ не нужен.
// Интернет обязателен: локально он есть, на Render тоже.
// ---------------------------------------------------------------------------

// Языки, которые сервер заполняет сам.
export const AUTO_LANGS = ['ru', 'en', 'uz'];

// Языки только для ручной правки.
export const MANUAL_LANGS = ['zh', 'ar'];

// Язык-источник по умолчанию: с него переводим, если не сказано иное.
export const SOURCE_LANG = 'ru';

// У Google коды местами свои.
const GT_LANG = { zh: 'zh-CN' };

// Длинный текст в один запрос не влезает — режем по предложениям.
const MAX_CHUNK = 1200;

// Сколько строк переводим одновременно. Больше — быстрее, но легко
// поймать временную блокировку от Google.
const CONCURRENCY = 6;

// ---------------------------------------------------------------------------
// Сам перевод
// ---------------------------------------------------------------------------

function splitLongText(text) {
  if (text.length <= MAX_CHUNK) return [text];
  const parts = [];
  let rest = text;
  while (rest.length > MAX_CHUNK) {
    const window = rest.slice(0, MAX_CHUNK);
    // Ищем ближайшую границу предложения, потом пробел, иначе рубим жёстко.
    let cut = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '), window.lastIndexOf('\n'));
    if (cut < MAX_CHUNK * 0.5) cut = window.lastIndexOf(' ');
    if (cut <= 0) cut = MAX_CHUNK;
    parts.push(rest.slice(0, cut + 1));
    rest = rest.slice(cut + 1);
  }
  if (rest) parts.push(rest);
  return parts;
}

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

async function requestTranslation(text, from, to) {
  const sl = GT_LANG[from] || from;
  const tl = GT_LANG[to] || to;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data[0] || []).map((seg) => (seg && seg[0]) || '').join('');
}

// Перевод одной строки.
//
// При полном сбое возвращает null, а НЕ исходный текст. Это принципиально:
// иначе при потере интернета в английское поле лёг бы русский текст, поле
// перестало бы считаться пустым и настоящий перевод туда уже не попал бы.
export async function translateOne(text, from, to, { retries = 3 } = {}) {
  const value = text == null ? '' : String(text);
  if (!value.trim() || from === to) return value;

  const chunks = splitLongText(value);
  const out = [];

  for (const chunk of chunks) {
    let done = '';
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        done = await requestTranslation(chunk, from, to);
        if (done) break;
      } catch {
        // Google иногда отвечает 429 — ждём и пробуем ещё раз.
        // eslint-disable-next-line no-await-in-loop
        if (attempt < retries) await sleep(400 * (attempt + 1));
      }
    }
    if (!done) return null;
    out.push(done);
  }

  return out.join('');
}

// Перевод пачки строк с ограничением одновременных запросов.
export async function translateList(texts, from, to, { onTick } = {}) {
  const result = new Array(texts.length);
  let cursor = 0;

  async function worker() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= texts.length) return;
      // eslint-disable-next-line no-await-in-loop
      result[index] = await translateOne(texts[index], from, to);
      if (onTick) onTick();
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, texts.length) }, worker));
  return result;
}

// ---------------------------------------------------------------------------
// Обход контента: находим все многоязычные поля
// ---------------------------------------------------------------------------

export function languageCodes(content) {
  const codes = (content?.LANGUAGE_OPTIONS || []).map((l) => l.code).filter(Boolean);
  return codes.length ? codes : [...AUTO_LANGS, ...MANUAL_LANGS];
}

// Многоязычное поле — объект, у которого все ключи являются кодами языков:
//   { ru: 'Текст', en: 'Text', uz: 'Matn' }
export function isLocalized(value, codes) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((k) => codes.includes(k));
}

function hasText(value) {
  if (Array.isArray(value)) return value.some((v) => String(v ?? '').trim() !== '');
  return String(value ?? '').trim() !== '';
}

// Проходим по всему контенту и зовём visit для каждого многоязычного поля.
// UI_TEXT пропускаем: у него другая форма, он разбирается отдельно.
function walkLocalized(node, codes, visit, path = []) {
  if (isLocalized(node, codes)) { visit(node, path); return; }
  if (Array.isArray(node)) { node.forEach((item, i) => walkLocalized(item, codes, visit, [...path, i])); return; }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) walkLocalized(value, codes, visit, [...path, key]);
  }
}

export function collectLocalized(content, codes) {
  const found = [];
  for (const [key, value] of Object.entries(content || {})) {
    if (key === 'UI_TEXT' || key === 'LANGUAGE_OPTIONS') continue;
    walkLocalized(value, codes, (node, path) => found.push({ node, path: [key, ...path] }), []);
  }
  return found;
}

// ---------------------------------------------------------------------------
// UI_TEXT: { ru: {...}, en: {...} } — одинаковое дерево на каждом языке
// ---------------------------------------------------------------------------

// Собираем все строковые листья дерева в виде пар «путь → текст».
function flattenLeaves(node, path = [], out = []) {
  if (typeof node === 'string') { out.push({ path, text: node }); return out; }
  if (Array.isArray(node)) { node.forEach((item, i) => flattenLeaves(item, [...path, i], out)); return out; }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) flattenLeaves(value, [...path, key], out);
  }
  return out;
}

function getAt(node, path) {
  let current = node;
  for (const step of path) {
    if (current == null) return undefined;
    current = current[step];
  }
  return current;
}

function setAt(node, path, value) {
  let current = node;
  for (let i = 0; i < path.length - 1; i += 1) {
    const step = path[i];
    const next = path[i + 1];
    if (current[step] == null || typeof current[step] !== 'object') current[step] = typeof next === 'number' ? [] : {};
    current = current[step];
  }
  current[path[path.length - 1]] = value;
}

// ---------------------------------------------------------------------------
// Задание на перевод: что именно и куда переводим
// ---------------------------------------------------------------------------

// Составляем список пропусков: поле есть на источнике, но пусто на целевом языке.
function planMissing(content, { codes, targets, source, force }) {
  const jobs = [];

  for (const { node } of collectLocalized(content, codes)) {
    // Источник — заданный язык; если он пуст, берём первый непустой.
    let from = source;
    if (!hasText(node[from])) from = codes.find((c) => hasText(node[c]));
    if (!from) continue;

    for (const target of targets) {
      if (target === from) continue;
      if (!force && hasText(node[target])) continue;

      const value = node[from];
      if (Array.isArray(value)) {
        if (!value.length) continue;
        jobs.push({ kind: 'array', node, from, target, texts: value.map((v) => String(v ?? '')) });
      } else {
        jobs.push({ kind: 'string', node, from, target, texts: [String(value ?? '')] });
      }
    }
  }

  // UI_TEXT — отдельным проходом.
  const ui = content?.UI_TEXT;
  if (ui && typeof ui === 'object') {
    const from = hasText(ui[source]) || ui[source] ? source : codes.find((c) => ui[c]);
    if (from && ui[from]) {
      const leaves = flattenLeaves(ui[from]);
      for (const target of targets) {
        if (target === from) continue;
        ui[target] = ui[target] || {};
        const pending = leaves.filter((leaf) => {
          if (!String(leaf.text ?? '').trim()) return false;
          if (force) return true;
          return String(getAt(ui[target], leaf.path) ?? '').trim() === '';
        });
        if (pending.length) {
          jobs.push({ kind: 'ui', node: ui[target], from, target, paths: pending.map((l) => l.path), texts: pending.map((l) => l.text) });
        }
      }
    }
  }

  return jobs;
}

// Записываем результат. Всё, что не перевелось (null), пропускаем —
// поле останется пустым и попадёт в следующий прогон.
function applyJob(job, translated) {
  const ok = (v) => v != null && String(v).trim() !== '';

  if (job.kind === 'array') {
    if (!translated.some(ok)) return 0;
    const previous = Array.isArray(job.node[job.target]) ? job.node[job.target] : [];
    job.node[job.target] = translated.map((v, i) => (ok(v) ? v : (previous[i] ?? '')));
    return translated.filter(ok).length;
  }

  if (job.kind === 'string') {
    if (!ok(translated[0])) return 0;
    job.node[job.target] = translated[0];
    return 1;
  }

  // ui
  let count = 0;
  job.paths.forEach((path, i) => {
    if (!ok(translated[i])) return;
    setAt(job.node, path, translated[i]);
    count += 1;
  });
  return count;
}

// Сколько строк осталось перевести — для прогресса в админке.
export function countMissing(content, { targets, source = SOURCE_LANG, force = false } = {}) {
  const codes = languageCodes(content);
  const list = targets && targets.length ? targets : AUTO_LANGS;
  // Работаем на копии: planMissing может создать пустые UI_TEXT-ветки.
  const copy = JSON.parse(JSON.stringify(content));
  return planMissing(copy, { codes, targets: list, source, force })
    .reduce((sum, job) => sum + job.texts.length, 0);
}

// Основная операция: дозаполнить пропуски. Меняет content на месте.
export async function fillMissing(content, {
  targets = AUTO_LANGS,
  source = SOURCE_LANG,
  force = false,
  limit = Infinity,
  onProgress,
} = {}) {
  const codes = languageCodes(content);
  const all = planMissing(content, { codes, targets, source, force });

  // Берём не больше limit строк за один заход: так админка показывает
  // прогресс, а запрос не висит по несколько минут.
  const jobs = [];
  let planned = 0;
  for (const job of all) {
    if (planned >= limit) break;
    jobs.push(job);
    planned += job.texts.length;
  }

  const totalStrings = all.reduce((sum, job) => sum + job.texts.length, 0);
  let seen = 0;
  let applied = 0;

  for (const job of jobs) {
    // eslint-disable-next-line no-await-in-loop
    const translated = await translateList(job.texts, job.from, job.target, {
      onTick: () => { seen += 1; if (onProgress) onProgress(seen, planned); },
    });
    applied += applyJob(job, translated);
  }

  return {
    translated: applied,
    fields: jobs.length,
    remaining: Math.max(0, totalStrings - applied),
    done: applied >= totalStrings,
  };
}

// ---------------------------------------------------------------------------
// Автоперевод при сохранении из админ-панели
// ---------------------------------------------------------------------------

// Что изменилось в поле по сравнению с прошлым сохранением.
//
// Пустая строка, пустой массив и отсутствие поля — одно и то же.
// Иначе новая карточка выглядела бы как «правка сразу на всех языках»,
// и автоперевод обошёл бы её стороной.
function normalize(value) {
  if (Array.isArray(value)) return JSON.stringify(value.map((v) => String(v ?? '')));
  return JSON.stringify(String(value ?? ''));
}

function changedLangs(oldNode, newNode, codes) {
  const changed = [];
  for (const code of codes) {
    if (normalize(oldNode ? oldNode[code] : '') !== normalize(newNode[code])) changed.push(code);
  }
  return changed;
}

// Ищем в старом контенте поле по тому же пути.
function findOldNode(oldContent, path) {
  const node = getAt(oldContent, path);
  return node && typeof node === 'object' && !Array.isArray(node) ? node : null;
}

// Главная функция сохранения: сравниваем старый и новый контент и
// доперевод��м только то, что реально изменилось или пустует.
// Китайский и арабский не трогаем никогда.
// limit бережёт время сохранения: если контента без перевода очень много
// (первый запуск), за один раз берём столько, сколько успеем без риска
// подвесить запрос. Остальное доберёт следующее сохранение или кнопка
// «Перевести сайт» в админке.
export async function syncOnSave(oldContent, newContent, { targets = AUTO_LANGS, limit = 250 } = {}) {
  const codes = languageCodes(newContent);
  const auto = targets.filter((code) => codes.includes(code));
  const jobs = [];

  for (const { node, path } of collectLocalized(newContent, codes)) {
    const before = findOldNode(oldContent, path);
    const changed = changedLangs(before, node, auto);

    // Источник — русский. Так текст на сайте всегда идёт от оригинала,
    // а не от перевода перевода. Русского нет — берём первый непустой.
    const from = hasText(node[SOURCE_LANG]) ? SOURCE_LANG : auto.find((c) => hasText(node[c]));
    if (!from) continue;
    const sourceChanged = changed.includes(from);

    for (const target of auto) {
      if (target === from) continue;
      // Этот язык правили руками прямо сейчас — человек знает, что пишет.
      if (changed.includes(target)) continue;
      // Текст есть, источник не менялся — переводить нечего.
      if (hasText(node[target]) && !sourceChanged) continue;

      const value = node[from];
      if (Array.isArray(value)) {
        if (!value.length) continue;
        jobs.push({ kind: 'array', node, from, target, texts: value.map((v) => String(v ?? '')) });
      } else {
        jobs.push({ kind: 'string', node, from, target, texts: [String(value ?? '')] });
      }
    }
  }

  // UI_TEXT: сравниваем лист за листом.
  const ui = newContent?.UI_TEXT;
  const uiOld = oldContent?.UI_TEXT;
  if (ui && typeof ui === 'object' && ui[SOURCE_LANG]) {
    const leaves = flattenLeaves(ui[SOURCE_LANG]);
    for (const target of auto) {
      if (target === SOURCE_LANG) continue;
      ui[target] = ui[target] || {};
      const pending = leaves.filter((leaf) => {
        const text = String(leaf.text ?? '');
        if (!text.trim()) return false;
        const currentTarget = String(getAt(ui[target], leaf.path) ?? '');
        if (!currentTarget.trim()) return true;
        const oldSource = String(getAt(uiOld?.[SOURCE_LANG], leaf.path) ?? '');
        const oldTarget = String(getAt(uiOld?.[target], leaf.path) ?? '');
        // Источник поменяли, а перевод остался старым — обновляем.
        return oldSource !== text && oldTarget === currentTarget;
      });
      if (pending.length) {
        jobs.push({ kind: 'ui', node: ui[target], from: SOURCE_LANG, target, paths: pending.map((l) => l.path), texts: pending.map((l) => l.text) });
      }
    }
  }

  if (!jobs.length) return { translated: 0, fields: 0, skipped: 0 };

  let done = 0;
  let sent = 0;
  let used = 0;
  for (const job of jobs) {
    if (sent >= limit) break;
    sent += job.texts.length;
    used += 1;
    // eslint-disable-next-line no-await-in-loop
    const translated = await translateList(job.texts, job.from, job.target);
    done += applyJob(job, translated);
  }

  return { translated: done, fields: used, skipped: jobs.length - used };
}
