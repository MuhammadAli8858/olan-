// Подгружает контент сайта с сервера (админ-панель сохраняет его туда) и
// заменяет встроенные данные «на месте». Если сервер недоступен — остаётся
// встроенная версия, и сайт продолжает работать.
import { API_BASE_URL } from '../lib/api.js';
import {
  UI_TEXT,
  PRODUCTS,
  VIOLATION_SOLUTIONS,
  PROJECTS,
  ABOUT_FEATURES,
  BENEFITS,
  PROCESS_STEPS,
  FAQ_ITEMS,
  TESTIMONIALS,
  CONTACT_INFO,
  LANGUAGE_OPTIONS,
  // Блоки из корпоративной презентации
  COMPANY,
  COMPANY_STATS,
  DIRECTIONS,
  PORTFOLIO,
  ENGAGEMENT_MODELS,
  WORKFLOW,
  TEAM,
  SOFTWARE_FEATURES,
  FORM_FACTORS,
  SERVICE_CASES,
  MONITOR,
} from './siteData.js';

// Объект заменяем не целиком, а по полям: ссылка на него разошлась
// по компонентам, и подмена ссылки до них уже не дойдёт.
function replaceObject(target, next) {
  if (!next || typeof next !== 'object' || Array.isArray(next)) return;
  Object.keys(target).forEach((key) => { delete target[key]; });
  Object.assign(target, next);
}

function replaceArray(target, next) {
  if (!Array.isArray(next)) return;
  target.length = 0;
  next.forEach((item) => target.push(item));
}

export function applyServerContent(content) {
  if (!content || typeof content !== 'object') return;
  if (content.UI_TEXT && typeof content.UI_TEXT === 'object') {
    Object.keys(content.UI_TEXT).forEach((lang) => {
      UI_TEXT[lang] = content.UI_TEXT[lang];
    });
  }
  replaceArray(PRODUCTS, content.PRODUCTS);
  replaceArray(VIOLATION_SOLUTIONS, content.VIOLATION_SOLUTIONS);
  replaceArray(PROJECTS, content.PROJECTS);
  replaceArray(ABOUT_FEATURES, content.ABOUT_FEATURES);
  replaceArray(BENEFITS, content.BENEFITS);
  replaceArray(PROCESS_STEPS, content.PROCESS_STEPS);
  replaceArray(FAQ_ITEMS, content.FAQ_ITEMS);
  replaceArray(TESTIMONIALS, content.TESTIMONIALS);
  if (content.CONTACT_INFO && typeof content.CONTACT_INFO === 'object') {
    Object.assign(CONTACT_INFO, content.CONTACT_INFO);
  }
  if (Array.isArray(content.LANGUAGE_OPTIONS) && content.LANGUAGE_OPTIONS.length) {
    replaceArray(LANGUAGE_OPTIONS, content.LANGUAGE_OPTIONS);
  }

  // Блоки из презентации. Без них правки из админ-панели в разделах
  // «Профиль компании», «Продукты», «Команда» и прочих не доходили
  // до собранного сайта — именно поэтому изменения не были видны.
  replaceArray(COMPANY_STATS, content.COMPANY_STATS);
  replaceArray(DIRECTIONS, content.DIRECTIONS);
  replaceArray(PORTFOLIO, content.PORTFOLIO);
  replaceArray(ENGAGEMENT_MODELS, content.ENGAGEMENT_MODELS);
  replaceArray(SERVICE_CASES, content.SERVICE_CASES);
  replaceObject(COMPANY, content.COMPANY);
  replaceObject(WORKFLOW, content.WORKFLOW);
  replaceObject(TEAM, content.TEAM);
  replaceObject(SOFTWARE_FEATURES, content.SOFTWARE_FEATURES);
  replaceObject(FORM_FACTORS, content.FORM_FACTORS);
  replaceObject(MONITOR, content.MONITOR);
}

export async function loadContent() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${API_BASE_URL}/api/content`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return false;
    const content = await res.json();
    applyServerContent(content);
    return true;
  } catch (error) {
    // Раньше здесь молчали, и из-за этого поломка внутри applyServerContent
    // выглядела как «сервер недоступен»: сайт молча оставался со встроенным
    // контентом, а правки из админ-панели не появлялись. Теперь ошибка видна
    // в консоли браузера — её сразу видно при проверке.
    if (error && error.name !== 'AbortError' && typeof console !== 'undefined') {
      console.error('[content] Контент с сервера не применён:', error);
    }
    return false;
  }
}
