// ---------------------------------------------------------------------------
// SEO для боевого домена.
//
// Запускается после сборки (npm run build) и делает три вещи:
//   1) подставляет в dist/index.html описание, OG- и Twitter-теги, canonical
//      и JSON-LD с данными компании — берёт всё из siteData.js;
//   2) кладёт robots.txt, разрешающий индексацию;
//   3) кладёт sitemap.xml со всеми страницами сайта.
//
// Зачем именно так: Telegram, WhatsApp и прочие мессенджеры при построении
// превью НЕ выполняют JavaScript. Они читают только сырой HTML. Поэтому теги
// должны лежать в самом файле, а не проставляться скриптом в браузере.
//
// Адрес сайта берётся из .env, переменная SITE_URL.
// ---------------------------------------------------------------------------

import '../server/env.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'apps', 'site', 'dist');
const siteDataPath = path.join(rootDir, 'apps', 'site', 'src', 'app', 'data', 'siteData.js');

const SITE_URL = (process.env.SITE_URL || 'https://olan.uz').replace(/\/+$/, '');
const OG_IMAGE = process.env.OG_IMAGE || '/products/w-space.png';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function readSiteData() {
  const url = `${pathToFileURL(siteDataPath).href}?v=${Date.now()}`;
  return import(url);
}

function buildMeta({ title, description, languages, contact }) {
  const image = OG_IMAGE.startsWith('http') ? OG_IMAGE : `${SITE_URL}${OG_IMAGE}`;

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'OLAN HIGH TECH PROJECT',
    url: SITE_URL,
    logo: `${SITE_URL}/logo-icon.png`,
    description,
  };
  if (contact.phone) organization.telephone = contact.phone;
  if (contact.email) organization.email = contact.email;
  if (contact.address) organization.address = { '@type': 'PostalAddress', streetAddress: contact.address };

  const alternates = languages
    .map((code) => `    <link rel="alternate" hreflang="${code}" href="${SITE_URL}/?lang=${code}" />`)
    .join('\n');

  return `    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="theme-color" content="#06b6d4" />
    <link rel="canonical" href="${SITE_URL}/" />

    <!-- Превью ссылки в Telegram, WhatsApp, Facebook, LinkedIn -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="OLAN HIGH TECH PROJECT" />
    <meta property="og:locale" content="ru_RU" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${SITE_URL}/" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(title)}" />

    <!-- Превью в X / Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${image}" />

${alternates}

    <script type="application/ld+json">${JSON.stringify(organization)}</script>`;
}

// Разделы, у которых своя страница.
const SITE_PAGES = ['about', 'directions', 'portfolio', 'catalog', 'workflow', 'projects', 'team', 'faq', 'contact'];

function buildSitemap(languages, solutions, products) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'weekly' },
    ...SITE_PAGES.map((page) => ({ loc: `${SITE_URL}/#${page}`, priority: '0.8', changefreq: 'monthly' })),
    ...solutions.map((id) => ({ loc: `${SITE_URL}/#solution-${id}`, priority: '0.8', changefreq: 'monthly' })),
    ...(products || []).map((id) => ({ loc: `${SITE_URL}/#product-${id}`, priority: '0.7', changefreq: 'monthly' })),
  ];

  const body = urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.w3.org/1999/sitemap/0.9/">
${body}
</urlset>
`.replace('http://www.w3.org/1999/sitemap/0.9/', 'http://www.sitemaps.org/schemas/sitemap/0.9');
}

function buildRobots() {
  return `# Сайт открыт для индексации.
User-agent: *
Allow: /

# Служебные части индексировать не нужно.
Disallow: /admin/
Disallow: /operator/
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

async function main() {
  if (!existsSync(distDir)) {
    console.error('[seo] Папка apps/site/dist не найдена. Сначала выполните npm run build.');
    process.exit(1);
  }

  const data = await readSiteData();
  const ru = (data.UI_TEXT && data.UI_TEXT.ru) || {};
  const hero = ru.hero || {};
  const contact = data.CONTACT_INFO || {};

  const title = [hero.title1, hero.title2].filter(Boolean).join(' ') || 'OLAN HIGH TECH PROJECT';
  const description = [hero.description, hero.descriptionLine2].filter(Boolean).join(' ')
    || 'Комплексы автоматической фиксации нарушений ПДД.';

  const languages = (data.LANGUAGE_OPTIONS || []).map((l) => l.code).filter(Boolean);
  const solutions = (data.VIOLATION_SOLUTIONS || []).map((s) => s.id).filter(Boolean);
  const products = (data.PORTFOLIO || []).map((p) => p.id).filter(Boolean);

  const indexPath = path.join(distDir, 'index.html');
  let html = readFileSync(indexPath, 'utf8');

  // Убираем прежний блок, если файл пересобирают повторно.
  html = html.replace(/\n?\s*<!-- OLAN SEO -->[\s\S]*?<!-- \/OLAN SEO -->/g, '');

  const block = `\n    <!-- OLAN SEO -->\n${buildMeta({ title, description, languages, contact })}\n    <!-- /OLAN SEO -->`;
  html = html.replace('</head>', `${block}\n  </head>`);

  // Полный заголовок страницы вместо короткого.
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(`OLAN HIGH TECH PROJECT — ${title}`)}</title>`);

  writeFileSync(indexPath, html, 'utf8');
  writeFileSync(path.join(distDir, 'robots.txt'), buildRobots(), 'utf8');
  writeFileSync(path.join(distDir, 'sitemap.xml'), buildSitemap(languages, solutions, products), 'utf8');

  console.log(`[seo] Адрес сайта: ${SITE_URL}`);
  console.log(`[seo] Заголовок:   ${title}`);
  console.log(`[seo] Языков: ${languages.length}, решений: ${solutions.length}, продуктов: ${products.length}`);
  console.log('[seo] Готово: index.html, robots.txt, sitemap.xml');
  console.log('[seo] Адрес меняется переменной SITE_URL в .env');
}

main();
