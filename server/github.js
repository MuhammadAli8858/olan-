// ---------------------------------------------------------------------------
// Возврат правок в исходный код.
//
// Зачем это нужно. На своём компьютере админ-панель пишет прямо в
// apps/site/src/app/data/siteData.js — правки сразу видны в редакторе кода.
// На хостинге папка проекта пересоздаётся при каждом деплое, поэтому контент
// живёт на постоянном диске (SITE_DATA_FILE). Репозиторий при этом остаётся
// со старым текстом, и правки в код не попадают.
//
// Этот модуль закрывает разрыв: после сохранения сервер коммитит свежий
// siteData.js обратно в GitHub через официальный Contents API.
//
// Настройка — четыре переменные окружения:
//   GITHUB_TOKEN   личный токен с правом записи в репозиторий (обязательно)
//   GITHUB_REPO    владелец/репозиторий, например MuhammadAli8858/olan-
//   GITHUB_BRANCH  ветка, по умолчанию main
//   GITHUB_PATH    путь к файлу в репозитории, по умолчанию
//                  apps/site/src/app/data/siteData.js
//
// Без GITHUB_TOKEN модуль просто молчит: сайт и админка работают как раньше.
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';

const API = 'https://api.github.com';

export function gitConfig() {
  const token = process.env.GITHUB_TOKEN || '';
  const repo = (process.env.GITHUB_REPO || '').trim().replace(/^\/+|\/+$/g, '');
  return {
    token,
    repo,
    branch: process.env.GITHUB_BRANCH || 'main',
    path: process.env.GITHUB_PATH || 'apps/site/src/app/data/siteData.js',
    // Коммитить после каждого сохранения. Выключается GIT_AUTO_PUSH=false.
    auto: String(process.env.GIT_AUTO_PUSH || 'true').toLowerCase() !== 'false',
    configured: Boolean(token && repo),
  };
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'olan-admin',
    'Content-Type': 'application/json',
  };
}

function explain(status, body) {
  if (status === 401) return 'GitHub не принял токен. Проверьте GITHUB_TOKEN — возможно, он истёк.';
  if (status === 403) return 'У токена нет права записи в репозиторий (нужно Contents: Read and write).';
  if (status === 404) return 'Репозиторий, ветка или путь к файлу не найдены. Проверьте GITHUB_REPO, GITHUB_BRANCH и GITHUB_PATH.';
  if (status === 409) return 'Файл в репозитории изменился параллельно. Повторите выгрузку.';
  if (status === 422) return `GitHub отклонил запрос: ${body}`;
  return `GitHub ответил ${status}: ${body}`;
}

// Текущая версия файла в репозитории. sha нужен, чтобы GitHub понял,
// что мы обновляем файл, а не создаём его заново.
async function currentFile(cfg) {
  const url = `${API}/repos/${cfg.repo}/contents/${encodeURI(cfg.path)}?ref=${encodeURIComponent(cfg.branch)}`;
  const res = await fetch(url, { headers: headers(cfg.token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(explain(res.status, await res.text()));
  const data = await res.json();
  return { sha: data.sha, content: Buffer.from(data.content || '', 'base64').toString('utf8') };
}

// Коммитим файл. Возвращает описание результата или { skipped: true },
// если содержимое в репозитории и так совпадает.
export async function pushFile(localPath, { message } = {}) {
  const cfg = gitConfig();
  if (!cfg.configured) throw new Error('Выгрузка в GitHub не настроена: нет GITHUB_TOKEN или GITHUB_REPO.');

  const text = readFileSync(localPath, 'utf8');
  const existing = await currentFile(cfg);

  // Ничего не изменилось — не засоряем историю пустыми коммитами.
  if (existing && existing.content === text) {
    return { skipped: true, reason: 'В репозитории уже та же версия файла.' };
  }

  // [skip render] не даёт хостингу перезапустить сервис из-за правки текста:
  // контент и так живёт на диске, деплой ради него не нужен.
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const body = {
    message: message || `Контент сайта из админ-панели (${stamp}) [skip render]`,
    content: Buffer.from(text, 'utf8').toString('base64'),
    branch: cfg.branch,
  };
  if (existing) body.sha = existing.sha;

  const url = `${API}/repos/${cfg.repo}/contents/${encodeURI(cfg.path)}`;
  const res = await fetch(url, { method: 'PUT', headers: headers(cfg.token), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(explain(res.status, await res.text()));

  const data = await res.json();
  return {
    ok: true,
    sha: data.commit?.sha?.slice(0, 7) || '',
    url: data.commit?.html_url || '',
    repo: cfg.repo,
    branch: cfg.branch,
    path: cfg.path,
  };
}

// Проверка настроек без записи: отвечает ли GitHub и виден ли файл.
export async function checkAccess() {
  const cfg = gitConfig();
  if (!cfg.configured) return { configured: false };
  try {
    const file = await currentFile(cfg);
    return {
      configured: true,
      ok: true,
      auto: cfg.auto,
      repo: cfg.repo,
      branch: cfg.branch,
      path: cfg.path,
      fileExists: Boolean(file),
    };
  } catch (error) {
    return { configured: true, ok: false, auto: cfg.auto, repo: cfg.repo, branch: cfg.branch, path: cfg.path, message: error.message };
  }
}
