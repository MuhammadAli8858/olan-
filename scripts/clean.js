// ---------------------------------------------------------------------------
// Безопасная очистка перед переустановкой зависимостей.
//
//   npm run clean       только удалить
//   npm run reinstall   удалить и сразу поставить заново
//
// Скрипт трогает ТОЛЬКО node_modules, package-lock.json и кэш Vite.
// Исходный код, package.json, .env и контент сайта он удалить не может
// физически — список путей жёстко задан ниже.
// ---------------------------------------------------------------------------

import { rmSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const C = { green: '\x1b[32m', dim: '\x1b[2m', bold: '\x1b[1m', yellow: '\x1b[33m', off: '\x1b[0m' };

// Единственное, что разрешено удалять.
const TARGETS = [
  'node_modules',
  'package-lock.json',
  'apps/site/node_modules',
  'apps/admin/node_modules',
  'apps/operator/node_modules',
  'apps/site/package-lock.json',
  'apps/admin/package-lock.json',
  'apps/operator/package-lock.json',
  'node_modules/.vite',
  'apps/site/dist',
  'apps/admin/dist',
  'apps/operator/dist',
];

console.log(`\n${C.bold}Очистка проекта${C.off}`);
console.log(`${C.dim}${rootDir}${C.off}\n`);

let removed = 0;
for (const target of TARGETS) {
  const full = path.join(rootDir, target);

  // Страховка: не выходим за пределы папки проекта.
  if (!full.startsWith(rootDir + path.sep)) continue;
  if (!existsSync(full)) continue;

  const isDir = statSync(full).isDirectory();
  try {
    rmSync(full, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    console.log(`  ${C.green}удалено${C.off}  ${target}${isDir ? '/' : ''}`);
    removed += 1;
  } catch (error) {
    console.log(`  ${C.yellow}не вышло${C.off} ${target} — ${error.code || error.message}`);
    console.log(`  ${C.dim}Закройте запущенные терминалы (Ctrl+C) и повторите.${C.off}`);
  }
}

if (removed === 0) console.log(`  ${C.dim}Удалять нечего, уже чисто.${C.off}`);

console.log(`\n${C.dim}Дальше: ${C.off}npm install\n`);
