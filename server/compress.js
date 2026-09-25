// ---------------------------------------------------------------------------
// Сжатие ответов и отпечаток контента — общее для сервера и сборки.
//
// На медленном интернете важен каждый килобайт: скрипт сайта в brotli
// в 4 раза меньше, а контент на шести языках (550 КБ) сжимается до ~120 КБ.
// ---------------------------------------------------------------------------
import { createHash } from 'node:crypto';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

export const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt', '.xml', '.map']);

// Что умеет браузер: brotli лучше, gzip есть везде.
export function pickEncoding(request) {
  const accepted = String((request && request.headers && request.headers['accept-encoding']) || '');
  if (/\bbr\b/.test(accepted)) return 'br';
  if (/\bgzip\b/.test(accepted)) return 'gzip';
  return '';
}

// Сжатие «на лету»: средний уровень — быстро и почти так же плотно.
export function compressBuffer(buffer, encoding) {
  if (encoding === 'br') {
    return brotliCompressSync(buffer, { params: { [constants.BROTLI_PARAM_QUALITY]: 6, [constants.BROTLI_PARAM_SIZE_HINT]: buffer.length } });
  }
  if (encoding === 'gzip') return gzipSync(buffer, { level: 6 });
  return buffer;
}

// Отпечаток контента. Сборка вшивает его в сайт, сервер считает тот же
// отпечаток для текущего контента: совпали — сайту нечего скачивать.
export function contentHash(content) {
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  return createHash('sha1').update(text).digest('base64url').slice(0, 16);
}
