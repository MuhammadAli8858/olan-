// ---------------------------------------------------------------------------
// Единый бэкенд проекта OLAN.
// Обслуживает сразу три фронтенда:
//   • основной сайт      (apps/site,     порт 5173) — чат, заявки, контент
//   • админ-панель       (apps/admin,    порт 9000) — редактирование контента
//   • кабинет оператора  (apps/operator, порт 9090) — переписка с клиентами
//
// Контент сайта хранится НЕ в базе, а прямо в apps/site/src/app/data/siteData.js,
// поэтому изменения из админки видны в коде, а изменения в коде — в админке.
// ---------------------------------------------------------------------------

import './env.js';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SiteDataFile } from './siteDataFile.js';
import { createStaticHandler } from './static.js';
import { Staff } from './users.js';
import { localName, needsExternalTranslation, transliterate } from './translit.js';
import { translateOne, syncOnSave, fillMissing, countMissing, AUTO_LANGS, MANUAL_LANGS } from './translate.js';
import { pushFile, checkAccess, gitConfig } from './github.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Где хранить рабочие данные: чаты, заявки, учётки, бэкапы.
//
// На своём компьютере это server/data внутри проекта. На хостинге вроде
// Render папка проекта пересоздаётся при каждом деплое, поэтому туда
// подключают постоянный диск и указывают его в DATA_DIR — иначе переписка
// и созданные сотрудники пропадут при первом же обновлении.
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data');
const backupsDir = path.join(dataDir, 'backups');
const messagesFile = path.join(dataDir, 'messages.json');
const chatsFile = path.join(dataDir, 'chats.json');
const snapshotFile = path.join(dataDir, 'original-content.json');
const usersFile = path.join(dataDir, 'users.json');
const assignmentsFile = path.join(dataDir, 'assignments.json');
const sessionsFile = path.join(dataDir, 'sessions.json');
const seedFile = path.join(__dirname, 'content.seed.json');

// Файл контента сайта.
//
// По умолчанию — тот, что лежит в проекте: правки из админки видны в коде,
// как и задумано при локальной работе.
//
// На хостинге его переносят на постоянный диск через SITE_DATA_FILE.
// Тогда правки переживают деплой, но в репозиторий уже не попадают —
// это осознанный размен, о нём написано в README.
const repoSiteDataPath = path.join(rootDir, 'apps', 'site', 'src', 'app', 'data', 'siteData.js');
const siteDataPath = process.env.SITE_DATA_FILE
  ? path.resolve(process.env.SITE_DATA_FILE)
  : repoSiteDataPath;

mkdirSync(dataDir, { recursive: true });

// Первый запуск на постоянном диске: файла контента там ещё нет,
// поэтому копируем его из репозитория, чтобы сайт не остался пустым.
if (siteDataPath !== repoSiteDataPath && !existsSync(siteDataPath)) {
  try {
    mkdirSync(path.dirname(siteDataPath), { recursive: true });
    writeFileSync(siteDataPath, readFileSync(repoSiteDataPath, 'utf8'), 'utf8');
    console.log(`[content] Контент скопирован на постоянный диск: ${siteDataPath}`);
  } catch (error) {
    console.error('[content] Не удалось создать файл контента:', error.message);
  }
}
mkdirSync(backupsDir, { recursive: true });
if (!existsSync(messagesFile)) writeFileSync(messagesFile, '[]', 'utf8');
if (!existsSync(chatsFile)) writeFileSync(chatsFile, '{}', 'utf8');

// Номер версии берём из package.json, чтобы он был в одном месте.
const APP_VERSION = (readJsonSafe(path.join(rootDir, 'package.json')) || {}).version || '0.0.0';

const siteData = new SiteDataFile(siteDataPath, backupsDir);
const staff = new Staff(usersFile, assignmentsFile, sessionsFile);

const ADMIN_KEY = process.env.ADMIN_KEY || 'admin1971';
const ADMIN_USER = process.env.ADMIN_USER || 'user';

function readJsonSafe(filePath) {
  try { return JSON.parse(readFileSync(filePath, 'utf8')); } catch { return null; }
}

function readJson(filePath, fallback) {
  try { return JSON.parse(readFileSync(filePath, 'utf8')); } catch { return fallback; }
}
function writeJson(filePath, value) {
  writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

// Хранилище чатов в памяти + запись на диск.
let chats = readJson(chatsFile, {});
function persistChats() { writeJson(chatsFile, chats); }
function publicMessages(session) {
  return session.messages.map((m) => ({ id: m.id, from: m.from, text: m.text, at: m.at }));
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  response.end(JSON.stringify(payload));
}

// Тело запроса собираем БАЙТАМИ и только в конце переводим в текст.
//
// Почему так важно: русская или китайская буква занимает несколько байт,
// и она запросто оказывается на границе двух сетевых кусков. Если склеивать
// куски как строки (body += chunk), такая буква разваливается на два знака
// «?» — и контент сайта тихо портится при каждом сохранении из админки.
function parseBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      chunks.push(chunk);
      size += chunk.length;
      if (size > 20_000_000) { request.destroy(); reject(new Error('Payload too large')); }
    });
    request.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve(body ? JSON.parse(body) : {});
      } catch { reject(new Error('Invalid JSON body')); }
    });
    request.on('error', reject);
  });
}

// ---------- Чат (для клиента на основном сайте) ----------
function handleChatStart(body, response) {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  if (!name || !email || !phone) {
    json(response, 400, { message: 'Имя, email и телефон обязательны.' });
    return;
  }
  const id = randomUUID();
  // Клиент закрепляется за оператором: случайно, но один раз и навсегда.
  // Если этот же человек уже писал или оставлял заявку — попадёт к тому же.
  const operatorId = staff.assignOperator({ email, phone });
  chats[id] = { id, name, email, phone, operatorId, createdAt: new Date().toISOString(), messages: [] };
  persistChats();
  console.log(`[chat] Новый чат #${id} — ${name} (${email}) → оператор ${staff.operatorName(operatorId) || 'не назначен'}`);
  // Отдаём имя оператора со всеми переводами: сайт покажет его на своём языке.
  json(response, 200, { sessionId: id, messages: [], operatorNames: staff.operatorNames(operatorId) });
}

function handleChatSend(body, response) {
  const sessionId = String(body.sessionId || '');
  const text = String(body.text || '').trim();
  const session = chats[sessionId];
  if (!session) { json(response, 404, { message: 'Сессия не найдена.' }); return; }
  if (!text) { json(response, 400, { message: 'Пустое сообщение.' }); return; }
  const message = { id: randomUUID(), from: 'user', text, at: new Date().toISOString() };
  session.messages.push(message);
  persistChats();
  console.log(`[chat] #${sessionId} ${session.name}: ${text}`);
  json(response, 200, { ok: true, message: { id: message.id, from: message.from, text: message.text, at: message.at } });
}

function handleChatHistory(response, query) {
  const sessionId = query.get('sessionId') || '';
  const after = Number(query.get('after') || 0);
  const session = chats[sessionId];
  if (!session) { json(response, 404, { message: 'Сессия не найдена.' }); return; }
  const all = publicMessages(session);
  json(response, 200, {
    total: all.length,
    messages: all.slice(after),
    operatorNames: staff.operatorNames(session.operatorId),
  });
}

// ---------- Кабинет оператора ----------
// Сотрудник узнаётся по токену, который выдаётся при входе.
function staffFromRequest(query, body) {
  const token = (query && query.get && query.get('key')) || (body && body.key) || '';
  return staff.userByToken(token);
}

function handleOperatorChats(response, query) {
  const user = staffFromRequest(query);
  if (!user) { json(response, 401, { message: 'Сессия недействительна.' }); return; }
  // Оператор видит только свои чаты, менеджер — чаты всех своих операторов.
  const allowed = new Set(staff.visibleOperatorIds(user));
  const list = Object.values(chats)
    .filter((c) => allowed.has(c.operatorId))
    .map((s) => {
      const last = s.messages[s.messages.length - 1];
      return {
        sessionId: s.id, name: s.name, email: s.email, phone: s.phone,
        operatorId: s.operatorId,
        operatorName: staff.operatorName(s.operatorId),
        total: s.messages.length,
        lastFrom: last ? last.from : null,
        lastText: last ? last.text : '',
        lastAt: last ? last.at : s.createdAt,
        createdAt: s.createdAt,
      };
    })
    .sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
  json(response, 200, { chats: list });
}

function handleOperatorHistory(response, query) {
  const user = staffFromRequest(query);
  if (!user) { json(response, 401, { message: 'Сессия недействительна.' }); return; }
  const sessionId = query.get('sessionId') || '';
  const session = chats[sessionId];
  if (!session) { json(response, 404, { message: 'Сессия не найдена.' }); return; }
  if (!staff.visibleOperatorIds(user).includes(session.operatorId)) {
    json(response, 403, { message: 'Этот чат закреплён за другим оператором.' });
    return;
  }
  json(response, 200, {
    sessionId, name: session.name, email: session.email, phone: session.phone,
    operatorName: staff.operatorName(session.operatorId),
    messages: publicMessages(session),
  });
}

function handleOperatorReply(body, response) {
  const user = staffFromRequest(null, body);
  if (!user) { json(response, 401, { message: 'Сессия недействительна.' }); return; }
  // Отвечать клиенту может только оператор. Менеджер и админ — только читают.
  if (staff.roleOf(user) !== 'operator') {
    json(response, 403, { message: 'Менеджер может только читать переписку.' });
    return;
  }
  const sessionId = String(body.sessionId || '');
  const text = String(body.text || '').trim();
  const session = chats[sessionId];
  if (!session) { json(response, 404, { message: 'Сессия не найдена.' }); return; }
  if (!text) { json(response, 400, { message: 'Пустое сообщение.' }); return; }
  if (!staff.visibleOperatorIds(user).includes(session.operatorId)) {
    json(response, 403, { message: 'Этот чат закреплён за другим оператором.' });
    return;
  }
  const message = { id: randomUUID(), from: 'operator', text, at: new Date().toISOString(), by: user.name };
  session.messages.push(message);
  persistChats();
  console.log(`[chat] #${sessionId} ОПЕРАТОР: ${text}`);
  json(response, 200, { ok: true });
}

// ---------- Заявки с формы ----------
function handleContact(body, response) {
  if (!body.name || !body.email || !body.phone || !body.message) {
    json(response, 400, { message: 'Все поля обязательны.' });
    return;
  }
  const email = String(body.email).trim();
  const phone = String(body.phone).trim();
  // Тот же механизм, что и в чате: если клиент уже писал — заявка уйдёт
  // тому же оператору. Если это первое обращение — оператор выбирается случайно.
  const operatorId = staff.assignOperator({ email, phone });
  const messages = readJson(messagesFile, []);
  const item = {
    id: randomUUID(),
    name: String(body.name).trim(),
    email,
    phone,
    message: String(body.message).trim(),
    operatorId,
    // Заявка проходит три состояния: new → in_progress → done.
    status: 'new',
    statusAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  messages.push(item);
  writeJson(messagesFile, messages);
  console.log(`[contact] Заявка от ${item.name} (${email}) → оператор ${staff.operatorName(operatorId) || 'не назначен'}`);
  json(response, 200, { ok: true, message: 'Заявка сохранена.' });
}

function handleAdminMessages(response, query) {
  const key = query.get('key') || '';
  if (key !== ADMIN_KEY) { json(response, 401, { message: 'Неверный ключ администратора.' }); return; }
  json(response, 200, { messages: readJson(messagesFile, []) });
}

// ---------- Контент сайта: читаем и пишем прямо в siteData.js ----------
async function handleGetContent(response) {
  try {
    const content = await siteData.read();
    json(response, 200, content);
  } catch (error) {
    console.error('[content] Не удалось прочитать siteData.js:', error.message);
    json(response, 500, { message: `Не удалось прочитать siteData.js: ${error.message}` });
  }
}

// Лёгкий эндпоинт: админка опрашивает его и узнаёт, что файл правили в коде.
function handleContentVersion(response) {
  siteData.refreshVersion();
  json(response, 200, { version: siteData.version, stamp: siteData.stamp(), file: siteDataPath });
}

async function handleAdminSave(body, response) {
  if (!body || body.key !== ADMIN_KEY) {
    json(response, 401, { message: 'Неверный ключ администратора.' });
    return;
  }
  const content = body.content;
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    json(response, 400, { message: 'Некорректные данные контента.' });
    return;
  }

  // Перед записью до��олняем русский, английский и узбекский.
  // Смотрим, что изменилось с прошлого сохранения: правили русский —
  // обновятся английский и узбекский, добавили новую карточку — переведётся
  // целиком. Китайский и арабский остаются такими, какими их сделал человек.
  let auto = { translated: 0, fields: 0 };
  if (body.autoTranslate !== false) {
    try {
      const previous = await siteData.read().catch(() => ({}));
      auto = await syncOnSave(previous, content, { targets: AUTO_LANGS });
      if (auto.translated) {
        console.log(`[translate] Автоперевод при сохранении: ${auto.translated} строк в ${auto.fields} полях.`);
      }
      if (auto.skipped) {
        console.log(`[translate] Осталось ${auto.skipped} полей — доберём при следующем сохранении или кнопкой «Перевести сайт».`);
      }
    } catch (error) {
      // Нет интернета — не повод терять правки. Сохраняем как есть.
      console.warn('[translate] Автоперевод пропущен:', error.message);
    }
  }

  try {
    siteData.write(content);
    console.log('[admin] siteData.js перезаписан из админ-панели.');

    // Возвращаем правку в репозиторий, чтобы она оказалась и в исходном коде.
    // Настроено это или нет — сохранение в любом случае уже состоялось.
    const published = await publishToGit('после сохранения');

    json(response, 200, {
      ok: true,
      version: siteData.version,
      file: siteDataPath,
      content,
      autoTranslated: auto.translated,
      published,
    });
  } catch (error) {
    console.error('[admin] Ошибка записи siteData.js:', error.message);
    json(response, 500, { message: `Не удалось записать siteData.js: ${error.message}` });
  }
}

// ---------- Выгрузка контента обратно в репозиторий ----------
// На своём компьютере админка правит файл прямо в проекте, и код уже свежий.
// На хостинге контент лежит на диске, поэтому его надо отдельно закоммитить.
async function publishToGit(reason) {
  const cfg = gitConfig();
  if (!cfg.configured || !cfg.auto) return null;
  try {
    const result = await pushFile(siteDataPath, {});
    if (result.skipped) return { ok: true, skipped: true };
    console.log(`[git] Контент отправлен в ${result.repo}@${result.branch} (${reason}), коммит ${result.sha}.`);
    return result;
  } catch (error) {
    // Не удалось — правки всё равно сохранены на диске и на сайте.
    console.warn('[git] Не удалось выгрузить контент в репозиторий:', error.message);
    return { ok: false, message: error.message };
  }
}

async function handleAdminPublish(body, response) {
  if (!body || body.key !== ADMIN_KEY) {
    json(response, 401, { message: 'Неверный ключ администратора.' });
    return;
  }
  const cfg = gitConfig();
  if (!cfg.configured) {
    json(response, 400, { message: 'Выгрузка в GitHub не настроена. Добавьте GITHUB_TOKEN и GITHUB_REPO в переменные окружения.' });
    return;
  }
  try {
    const result = await pushFile(siteDataPath, { message: body.message });
    if (result.skipped) { json(response, 200, { ok: true, skipped: true, message: result.reason }); return; }
    console.log(`[git] Контент отправлен вручную, коммит ${result.sha}.`);
    json(response, 200, result);
  } catch (error) {
    json(response, 500, { message: error.message });
  }
}

async function handlePublishStatus(response, query) {
  if ((query.get('key') || '') !== ADMIN_KEY) {
    json(response, 401, { message: 'Неверный ключ администратора.' });
    return;
  }
  // Локальный запуск: файл и так лежит в проекте, выгружать никуда не нужно.
  const local = siteDataPath === repoSiteDataPath;
  json(response, 200, { ...(await checkAccess()), local, file: siteDataPath });
}

// Скачать текущий siteData.js — запасной путь, если GitHub не настроен:
// файл кладут в проект руками и коммитят.
function handleDownloadContentFile(response, query) {
  if ((query.get('key') || '') !== ADMIN_KEY) {
    json(response, 401, { message: 'Неверный ключ администратора.' });
    return;
  }
  try {
    const text = readFileSync(siteDataPath, 'utf8');
    response.writeHead(200, {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Content-Disposition': 'attachment; filename="siteData.js"',
    });
    response.end(text);
  } catch (error) {
    json(response, 500, { message: `Не удалось прочитать файл: ${error.message}` });
  }
}

// ---------- Перевод всего сайта разом ----------
// Админка вызывает этот эндпоинт по кругу, порциями: так видно прогресс,
// а запрос не висит несколько минут и не обрывается по таймауту.
async function handleAdminTranslateAll(body, response) {
  if (!body || body.key !== ADMIN_KEY) {
    json(response, 401, { message: 'Неверный ключ администратора.' });
    return;
  }
  const targets = Array.isArray(body.targets) && body.targets.length ? body.targets : AUTO_LANGS;
  const source = body.from || 'ru';
  const force = body.force === true;
  const limit = Number(body.limit) > 0 ? Number(body.limit) : 60;

  try {
    const content = await siteData.read();
    const result = await fillMissing(content, { targets, source, force, limit });
    if (result.translated) siteData.write(content);
    const remaining = countMissing(content, { targets, source, force });
    console.log(`[translate] Перевод сайта: +${result.translated} строк, осталось ${remaining}.`);
    json(response, 200, {
      ok: true,
      translated: result.translated,
      fields: result.fields,
      remaining,
      done: remaining === 0,
      version: siteData.version,
    });
  } catch (error) {
    console.error('[translate] Ошибка перевода сайта:', error.message);
    json(response, 500, { message: `Не удалось перевести: ${error.message}` });
  }
}

// Сколько строк ещё не переведено — админка показывает это числом.
async function handleTranslateStatus(response, query) {
  if ((query.get('key') || '') !== ADMIN_KEY) {
    json(response, 401, { message: 'Неверный ключ администратора.' });
    return;
  }
  try {
    const content = await siteData.read();
    const auto = countMissing(content, { targets: AUTO_LANGS });
    const manual = countMissing(content, { targets: MANUAL_LANGS });
    json(response, 200, { auto, manual, autoLangs: AUTO_LANGS, manualLangs: MANUAL_LANGS });
  } catch (error) {
    json(response, 500, { message: error.message });
  }
}

function handleAdminResetContent(body, response) {
  if (!body || body.key !== ADMIN_KEY) {
    json(response, 401, { message: 'Неверный ключ администратора.' });
    return;
  }
  try {
    const snapshot = readJson(snapshotFile, null) || readJson(seedFile, null);
    if (!snapshot) { json(response, 500, { message: 'Исходный снимок контента не найден.' }); return; }
    siteData.write(snapshot);
    console.log('[admin] Контент сброшен к исходному состоянию.');
    json(response, 200, { ok: true, version: siteData.version });
  } catch (error) {
    json(response, 500, { message: `Не удалось сбросить контент: ${error.message}` });
  }
}

// ---------- Автоперевод ----------
// Сам переводчик вынесен в server/translate.js: там же правила о том,
// какие языки заполняются сами (ru/en/uz), а какие только вручную (zh/ar).

// Языки, на которые переводим имена сотрудников. Берём из контента сайта,
// чтобы список совпадал с переключателем языков.
async function siteLanguages() {
  try {
    const content = await siteData.read();
    const codes = (content.LANGUAGE_OPTIONS || []).map((l) => l.code).filter(Boolean);
    if (codes.length) return codes;
  } catch { /* ниже подстраховка */ }
  return ['ru', 'uz', 'en'];
}

// Записывает имя сотрудника буквами каждого языка сайта.
// Кириллица и латиница считаются локально и мгновенно. Для языков с другой
// письменностью (например, китайского) пробуем внешний переводчик, а если он
// недоступен — оставляем латиницу, чтобы имя всё равно читалось.
async function translateStaffName(id, name) {
  try {
    const languages = await siteLanguages();
    const translations = {};

    for (const lang of languages) {
      translations[lang] = localName(name, lang);
    }
    // Сразу сохраняем офлайн-вариант: он не зависит от интернета.
    staff.setNameTranslations(id, translations);

    const remote = languages.filter(needsExternalTranslation);
    if (!remote.length) return;

    const extra = {};
    for (const lang of remote) {
      // eslint-disable-next-line no-await-in-loop
      const value = await translateOne(name, 'ru', lang);
      if (value && value !== name) extra[lang] = value;
    }
    if (Object.keys(extra).length) staff.setNameTranslations(id, extra);
  } catch (error) {
    console.warn('[staff] Не удалось подготовить имя на других языках:', error.message);
  }
}

async function handleAdminTranslate(body, response) {
  if (!body || body.key !== ADMIN_KEY) {
    json(response, 401, { message: 'Неверный ключ администратора.' });
    return;
  }
  const from = body.from || 'ru';
  const to = Array.isArray(body.to) ? body.to : [];
  const texts = Array.isArray(body.texts) ? body.texts.map((t) => (t == null ? '' : String(t))) : [];
  const translations = {};
  for (const lang of to) {
    if (lang === from) {
      translations[lang] = texts.slice();
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    translations[lang] = await Promise.all(texts.map((t) => translateOne(t, from, lang)));
  }
  json(response, 200, { translations });
}

// ---------- Вход по логину и паролю ----------
function handleOperatorLogin(body, response) {
  const user = staff.authenticate(body && body.login, body && body.password);
  if (!user) { json(response, 401, { message: 'Неверный логин или пароль.' }); return; }
  const token = staff.createSession(user);
  const role = staff.roleOf(user);
  console.log(`[cabinet] Вошёл ${role === 'manager' ? 'менеджер' : 'оператор'} ${user.name}`);
  json(response, 200, { ok: true, token, role, name: user.name, id: user.id });
}

// Кто я. Кабинет спрашивает это при загрузке, чтобы показать имя и роль.
function handleOperatorMe(response, query) {
  const user = staffFromRequest(query);
  if (!user) { json(response, 401, { message: 'Сессия недействительна.' }); return; }
  const role = staff.roleOf(user);
  json(response, 200, {
    id: user.id, name: user.name, login: user.login, role,
    operators: role === 'manager' ? staff.operatorsOfManager(user.id).map((o) => ({ id: o.id, name: o.name })) : [],
  });
}

function handleOperatorLogout(body, response) {
  if (body && body.key) staff.dropSession(body.key);
  json(response, 200, { ok: true });
}

// Заявки, закреплённые за этим оператором (или за операторами менеджера).
function handleOperatorRequests(response, query) {
  const user = staffFromRequest(query);
  if (!user) { json(response, 401, { message: 'Сессия недействительна.' }); return; }
  const allowed = new Set(staff.visibleOperatorIds(user));
  const list = readJson(messagesFile, [])
    .filter((m) => allowed.has(m.operatorId))
    .map((m) => ({ ...m, operatorName: staff.operatorName(m.operatorId) }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  json(response, 200, { requests: list });
}

// ---------- Общий раздел «Входящие» ----------
// Одни и те же данные нужны трём ролям, поэтому маршруты общие:
//   • администратор — видит всех операторов, только читает;
//   • менеджер      — видит своих операторов, только читает;
//   • оператор      — видит себя, может отвечать и менять статус заявок.
// Редактировать переписку не может никто, кроме самого оператора.

const REQUEST_STATUSES = ['new', 'in_progress', 'done'];

function viewerFromRequest(query, body) {
  const key = (query && query.get && query.get('key')) || (body && body.key) || '';
  if (key && key === ADMIN_KEY) return { kind: 'admin', role: 'admin', canWrite: false };
  const user = staff.userByToken(key);
  if (!user) return null;
  const role = staff.roleOf(user);
  return { kind: 'staff', role, user, canWrite: role === 'operator' };
}

// Каких операторов видит эта роль.
function viewerOperators(viewer) {
  if (viewer.kind === 'admin') return staff.data.operators;
  if (viewer.role === 'manager') return staff.operatorsOfManager(viewer.user.id);
  return [viewer.user];
}

function viewerOperatorIds(viewer, requestedId) {
  const own = viewerOperators(viewer).map((o) => o.id);
  if (!requestedId) return own;
  return own.includes(requestedId) ? [requestedId] : [];
}

function handleInboxOperators(response, query) {
  const viewer = viewerFromRequest(query);
  if (!viewer) { json(response, 401, { message: 'Нет доступа.' }); return; }
  const messages = readJson(messagesFile, []);
  const list = viewerOperators(viewer).map((o) => {
    const requests = messages.filter((m) => m.operatorId === o.id);
    const sessions = Object.values(chats).filter((c) => c.operatorId === o.id);
    return {
      id: o.id,
      name: o.name,
      login: o.login,
      managerId: o.managerId,
      chats: sessions.length,
      // Сколько чатов ждут ответа оператора.
      waiting: sessions.filter((c) => {
        const last = c.messages[c.messages.length - 1];
        return last && last.from === 'user';
      }).length,
      requests: requests.length,
      newRequests: requests.filter((m) => (m.status || 'new') === 'new').length,
    };
  });
  json(response, 200, {
    role: viewer.role,
    canWrite: viewer.canWrite,
    operators: list,
  });
}

function handleInboxChats(response, query) {
  const viewer = viewerFromRequest(query);
  if (!viewer) { json(response, 401, { message: 'Нет доступа.' }); return; }
  const allowed = new Set(viewerOperatorIds(viewer, query.get('operatorId') || ''));
  const list = Object.values(chats)
    .filter((c) => allowed.has(c.operatorId))
    .map((c) => {
      const last = c.messages[c.messages.length - 1];
      return {
        sessionId: c.id, name: c.name, email: c.email, phone: c.phone,
        operatorId: c.operatorId, operatorName: staff.operatorName(c.operatorId),
        total: c.messages.length,
        lastFrom: last ? last.from : null,
        lastText: last ? last.text : '',
        lastAt: last ? last.at : c.createdAt,
        createdAt: c.createdAt,
      };
    })
    .sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
  json(response, 200, { chats: list, canWrite: viewer.canWrite });
}

function handleInboxThread(response, query) {
  const viewer = viewerFromRequest(query);
  if (!viewer) { json(response, 401, { message: 'Нет доступа.' }); return; }
  const session = chats[query.get('sessionId') || ''];
  if (!session) { json(response, 404, { message: 'Чат не найден.' }); return; }
  if (!viewerOperatorIds(viewer).includes(session.operatorId)) {
    json(response, 403, { message: 'Этот чат закреплён за другим оператором.' });
    return;
  }
  json(response, 200, {
    sessionId: session.id, name: session.name, email: session.email, phone: session.phone,
    operatorName: staff.operatorName(session.operatorId),
    createdAt: session.createdAt,
    messages: publicMessages(session),
    // Отвечать может только сам оператор. Админ и менеджер — только читают.
    canWrite: viewer.canWrite && viewer.user && viewer.user.id === session.operatorId,
  });
}

function handleInboxRequests(response, query) {
  const viewer = viewerFromRequest(query);
  if (!viewer) { json(response, 401, { message: 'Нет доступа.' }); return; }
  const allowed = new Set(viewerOperatorIds(viewer, query.get('operatorId') || ''));
  const status = query.get('status') || '';
  const list = readJson(messagesFile, [])
    .filter((m) => allowed.has(m.operatorId))
    .filter((m) => !status || (m.status || 'new') === status)
    .map((m) => ({ ...m, status: m.status || 'new', operatorName: staff.operatorName(m.operatorId) }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  json(response, 200, { requests: list, canWrite: viewer.canWrite });
}

// Сводка по заявкам: сколько новых, в работе и обработанных.
function handleInboxStats(response, query) {
  const viewer = viewerFromRequest(query);
  if (!viewer) { json(response, 401, { message: 'Нет доступа.' }); return; }
  const allowed = new Set(viewerOperatorIds(viewer, query.get('operatorId') || ''));
  const list = readJson(messagesFile, []).filter((m) => allowed.has(m.operatorId));
  const counts = { new: 0, in_progress: 0, done: 0 };
  let lastAt = null;
  for (const item of list) {
    const status = REQUEST_STATUSES.includes(item.status) ? item.status : 'new';
    counts[status] += 1;
    if (!lastAt || new Date(item.createdAt) > new Date(lastAt)) lastAt = item.createdAt;
  }
  json(response, 200, { counts, total: list.length, lastAt, canWrite: viewer.canWrite });
}

function handleInboxRequestStatus(body, response) {
  const viewer = viewerFromRequest(null, body);
  if (!viewer) { json(response, 401, { message: 'Нет доступа.' }); return; }
  if (!viewer.canWrite) {
    json(response, 403, { message: 'Статус заявки меняет только оператор.' });
    return;
  }
  const status = String(body.status || '');
  if (!REQUEST_STATUSES.includes(status)) { json(response, 400, { message: 'Неизвестный статус.' }); return; }
  const messages = readJson(messagesFile, []);
  const item = messages.find((m) => m.id === body.id);
  if (!item) { json(response, 404, { message: 'Заявка не найдена.' }); return; }
  if (item.operatorId !== viewer.user.id) {
    json(response, 403, { message: 'Эта заявка закреплена за другим оператором.' });
    return;
  }
  item.status = status;
  item.statusAt = new Date().toISOString();
  writeJson(messagesFile, messages);
  console.log(`[request] ${viewer.user.name}: заявка от ${item.name} → ${status}`);
  json(response, 200, { ok: true, request: item });
}

// ---------- Загрузка картинок с компьютера администратора ----------
// Файл приходит строкой data:image/png;base64,... и сохраняется в
// apps/site/public/products/. В контенте остаётся короткий путь
// вида /products/имя.png — тот же, что и раньше при ручном вводе.

// Куда складывать загруженные картинки. На хостинге — на постоянный диск,
// иначе они исчезнут вместе с папкой проекта при следующем деплое.
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(rootDir, 'apps', 'site', 'public', 'products');

const ALLOWED_IMAGE_TYPES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 МБ

// Приводим имя файла к безопасному виду: только латиница, цифры и дефис.
// Кириллицу транслитерируем — иначе путь в адресе браузера превращается
// в нечитаемый набор процентов и часть серверов такие файлы не отдаёт.
function safeFileName(original, extension) {
  const base = transliterate(String(original || 'image').replace(/\.[^.]*$/, ''), 'en')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'image';
  const stamp = Date.now().toString(36);
  return `${base}-${stamp}${extension}`;
}

function handleAdminUpload(body, response) {
  if (!body || body.key !== ADMIN_KEY) {
    json(response, 401, { message: 'Неверный ключ администратора.' });
    return;
  }

  const dataUrl = String(body.dataUrl || '');
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) { json(response, 400, { message: 'Файл не распознан. Выберите картинку заново.' }); return; }

  const mime = match[1].toLowerCase();
  const extension = ALLOWED_IMAGE_TYPES[mime];
  if (!extension) {
    json(response, 400, { message: 'Можно загружать только картинки: PNG, JPG, WEBP, GIF или AVIF.' });
    return;
  }

  let buffer;
  try { buffer = Buffer.from(match[2], 'base64'); }
  catch { json(response, 400, { message: 'Файл повреждён.' }); return; }

  if (buffer.length === 0) { json(response, 400, { message: 'Файл пустой.' }); return; }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    json(response, 413, { message: `Файл больше 10 МБ (${(buffer.length / 1048576).toFixed(1)} МБ). Сожмите картинку.` });
    return;
  }

  try {
    mkdirSync(UPLOAD_DIR, { recursive: true });
    const fileName = safeFileName(body.name, extension);
    writeFileSync(path.join(UPLOAD_DIR, fileName), buffer);
    const publicPath = `/products/${fileName}`;
    console.log(`[upload] Картинка сохранена: ${publicPath} (${(buffer.length / 1024).toFixed(0)} КБ)`);
    json(response, 200, { ok: true, path: publicPath, size: buffer.length });
  } catch (error) {
    console.error('[upload] Ошибка сохранения:', error.message);
    json(response, 500, { message: `Не удалось сохранить файл: ${error.message}` });
  }
}

// ---------- Управление сотрудниками (только администратор) ----------
function adminOk(value) { return value === ADMIN_KEY; }

function handleAdminUsers(response, query) {
  if (!adminOk(query.get('key'))) { json(response, 401, { message: 'Неверный ключ администратора.' }); return; }
  json(response, 200, staff.tree());
}

function handleAdminUserCreate(body, response) {
  if (!adminOk(body && body.key)) { json(response, 401, { message: 'Неверный ключ администратора.' }); return; }
  try {
    const user = staff.create(body);
    console.log(`[staff] Создан ${body.role === 'manager' ? 'менеджер' : 'оператор'} ${user.name}`);
    translateStaffName(user.id, user.name);
    json(response, 200, { ok: true, user, tree: staff.tree() });
  } catch (error) {
    json(response, 400, { message: error.message });
  }
}

function handleAdminUserUpdate(body, response) {
  if (!adminOk(body && body.key)) { json(response, 401, { message: 'Неверный ключ администратора.' }); return; }
  try {
    const user = staff.update(body.id, body.patch || {});
    if (body.patch && body.patch.name) translateStaffName(user.id, user.name);
    console.log(`[staff] Изменён ${user.name}`);
    json(response, 200, { ok: true, user, tree: staff.tree() });
  } catch (error) {
    json(response, 400, { message: error.message });
  }
}

function handleAdminUserDelete(body, response) {
  if (!adminOk(body && body.key)) { json(response, 401, { message: 'Неверный ключ администратора.' }); return; }
  try {
    const removedId = body.id;
    const result = staff.remove(removedId);

    if (result.role === 'operator') {
      // Уже существующие чаты и заявки удалённого оператора тоже надо кому-то
      // передать. assignOperator вернёт нового оператора этого клиента —
      // того самого, к которому клиент только что перешёл.
      let movedChats = 0;
      for (const session of Object.values(chats)) {
        if (session.operatorId !== removedId) continue;
        session.operatorId = staff.assignOperator({ email: session.email, phone: session.phone });
        movedChats += 1;
      }
      if (movedChats) persistChats();

      const messages = readJson(messagesFile, []);
      let movedRequests = 0;
      for (const item of messages) {
        if (item.operatorId !== removedId) continue;
        item.operatorId = staff.assignOperator({ email: item.email, phone: item.phone });
        movedRequests += 1;
      }
      if (movedRequests) writeJson(messagesFile, messages);

      if (movedChats || movedRequests) {
        console.log(`[staff] Передано другим операторам: чатов ${movedChats}, заявок ${movedRequests}`);
      }
    }

    if (result.moved.length) {
      result.moved.forEach((m) => console.log(`[staff] Оператор ${m.operator} → менеджер ${m.manager || 'не назначен'}`));
    }
    console.log(`[staff] Удалён ${result.name}`);
    json(response, 200, { ok: true, ...result, tree: staff.tree() });
  } catch (error) {
    json(response, 400, { message: error.message });
  }
}

function handleAdminLogin(body, response) {
  if (!body || body.login !== ADMIN_USER || body.password !== ADMIN_KEY) {
    json(response, 401, { message: 'Неверный логин или пароль.' });
    return;
  }
  json(response, 200, { ok: true });
}

// ---------- HTTP-сервер ----------
const server = createServer(async (request, response) => {
  if (!request.url) { json(response, 404, { message: 'Not found' }); return; }
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    response.end();
    return;
  }
  const url = new URL(request.url, 'http://localhost');
  const { pathname } = url;
  const query = url.searchParams;
  try {
    if (request.method === 'GET' && pathname === '/api/health') {
      json(response, 200, { ok: true, siteDataFile: siteDataPath, contentVersion: siteData.version });
      return;
    }

    if (request.method === 'POST' && pathname === '/api/operator/login') { handleOperatorLogin(await parseBody(request), response); return; }
    if (request.method === 'POST' && pathname === '/api/admin/login') { handleAdminLogin(await parseBody(request), response); return; }

    if (request.method === 'POST' && pathname === '/api/chat/start') { handleChatStart(await parseBody(request), response); return; }
    if (request.method === 'POST' && pathname === '/api/chat/send') { handleChatSend(await parseBody(request), response); return; }
    if (request.method === 'GET' && pathname === '/api/chat/history') { handleChatHistory(response, query); return; }

    if (request.method === 'GET' && pathname === '/api/operator/chats') { handleOperatorChats(response, query); return; }
    if (request.method === 'GET' && pathname === '/api/operator/history') { handleOperatorHistory(response, query); return; }
    if (request.method === 'POST' && pathname === '/api/operator/reply') { handleOperatorReply(await parseBody(request), response); return; }
    if (request.method === 'GET' && pathname === '/api/operator/me') { handleOperatorMe(response, query); return; }
    if (request.method === 'GET' && pathname === '/api/operator/requests') { handleOperatorRequests(response, query); return; }
    if (request.method === 'POST' && pathname === '/api/operator/logout') { handleOperatorLogout(await parseBody(request), response); return; }

    if (request.method === 'GET' && pathname === '/api/inbox/operators') { handleInboxOperators(response, query); return; }
    if (request.method === 'GET' && pathname === '/api/inbox/chats') { handleInboxChats(response, query); return; }
    if (request.method === 'GET' && pathname === '/api/inbox/thread') { handleInboxThread(response, query); return; }
    if (request.method === 'GET' && pathname === '/api/inbox/requests') { handleInboxRequests(response, query); return; }
    if (request.method === 'GET' && pathname === '/api/inbox/stats') { handleInboxStats(response, query); return; }
    if (request.method === 'POST' && pathname === '/api/inbox/request-status') { handleInboxRequestStatus(await parseBody(request), response); return; }

    if (request.method === 'POST' && pathname === '/api/admin/upload') { handleAdminUpload(await parseBody(request), response); return; }

    if (request.method === 'GET' && pathname === '/api/admin/users') { handleAdminUsers(response, query); return; }
    if (request.method === 'POST' && pathname === '/api/admin/users/create') { handleAdminUserCreate(await parseBody(request), response); return; }
    if (request.method === 'POST' && pathname === '/api/admin/users/update') { handleAdminUserUpdate(await parseBody(request), response); return; }
    if (request.method === 'POST' && pathname === '/api/admin/users/delete') { handleAdminUserDelete(await parseBody(request), response); return; }

    if (request.method === 'POST' && pathname === '/api/contact') { handleContact(await parseBody(request), response); return; }
    if (request.method === 'GET' && pathname === '/api/admin/messages') { handleAdminMessages(response, query); return; }

    if (request.method === 'GET' && pathname === '/api/content') { await handleGetContent(response); return; }
    if (request.method === 'GET' && pathname === '/api/content/version') { handleContentVersion(response); return; }
    if (request.method === 'POST' && pathname === '/api/admin/save') { await handleAdminSave(await parseBody(request), response); return; }
    if (request.method === 'POST' && pathname === '/api/admin/translate-all') { await handleAdminTranslateAll(await parseBody(request), response); return; }
    if (request.method === 'GET' && pathname === '/api/admin/translate/status') { await handleTranslateStatus(response, query); return; }
    if (request.method === 'POST' && pathname === '/api/admin/publish') { await handleAdminPublish(await parseBody(request), response); return; }
    if (request.method === 'GET' && pathname === '/api/admin/publish/status') { await handlePublishStatus(response, query); return; }
    if (request.method === 'GET' && pathname === '/api/admin/content/file') { handleDownloadContentFile(response, query); return; }
    if (request.method === 'POST' && pathname === '/api/admin/reset') { handleAdminResetContent(await parseBody(request), response); return; }
    if (request.method === 'POST' && pathname === '/api/admin/translate') { await handleAdminTranslate(await parseBody(request), response); return; }

    // Продакшен: отдаём собранные фронтенды (если они собраны).
    if (serveStatic && (request.method === 'GET' || request.method === 'HEAD')) {
      if (serveStatic(request, response, pathname)) return;
    }

    json(response, 404, { message: 'Not found' });
  } catch (error) {
    json(response, 500, { message: error.message || 'Server error' });
  }
});

// ---------- Наблюдение за siteData.js (изменения в коде) ----------
function watchSiteData() {
  if (!siteData.exists()) return;
  try {
    let timer = null;
    watch(siteDataPath, () => {
      clearTimeout(timer);
      // Небольшая задержка: редакторы пишут файл в несколько заходов.
      timer = setTimeout(() => {
        if (siteData.refreshVersion()) {
          console.log(`[content] siteData.js изменён в коде → версия ${siteData.version}`);
        }
      }, 250);
    });
  } catch (error) {
    console.warn('[content] Не удалось следить за siteData.js:', error.message);
  }
}

// Раздача собранных фронтендов включается сама, если есть папки dist.
const serveStatic = createStaticHandler(rootDir, UPLOAD_DIR);

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '0.0.0.0';

async function start() {
  if (!siteData.exists()) {
    console.error(`\n[!] Файл контента не найден: ${siteDataPath}`);
    console.error('    Проверьте структуру проекта или переменную SITE_DATA_FILE в .env\n');
  } else {
    try {
      const content = await siteData.read();
      siteData.refreshVersion();
      // Первый запуск: сохраняем исходный контент для кнопки «Сбросить».
      if (!existsSync(snapshotFile)) {
        writeJson(snapshotFile, content);
        console.log('[content] Создан снимок исходного контента (для сброса).');
      }
      const counts = Object.entries(content)
        .map(([k, v]) => `${k}:${Array.isArray(v) ? v.length : 'obj'}`)
        .join(' ');
      console.log(`[content] Источник контента: ${siteDataPath}`);
      console.log(`[content] Загружено → ${counts}`);
    } catch (error) {
      console.error('[content] Ошибка чтения siteData.js:', error.message);
    }
  }

  watchSiteData();

  server.listen(port, host, () => {
    console.log(`\nСервер OLAN v${APP_VERSION} запущен: http://localhost:${port}`);
    console.log(`[admin]    Админ-панель  http://localhost:9000   логин "${ADMIN_USER}", пароль "${ADMIN_KEY}"`);
    console.log(`[cabinet]  Кабинет       http://localhost:9090   вход по логину сотрудника из админ-панели`);
    const tree = staff.tree();
    console.log(`[staff]    Менеджеров: ${tree.managers.length}, операторов: ${tree.managers.reduce((n, m) => n + m.operators.length, 0) + tree.orphanOperators.length}`);
    if (serveStatic) {
      console.log('[static] Найдены сборки — сервер раздаёт их сам:');
      console.log(`           сайт     → http://localhost:${port}/`);
      console.log(`           админка  → http://localhost:${port}/admin/`);
      console.log(`           оператор → http://localhost:${port}/operator/`);
    }
    console.log('(пароль админа — в .env, сотрудники заводятся в админ-панели)\n');
  });
}

start();
