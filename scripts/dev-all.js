// Запускает три фронтенда: сайт, админ-панель и кабинет.
// Сервер сюда НЕ входит — он живёт в отдельном терминале.
//
//   терминал 1:  npm start     сервер (API), порт 3001
//   терминал 2:  npm run dev   сайт 5173, админка 9000, кабинет 9090
//
// Так сервер можно перезапускать, не трогая фронтенды, и наоборот.

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const COLORS = {
  site: '\x1b[32m',     // зелёный
  admin: '\x1b[35m',    // фиолетовый
  operator: '\x1b[33m', // жёлтый
};
const RESET = '\x1b[0m';

if (!existsSync(path.join(rootDir, 'node_modules'))) {
  console.error('\n\x1b[31mЗависимости не установлены.\x1b[0m Выполните в папке проекта:\n\n  npm install\n');
  process.exit(1);
}

const TASKS = [
  { name: 'site', args: ['run', 'site'] },
  { name: 'admin', args: ['run', 'admin'] },
  { name: 'operator', args: ['run', 'operator'] },
];

const children = [];

function prefix(name, chunk) {
  const color = COLORS[name] || '';
  return String(chunk)
    .split('\n')
    .filter((line, index, arr) => line.trim() !== '' || index < arr.length - 1)
    .map((line) => `${color}[${name}]${RESET} ${line}`)
    .join('\n');
}

function run({ name, args }) {
  const child = spawn(npm, args, { cwd: rootDir, shell: process.platform === 'win32' });
  child.stdout.on('data', (chunk) => console.log(prefix(name, chunk)));
  child.stderr.on('data', (chunk) => console.error(prefix(name, chunk)));
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) console.error(prefix(name, `процесс завершился с кодом ${code}`));
  });
  children.push(child);
}

function shutdown() {
  for (const child of children) {
    try { child.kill('SIGTERM'); } catch { /* ignore */ }
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Проверяем, поднят ли сервер: без него не будет ни контента, ни чата.
async function checkServer() {
  const port = process.env.PORT || 3001;
  try {
    const res = await fetch(`http://localhost:${port}/api/health`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch { return false; }
}

console.log('Запускаю сайт, админ-панель и кабинет…\n');
console.log('  сайт         → http://localhost:5173');
console.log('  админ-панель → http://localhost:9000');
console.log('  кабинет      → http://localhost:9090\n');

const serverUp = await checkServer();
if (serverUp) {
  console.log('\x1b[32mСервер найден\x1b[0m на http://localhost:3001\n');
} else {
  console.log('\x1b[33mСервер не отвечает.\x1b[0m Откройте второй терминал и запустите:\n');
  console.log('  npm start\n');
  console.log('Без него не будут работать чат, заявки, админка и кабинет.\n');
}

console.log('Остановить: Ctrl+C\n');
TASKS.forEach(run);
