// Адрес API-сервера определяется автоматически:
//   1) если задан VITE_API_URL в .env — берём его;
//   2) если открыто с порта Vite (5173/9000/9090) — тот же хост, порт 3001;
//      благодаря этому работает и http://localhost, и http://192.168.x.x;
//   3) иначе (продакшен, раздача с одного домена) — тот же origin.
function resolveApiBaseUrl() {
  const fromEnv = import.meta.env?.VITE_API_URL;
  if (fromEnv) return String(fromEnv).replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname, port, origin } = window.location;
    const DEV_PORTS = ['5173', '9000', '9090'];
    if (DEV_PORTS.includes(port)) return `${protocol}//${hostname}:3001`;
    return origin;
  }
  return 'http://localhost:3001';
}

const API_BASE_URL = resolveApiBaseUrl();

export async function postJson(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export async function getJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export { API_BASE_URL };
