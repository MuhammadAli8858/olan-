// ---------------------------------------------------------------------------
// Проверка проекта перед запуском.
//
// Запускается автоматически перед npm run server / site / admin / operator
// и сразу после npm install. Если что-то не так — объясняет, что именно
// и как это починить, вместо простыни из ошибок esbuild.
//
// Вручную: npm run check
// ---------------------------------------------------------------------------

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const afterInstall = args.includes('--after-install');
const serverOnly = args.includes('--server-only');

const C = {
  red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m',
  cyan: '\x1b[36m', dim: '\x1b[2m', bold: '\x1b[1m', off: '\x1b[0m',
};

const problems = [];
function fail(title, ...lines) { problems.push({ title, lines }); }

// --- 1. Версия Node ---------------------------------------------------------
const major = Number(process.versions.node.split('.')[0]);
if (major < 18) {
  fail(
    `Слишком старая версия Node.js: ${process.versions.node}`,
    'Нужна версия 18.18 или новее.',
    'Скачайте LTS-версию с https://nodejs.org и установите поверх старой.',
  );
}

// --- 2. Целостность самого проекта -----------------------------------------
const REQUIRED = [
  'package.json',
  'server/index.js',
  'server/siteDataFile.js',
  'server/static.js',
  'server/env.js',
  'vite.site.config.js',
  'vite.admin.config.js',
  'vite.operator.config.js',
  'apps/site/index.html',
  'apps/site/src/main.jsx',
  'apps/site/src/app/data/siteData.js',
  'apps/admin/index.html',
  'apps/admin/src/main.jsx',
  'apps/operator/index.html',
  'apps/operator/src/main.jsx',
  'apps/manager/index.html',
  'apps/manager/src/main.jsx',
];
const missing = REQUIRED.filter((f) => !existsSync(path.join(rootDir, f)));
if (missing.length) {
  fail(
    'В проекте не хватает файлов',
    ...missing.map((f) => `  • ${f}`),
    '',
    'Скорее всего папку случайно почистили или архив распаковался не полностью.',
    'Распакуйте архив проекта заново в пустую папку.',
  );
}

// --- 3. Запуск из правильной папки -----------------------------------------
if (process.cwd() !== rootDir && !process.cwd().startsWith(rootDir)) {
  fail(
    'Команда запущена не из папки проекта',
    `Вы находитесь здесь: ${process.cwd()}`,
    `А нужно здесь:       ${rootDir}`,
    '',
    `Выполните:  cd "${rootDir}"`,
  );
}

// --- 4. Зависимости установлены? -------------------------------------------
const nodeModules = path.join(rootDir, 'node_modules');
if (!existsSync(nodeModules)) {
  fail(
    'Зависимости не установлены',
    'Выполните в папке проекта:  npm install',
  );
} else if (!serverOnly) {
  // Проверяем ключевые пакеты и, отдельно, тяжёлый lucide-react —
  // именно он чаще всего распаковывается наполовину.
  const PACKAGES = ['react', 'react-dom', 'vite', '@vitejs/plugin-react', '@tailwindcss/vite', 'lucide-react', 'motion'];
  const notInstalled = PACKAGES.filter((p) => !existsSync(path.join(nodeModules, ...p.split('/'))));
  if (notInstalled.length) {
    fail(
      'Часть пакетов не установилась',
      ...notInstalled.map((p) => `  • ${p}`),
      '',
      'Выполните:  npm run reinstall',
    );
  } else {
    const iconsDir = path.join(nodeModules, 'lucide-react', 'dist', 'esm', 'icons');
    let iconCount = 0;
    try {
      if (existsSync(iconsDir) && statSync(iconsDir).isDirectory()) {
        iconCount = readdirSync(iconsDir).length;
      }
    } catch { iconCount = 0; }

    if (iconCount < 1000) {
      fail(
        'Пакет lucide-react установился не полностью',
        `Найдено файлов иконок: ${iconCount}. Должно быть больше 1500.`,
        'Именно из-за этого появляются ошибки вида',
        '  ERROR: Could not resolve "./icons/earth.js"',
        '',
        'Почините так:  npm run reinstall',
        '',
        'Если повторится — почти наверняка мешает одно из двух:',
        '  • папка проекта лежит на Рабочем столе, который синхронизируется с OneDrive;',
        '  • антивирус блокирует распаковку полутора тысяч мелких файлов.',
        'Перенесите проект в простой путь вроде C:\\dev\\olan и добавьте его в исключения антивируса.',
      );
    }
  }
}

// --- 5. Конфиг .env ---------------------------------------------------------
if (!existsSync(path.join(rootDir, '.env')) && existsSync(path.join(rootDir, '.env.example'))) {
  if (!quiet) {
    console.log(`${C.yellow}Подсказка:${C.off} файла .env нет, используются настройки по умолчанию.`);
    console.log(`${C.dim}Чтобы задать свои пароли, скопируйте .env.example в .env${C.off}\n`);
  }
}

// --- 6. Файл контента читается? --------------------------------------------
const siteDataPath = path.join(rootDir, 'apps', 'site', 'src', 'app', 'data', 'siteData.js');
if (existsSync(siteDataPath)) {
  const source = readFileSync(siteDataPath, 'utf8');
  if (!source.includes('export const PRODUCTS')) {
    fail(
      'Файл siteData.js повреждён',
      'В нём не найден блок PRODUCTS.',
      'Возьмите рабочую копию из папки server/data/backups — там последние 20 версий.',
    );
  }
}

// --- Итог -------------------------------------------------------------------
if (problems.length === 0) {
  if (afterInstall) {
    console.log(`\n${C.green}${C.bold}Всё установлено правильно.${C.off}`);
    console.log(`${C.dim}Запуск: ${C.off}npm run dev${C.dim}  (или по отдельности: npm run server / site / admin / operator)${C.off}\n`);
  } else if (!quiet) {
    console.log(`\n${C.green}${C.bold}Проверка пройдена, проблем не найдено.${C.off}`);
    console.log(`${C.dim}Node ${process.versions.node} · проект ${rootDir}${C.off}\n`);
  }
  process.exit(0);
}

console.error(`\n${C.red}${C.bold}Запуск остановлен: проект не готов.${C.off}\n`);
problems.forEach((p, i) => {
  console.error(`${C.red}${C.bold}${i + 1}. ${p.title}${C.off}`);
  p.lines.forEach((line) => console.error(`   ${line}`));
  console.error('');
});
console.error(`${C.dim}Повторить проверку: ${C.off}npm run check\n`);

// После npm install не роняем установку, только предупреждаем.
process.exit(afterInstall ? 0 : 1);
