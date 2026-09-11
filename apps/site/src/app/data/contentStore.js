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
} from './siteData.js';

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
  } catch {
    /* сервер недоступен — используем встроенный контент */
    return false;
  }
}
