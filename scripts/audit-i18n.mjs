// Проверка переводов сайта: пустые поля, русский текст в других языках,
// украинский, совпадающий с русским, и русские надписи в коде мимо tr().
// Запуск: npm run audit:i18n
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const m = await import(new URL('../apps/site/src/app/data/siteData.js?v=' + Date.now(), import.meta.url).href);
const LANGS = ['ru', 'en', 'uz', 'zh', 'ar', 'uk'];
const CYR = /[А-Яа-яЁёЇїІіЄєҐґЎўҚқҒғҲҳ]/;
const txt = (v) => (Array.isArray(v) ? v.join(' ') : typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v));
const isLoc = (o) => o && typeof o === 'object' && !Array.isArray(o) && 'ru' in o && Object.keys(o).every((k) => LANGS.includes(k));
const rep = {}; const tot = { objs: 0, missing: 0, cyr: 0, same: 0 }; let ruChars = 0; const need = new Set();
function verdict(o, l) {
  const v = o[l];
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) return txt(o.ru) ? 'missing' : null;
  const t = txt(v);
  if (l !== 'uk' && CYR.test(t)) return 'cyr';
  if (l === 'uk' && t === txt(o.ru) && CYR.test(t) && t.length > 3) return 'same';
  return null;
}
function walk(v, p, top) {
  if (isLoc(v)) {
    tot.objs++;
    let any = false;
    for (const l of LANGS.slice(1)) {
      const b = verdict(v, l); if (!b) continue; any = true; tot[b]++;
      const R = (rep[top] ??= { missing: 0, cyr: 0, same: 0, samples: [] }); R[b]++;
      if (R.samples.length < 2) R.samples.push(`${p} [${l}:${b}] ${txt(v.ru).slice(0, 50)}`);
    }
    if (any && !need.has(p)) { need.add(p); ruChars += txt(v.ru).length; }
    return;
  }
  if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`, top));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${p}.${k}`, top);
}
for (const [k, v] of Object.entries(m)) if (k !== 'UI_TEXT' && typeof v !== 'function') walk(v, k, k);
console.log(`CONTENT: localized objects ${tot.objs}; untranslated fields: missing ${tot.missing}, cyrillic-in-foreign ${tot.cyr}, uk=ru ${tot.same}; distinct objects needing work ${need.size}, ru chars ${ruChars}`);
for (const [k, R] of Object.entries(rep).sort((a, b) => (b[1].missing + b[1].cyr + b[1].same) - (a[1].missing + a[1].cyr + a[1].same))) console.log(`  ${k}: miss ${R.missing} cyr ${R.cyr} same ${R.same} | ${R.samples.join(' || ')}`);
const flat = (o, p = '', out = {}) => { if (o && typeof o === 'object' && !Array.isArray(o)) { for (const [k, v] of Object.entries(o)) flat(v, p ? `${p}.${k}` : k, out); } else out[p] = o; return out; };
const ruUI = flat(m.UI_TEXT.ru);
console.log(`UI_TEXT: ru leaf keys ${Object.keys(ruUI).length}`);
for (const l of LANGS.slice(1)) {
  const t = flat(m.UI_TEXT[l] || {}); let miss = 0, cyr = 0, same = 0; const s = [];
  for (const [k, v] of Object.entries(ruUI)) { const x = t[k]; if (x == null || x === '') { miss++; if (s.length < 3) s.push('miss:' + k.slice(0, 50)); continue; } const xs = txt(x); if (l !== 'uk' && CYR.test(xs)) { cyr++; if (s.length < 3) s.push('cyr:' + k.slice(0, 40)); } else if (l === 'uk' && xs === txt(v) && CYR.test(xs) && xs.length > 3) { same++; if (s.length < 3) s.push('same:' + k.slice(0, 40)); } }
  console.log(`  ${l}: missing ${miss}, cyrillic ${cyr}, same-as-ru ${same} | ${s.join(' ; ')}`);
}
// Русские надписи в компонентах мимо tr()
const files = []; const walkDir = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walkDir(p); else if (/\.(jsx|js)$/.test(f) && !/siteData\.js$/.test(f)) files.push(p); } };
walkDir('apps/site/src');
let hard = 0; const perFile = {};
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8'); if (!CYR.test(src)) continue;
  let ast; try { ast = parse(src, { sourceType: 'module', plugins: ['jsx'] }); } catch (e) { console.log('PARSE FAIL', f, e.message); continue; }
  const skip = (p) => p.findParent((q) => q.isCallExpression() && ((q.node.callee.type === 'Identifier' && q.node.callee.name === 'tr') || (q.node.callee.type === 'MemberExpression' && q.node.callee.object.type === 'Identifier' && q.node.callee.object.name === 'console')));
  const add = (p, value) => { if (skip(p)) return; hard++; const key = path.relative('apps/site/src', f); (perFile[key] ??= []).push(`${p.node.loc.start.line}: ${value.trim().replace(/\s+/g, ' ').slice(0, 70)}`); };
  traverse(ast, {
    StringLiteral(p) { if (CYR.test(p.node.value) && !p.parentPath.isImportDeclaration()) add(p, p.node.value); },
    TemplateElement(p) { if (CYR.test(p.node.value.raw)) add(p, p.node.value.raw); },
    JSXText(p) { if (CYR.test(p.node.value)) add(p, p.node.value); },
  });
}
console.log(`HARDCODED cyrillic outside tr(): ${hard} in ${Object.keys(perFile).length} files`);
for (const [f, list] of Object.entries(perFile).sort((a, b) => b[1].length - a[1].length)) console.log(`  ${f} (${list.length}): ${list.slice(0, 3).join(' | ')}`);
