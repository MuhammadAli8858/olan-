// ---------------------------------------------------------------------------
// Заранее сжимает собранные файлы: рядом с каждым скриптом, стилем и HTML
// кладёт .br (brotli, максимальное сжатие) и .gz. Сервер отдаёт готовое и
// не тратит время на сжатие при каждом запросе. Запускается в конце
// `npm run build`; без него всё тоже работает — сервер сожмёт сам.
// ---------------------------------------------------------------------------
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt', '.xml']);
let files = 0;
let before = 0;
let after = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    const stat = statSync(file);
    if (stat.isDirectory()) { walk(file); continue; }
    if (!EXT.has(path.extname(name).toLowerCase()) || stat.size <= 1024) continue;
    const source = readFileSync(file);
    const br = brotliCompressSync(source, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: source.length } });
    writeFileSync(`${file}.br`, br);
    writeFileSync(`${file}.gz`, gzipSync(source, { level: 9 }));
    files += 1;
    before += source.length;
    after += br.length;
  }
}

for (const app of ['site', 'admin', 'operator', 'manager']) {
  const dist = path.join(ROOT, 'apps', app, 'dist');
  if (existsSync(dist)) walk(dist);
}
console.log(`[сжатие] ${files} файлов: ${Math.round(before / 1024)} КБ → ${Math.round(after / 1024)} КБ в brotli`);
