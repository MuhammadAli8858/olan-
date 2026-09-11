// ---------------------------------------------------------------------------
// Имена сотрудников на разных языках сайта.
//
// Имя — не слово, его не переводят, а записывают буквами нужного алфавита.
// «Нигина» на английском это Nigina, а не какой-то перевод. Поэтому для
// латинских языков делаем транслитерацию прямо здесь, без интернета.
//
// Для языков с другой письменностью (китайский и подобные) сервер пробует
// внешний переводчик, а если тот недоступен — подставляет латиницу.
// ---------------------------------------------------------------------------

// Языки сайта, использующие кириллицу: имя остаётся как есть.
const CYRILLIC_LANGS = new Set(['ru', 'uk', 'be', 'kk', 'ky', 'mn', 'sr', 'bg']);

// Языки на латинице: транслитерируем.
const LATIN_LANGS = new Set(['uz', 'en', 'de', 'fr', 'es', 'it', 'pl', 'tr', 'az', 'pt', 'nl', 'cs']);

const MAP = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  // украинские и белорусские буквы
  і: 'i', ї: 'yi', є: 'ye', ґ: 'g', ў: 'w',
  // казахские буквы
  ә: 'a', ғ: 'gh', қ: 'q', ң: 'ng', ө: 'o', ұ: 'u', ү: 'u', һ: 'h',
};

// Узбекская латиница отличается от английской в паре букв.
const UZ_OVERRIDES = { х: 'x', ч: 'ch', ш: 'sh', ў: "o'", ғ: "g'", қ: 'q', ҳ: 'h' };

function isCyrillic(text) {
  return /[\u0400-\u04FF]/.test(String(text || ''));
}

// Кириллица → латиница с сохранением заглавных букв.
export function transliterate(text, language = 'en') {
  const source = String(text || '');
  if (!isCyrillic(source)) return source;

  const overrides = language === 'uz' ? UZ_OVERRIDES : {};
  let out = '';

  for (const char of source) {
    const lower = char.toLowerCase();
    const isUpper = char !== lower;
    const replacement = overrides[lower] !== undefined ? overrides[lower] : MAP[lower];

    if (replacement === undefined) { out += char; continue; }
    if (!replacement) continue;

    out += isUpper
      ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
      : replacement;
  }

  return out;
}

// Нужен ли внешний переводчик для этого языка.
export function needsExternalTranslation(language) {
  return !CYRILLIC_LANGS.has(language) && !LATIN_LANGS.has(language);
}

// Имя на конкретном языке без обращения к сети.
export function localName(name, language) {
  if (CYRILLIC_LANGS.has(language)) return String(name || '');
  return transliterate(name, language);
}

export { CYRILLIC_LANGS, LATIN_LANGS, isCyrillic };
