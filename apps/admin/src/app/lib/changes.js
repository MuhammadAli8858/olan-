// ---------------------------------------------------------------------------
// Что именно изменилось.
//
// Админка хранит историю правок и умеет откатывать их по одной. Чтобы перед
// откатом честно написать «будет удалён добавленный прибор W-Space S»,
// нужно сравнить состояние до и после и понять смысл изменения.
//
// Здесь нет привязки к конкретным полям формы: сравниваются сами данные,
// поэтому новые поля в админке ничего тут ломать не будут.
// ---------------------------------------------------------------------------

// Как называется запись в каждом разделе: [единственное, родительный падеж].
const SECTION_NAMES = {
  PRODUCTS: ['прибор', 'прибора'],
  VIOLATION_SOLUTIONS: ['решение', 'решения'],
  PROJECTS: ['проект', 'проекта'],
  BENEFITS: ['преимущество', 'преимущества'],
  PROCESS_STEPS: ['шаг', 'шага'],
  FAQ_ITEMS: ['вопрос', 'вопроса'],
  TESTIMONIALS: ['отзыв', 'отзыва'],
  ABOUT_FEATURES: ['блок о компании', 'блока о компании'],
  LANGUAGE_OPTIONS: ['язык', 'языка'],
};

// Человеческие названия полей.
const FIELD_NAMES = {
  name: 'название',
  title: 'заголовок',
  brand: 'бренд',
  id: 'идентификатор',
  price: 'цена',
  badge: 'бейдж',
  short: 'краткое описание',
  description: 'описание',
  specs: 'характеристики',
  applications: 'применение',
  category: 'категория',
  images: 'картинки',
  image: 'картинка',
  inStock: 'наличие',
  icon: 'иконка',
  number: 'номер',
  problem: 'задача',
  solution: 'решение',
  question: 'вопрос',
  answer: 'ответ',
  location: 'место',
  phone: 'телефон',
  email: 'email',
  address: 'адрес',
  text: 'текст',
  author: 'автор',
  role: 'должность',
};

// Понятное имя записи: пробуем название, заголовок, вопрос, потом id.
export function entryTitle(item) {
  if (!item || typeof item !== 'object') return '';
  for (const key of ['name', 'title', 'question', 'brand', 'label']) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (value && typeof value === 'object') {
      const first = value.ru || Object.values(value).find((v) => typeof v === 'string' && v.trim());
      if (first) return String(first).replace(/\s+/g, ' ').trim();
    }
  }
  return item.id ? String(item.id) : '';
}

function shorten(text, limit = 40) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!value) return '';
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function sectionName(key, form = 0) {
  const pair = SECTION_NAMES[key];
  if (pair) return pair[form];
  return form === 0 ? 'запись' : 'записи';
}

// Первое отличие между двумя значениями. Возвращает путь в виде массива.
function findDiffPath(before, after, path = [], depth = 0) {
  if (depth > 8) return null;
  if (before === after) return null;

  const bothObjects = before && after && typeof before === 'object' && typeof after === 'object';
  if (!bothObjects) return path;

  if (Array.isArray(before) !== Array.isArray(after)) return path;

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const found = findDiffPath(before[key], after[key], [...path, key], depth + 1);
    if (found) return found;
  }
  return null;
}

// Какая запись появилась или пропала. Сравнивать по ссылке нельзя —
// состояние клонируется целиком, поэтому ссылки всегда разные.
// Сравниваем по id, а если его нет — по содержимому.
function pickChangedEntry(fromList, toList) {
  const key = (item) => {
    if (item && typeof item === 'object' && item.id !== undefined) return `id:${item.id}`;
    try { return `json:${JSON.stringify(item)}`; } catch { return 'json:?'; }
  };
  const present = new Set(toList.map(key));
  // Считаем, сколько раз встречается каждый ключ, чтобы поймать и дубликаты.
  const counts = new Map();
  for (const item of toList) {
    const k = key(item);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  for (const item of fromList) {
    const k = key(item);
    const left = counts.get(k) || 0;
    if (left === 0) return item;
    counts.set(k, left - 1);
  }
  // Ничего уникального не нашлось — берём последний, это лучше, чем ничего.
  return present.size ? fromList[fromList.length - 1] : null;
}

// Описывает изменение между двумя состояниями контента.
// Возвращает { kind, label, path } либо null, если ничего не поменялось.
export function describeChange(before, after) {
  if (!before || !after) return null;

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  // Сначала ищем добавление или удаление записи — это самое заметное действие.
  for (const key of keys) {
    const oldList = before[key];
    const newList = after[key];
    if (!Array.isArray(oldList) || !Array.isArray(newList)) continue;
    if (oldList.length === newList.length) continue;

    if (newList.length > oldList.length) {
      const added = pickChangedEntry(newList, oldList);
      const title = shorten(entryTitle(added));
      return {
        kind: 'add',
        path: `${key}:count`,
        label: title
          ? `Добавление: ${sectionName(key)} «${title}»`
          : `Добавление: новый ${sectionName(key)}`,
        undoText: title
          ? `Добавленный ${sectionName(key)} «${title}» будет удалён.`
          : `Добавленный ${sectionName(key)} будет удалён.`,
      };
    }

    const removed = pickChangedEntry(oldList, newList);
    const title = shorten(entryTitle(removed));
    return {
      kind: 'remove',
      path: `${key}:count`,
      label: title
        ? `Удаление: ${sectionName(key)} «${title}»`
        : `Удаление: ${sectionName(key)}`,
      undoText: title
        ? `Удалённый ${sectionName(key)} «${title}» вернётся на место.`
        : `Удалённый ${sectionName(key)} вернётся на место.`,
    };
  }

  // Иначе это правка поля.
  const path = findDiffPath(before, after);
  if (!path) return null;

  const [section, index, field, language] = path;
  const list = Array.isArray(after[section]) ? after[section] : null;
  const item = list && list[Number(index)];
  const itemTitle = shorten(entryTitle(item), 30);
  const fieldName = FIELD_NAMES[field] || FIELD_NAMES[index] || field || 'поле';
  const langSuffix = typeof language === 'string' && language.length <= 3 ? ` (${language})` : '';

  const where = itemTitle
    ? `у ${sectionName(section, 1)} «${itemTitle}»`
    : `в разделе ${section}`;

  return {
    kind: 'edit',
    path: path.join('.'),
    label: `Правка: ${fieldName}${langSuffix} ${where}`,
    undoText: `Поле «${fieldName}»${langSuffix} ${where} вернётся к прежнему значению.`,
  };
}
