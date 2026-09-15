// Перевод подписей, которые написаны прямо в разметке компонентов.
//
// Почему не через контекст: такие строки встречаются и во вложенных
// функциях, и в модульных константах, где хук использовать нельзя.
// Поэтому текущий язык держим здесь, а SiteProvider сообщает о смене.
//
// Ключ словаря — русская строка. В коде видно живой текст:
//   <span>{tr('Открыть карточку')}</span>
// а не абстрактный идентификатор, ради которого пришлось бы лезть
// в файл переводов.
import { UI_TEXT } from '../data/siteData.js';

let currentLanguage = 'ru';

export function setUiLanguage(language) {
  currentLanguage = language || 'ru';
}

export function tr(value) {
  const key = String(value ?? '');
  if (!key) return key;
  const table = UI_TEXT[currentLanguage] && UI_TEXT[currentLanguage].s;
  const translated = table ? table[key] : '';
  // Перевода нет — показываем русский оригинал. Пропуск в словаре
  // не должен ронять страницу или оставлять пустое место.
  return typeof translated === 'string' && translated.trim() ? translated : key;
}
