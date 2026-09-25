// Раздача собранных фронтендов (npm run build) прямо этим же сервером.
// Нужна только для продакшена: один процесс отдаёт сайт, админку и оператора.
//
//   http://ваш-домен/           → apps/site/dist
//   http://ваш-домен/admin/     → apps/admin/dist
//   http://ваш-домен/operator/  → apps/operator/dist
//
// В режиме разработки этим занимается Vite, и раздача просто не включается.

import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { COMPRESSIBLE, compressBuffer, pickEncoding } from './compress.js';

// Для плохого интернета раздача устроена так:
//  • сжатие — скрипты, стили, HTML, JSON и SVG уходят в brotli или gzip.
//    Сборка кладёт рядом готовые .br и .gz (scripts/precompress.mjs); если
//    их нет, сервер сжимает сам и запоминает результат в памяти;
//  • «не изменилось» — у файла есть отпечаток (ETag), и если у браузера уже
//    есть эта версия, сервер отвечает 304 без тела;
//  • кеш — файлы с хешем в имени (/assets) и шрифты браузер хранит год,
//    картинки неделю с фоновой проверкой, страницы проверяет всегда.
function cachePolicy(filePath) {
  const p = filePath.split(path.sep).join('/');
  if (p.includes('/assets/') || p.includes('/fonts/')) return 'public, max-age=31536000, immutable';
  if (/\.(webp|png|jpe?g|gif|svg|ico|mp4|webm|woff2?)$/i.test(p)) return 'public, max-age=604800, stale-while-revalidate=2592000';
  return 'no-cache';
}

const memo = new Map();
const MEMO_LIMIT = 48 * 1024 * 1024;
let memoSize = 0;
function remember(key, buffer) {
  memo.set(key, buffer);
  memoSize += buffer.length;
  while (memoSize > MEMO_LIMIT && memo.size) {
    const [oldKey, oldValue] = memo.entries().next().value;
    memo.delete(oldKey);
    memoSize -= oldValue.length;
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
};

export function createStaticHandler(rootDir, uploadsDir, chatFilesDir) {
  const mounts = [
    // Загруженные картинки идут первыми: если включён постоянный диск,
    // свежие файлы лежат там, а не в собранной папке сайта.
    // Наличие папки не проверяем — при первом запуске её ещё нет,
    // она появится после первой загрузки, а искать файл мы будем
    // в момент запроса, а не сейчас.
    ...(uploadsDir ? [{ prefix: '/products', dir: uploadsDir }] : []),
    // Файлы и фото, отправленные в чате.
    ...(chatFilesDir ? [{ prefix: '/chat-files', dir: chatFilesDir }] : []),
    { prefix: '/admin', dir: path.join(rootDir, 'apps', 'admin', 'dist') },
    { prefix: '/operator', dir: path.join(rootDir, 'apps', 'operator', 'dist') },
    { prefix: '/menedjer', dir: path.join(rootDir, 'apps', 'manager', 'dist') },
    { prefix: '/', dir: path.join(rootDir, 'apps', 'site', 'dist') },
  ].filter((m) => existsSync(m.dir));

  // Если собранных приложений нет, раздавать нечего — кроме случая,
  // когда указана отдельная папка загрузок.
  const hasApps = mounts.some((m) => m.prefix !== '/products' && m.prefix !== '/chat-files');
  if (!hasApps && !uploadsDir && !chatFilesDir) return null;

  function send(request, response, filePath, status = 200) {
    const ext = path.extname(filePath).toLowerCase();
    const stat = statSync(filePath);
    const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': cachePolicy(filePath),
      ETag: etag,
      'Last-Modified': stat.mtime.toUTCString(),
    };
    const compressible = COMPRESSIBLE.has(ext) && stat.size > 1024;
    if (compressible) headers.Vary = 'Accept-Encoding';

    const known = String(request.headers['if-none-match'] || '').split(/\s*,\s*/);
    if (known.includes(etag) || known.includes(etag.slice(2))) {
      response.writeHead(304, headers);
      response.end();
      return;
    }

    const encoding = compressible ? pickEncoding(request) : '';
    if (encoding) {
      const ready = `${filePath}.${encoding === 'br' ? 'br' : 'gz'}`;
      if (existsSync(ready) && statSync(ready).mtimeMs >= stat.mtimeMs) {
        response.writeHead(status, { ...headers, 'Content-Encoding': encoding, 'Content-Length': statSync(ready).size });
        if (request.method === 'HEAD') { response.end(); return; }
        createReadStream(ready).pipe(response);
        return;
      }
      const key = `${filePath}|${stat.mtimeMs}|${encoding}`;
      let packed = memo.get(key);
      if (!packed) { packed = compressBuffer(readFileSync(filePath), encoding); remember(key, packed); }
      response.writeHead(status, { ...headers, 'Content-Encoding': encoding, 'Content-Length': packed.length });
      response.end(request.method === 'HEAD' ? undefined : packed);
      return;
    }

    response.writeHead(status, { ...headers, 'Content-Length': stat.size });
    if (request.method === 'HEAD') { response.end(); return; }
    createReadStream(filePath).pipe(response);
  }

  return function handleStatic(request, response, pathname) {
    const mount = mounts.find((m) => m.prefix === '/' || pathname === m.prefix || pathname.startsWith(`${m.prefix}/`));
    if (!mount) return false;

    let rel;
    try {
      rel = decodeURIComponent(mount.prefix === '/' ? pathname : pathname.slice(mount.prefix.length));
    } catch {
      response.writeHead(400).end();
      return true;
    }
    rel = rel.replace(/^\/+/, '');

    // Защита: никаких выходов вверх по дереву и байтов \0 в пути.
    if (rel.includes('\0') || rel.split(/[/\\]/).includes('..')) {
      response.writeHead(403).end();
      return true;
    }

    const target = path.normalize(path.join(mount.dir, rel));
    if (target !== mount.dir && !target.startsWith(mount.dir + path.sep)) {
      response.writeHead(403).end();
      return true;
    }

    if (existsSync(target) && statSync(target).isFile()) { send(request, response, target); return true; }

    // Картинки: если на диске нет — пробуем найти в сборке сайта.
    if (mount.prefix === '/products') {
      const inSite = path.join(rootDir, 'apps', 'site', 'dist', 'products', rel);
      if (existsSync(inSite) && statSync(inSite).isFile()) { send(request, response, inSite); return true; }
      return false;
    }

    // Запрос конкретного файла (есть расширение), которого нет — честная 404,
    // а не index.html. Иначе битые картинки и скрипты выглядят как «страница».
    if (path.extname(rel)) return false;

    // SPA: маршруты без расширения отдаём как index.html
    const indexFile = path.join(mount.dir, 'index.html');
    if (existsSync(indexFile)) { send(request, response, indexFile); return true; }
    return false;
  };
}

export { MIME };
