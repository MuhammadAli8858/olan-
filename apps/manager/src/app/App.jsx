// ---------------------------------------------------------------------------
// Кабинет менеджера: https://ваш-адрес/menedjer/
//
// Менеджер видит список своих операторов, читает их переписку и заявки.
// Писать в чаты и удалять сообщения он может, только если администратор
// включил ему доступ кнопкой «Правит чаты» в разделе «Сотрудники».
//
// Оператору здесь делать нечего — у него свой кабинет по адресу /operator/.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import {
  LogOut, MessageSquare, Inbox as InboxIcon, Users, Headset, RefreshCw, Lock, ArrowLeft, PenLine,
} from 'lucide-react';
import { postJson, getJson } from './lib/api.js';
import { ChatList, ChatThread, RequestStats, RequestList } from './components/Inbox.jsx';

// В хранилище лежит токен сессии, выданный сервером. Пароль не сохраняется.
// Токен хранится под своим ключом, иначе вход в один кабинет выбрасывал бы
// из другого при работе в одном браузере.
const KEY_STORE = 'olan-manager-token';

// Кабинет заперт на одну роль. Проверка стоит и на сервере, здесь она
// нужна, чтобы человек сразу увидел, куда ему идти, а не пустой экран.
const CABINET_ROLE = 'manager';
const OTHER_CABINET = { title: 'кабинет оператора', url: '/operator/' };


// Счётчик непрочитанного над кнопкой. Гаснет сам, когда считать нечего:
// сервер отдаёт ноль, и значок просто не рисуется.
function Badge({ value, tone = 'red' }) {
  if (!value) return null;
  const colour = tone === 'amber' ? 'bg-amber-500' : 'bg-red-500';
  return (
    <span className={`absolute -right-1.5 -top-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full ${colour} px-1 text-[10px] font-bold leading-[18px] text-white shadow`}>
      {value > 99 ? '99+' : value}
    </span>
  );
}

export default function App() {
  const [key, setKey] = useState(() => {
    if (typeof window === 'undefined') return '';
    try { return localStorage.getItem(KEY_STORE) || ''; } catch { return ''; }
  });
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [me, setMe] = useState(null);
  const [operators, setOperators] = useState([]);
  const [totals, setTotals] = useState(null);
  const [online, setOnline] = useState(true);

  const [view, setView] = useState('chats');
  const [operatorId, setOperatorId] = useState('');
  const [chatId, setChatId] = useState('');
  const [status, setStatus] = useState('');

  const isManager = me && me.role === 'manager';

  // ------------------------------- вход -------------------------------

  const doLogin = async () => {
    const login = loginInput.trim();
    if (!login || !passwordInput) { setAuthError('Введите логин и пароль.'); return; }
    try {
      const res = await postJson('/api/operator/login', { login, password: passwordInput });
      if (res.role !== CABINET_ROLE) {
        // Выданную сессию сразу закрываем: чужому кабинету она не нужна.
        postJson('/api/operator/logout', { key: res.token }).catch(() => {});
        setAuthError(`Это кабинет ${CABINET_ROLE === 'operator' ? 'оператора' : 'менеджера'}. Ваш — ${OTHER_CABINET.title}: ${OTHER_CABINET.url}`);
        return;
      }
      try { localStorage.setItem(KEY_STORE, res.token); } catch { /* ignore */ }
      setKey(res.token);
      setAuthError('');
      setPasswordInput('');
    } catch (e) {
      if (/логин|парол|401|unauthorized/i.test(e.message)) setAuthError('Неверный логин или пароль.');
      else setAuthError('Сервер недоступен. Запущен ли он? (npm run server)');
    }
  };

  const logout = () => {
    if (key) postJson('/api/operator/logout', { key }).catch(() => {});
    try { localStorage.removeItem(KEY_STORE); } catch { /* ignore */ }
    setKey(''); setMe(null); setOperators([]);
    setOperatorId(''); setChatId(''); setStatus('');
  };

  // --------------------------- загрузка данных ---------------------------

  const loadOperators = async () => {
    if (!key) return;
    try {
      const data = await getJson(`/api/inbox/operators?key=${encodeURIComponent(key)}`);
      setOperators(data.operators || []);
      setTotals(data.totals || null);
      setOnline(true);
    } catch (e) {
      if (/сесси|доступ|401/i.test(e.message)) {
        try { localStorage.removeItem(KEY_STORE); } catch { /* ignore */ }
        setAuthError('Сессия недействительна. Возможно, администратор сменил пароль.');
        setKey('');
      } else setOnline(false);
    }
  };

  const loadMe = async () => {
    if (!key) return;
    try {
      const profile = await getJson(`/api/operator/me?key=${encodeURIComponent(key)}`);
      // Сессия могла остаться от другой роли — например, человек открыл
      // ссылку на чужой кабинет. Тихо выпускаем и подсказываем адрес.
      if (profile.role !== CABINET_ROLE) {
        try { localStorage.removeItem(KEY_STORE); } catch { /* ignore */ }
        setKey('');
        setMe(null);
        setAuthError(`Это кабинет ${CABINET_ROLE === 'operator' ? 'оператора' : 'менеджера'}. Ваш — ${OTHER_CABINET.title}: ${OTHER_CABINET.url}`);
        return;
      }
      setMe(profile);
    } catch {
      try { localStorage.removeItem(KEY_STORE); } catch { /* ignore */ }
      setAuthError('Сессия истекла. Войдите снова.');
      setKey('');
    }
  };

  useEffect(() => {
    if (!key) return undefined;
    loadMe();
    loadOperators();
    const t = setInterval(loadOperators, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Оператор работает только со своими обращениями — выбирать некого.
  useEffect(() => {
    if (me && me.role === 'operator' && me.id) setOperatorId(me.id);
  }, [me]);

  // ------------------------------ экран входа ------------------------------

  if (!key) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-cyan-500/20 bg-slate-950 p-6 shadow-2xl shadow-cyan-500/10 sm:p-8">
          <div className="mb-6 text-center">
            <div className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-2xl font-bold text-transparent">
              OLAN — Рабочий кабинет
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Вход для менеджеров и операторов. Логин и пароль выдаёт администратор.
            </p>
          </div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Логин</label>
          <input value={loginInput} onChange={(e) => setLoginInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') doLogin(); }}
            type="text" autoComplete="username" placeholder="Логин"
            className="mb-4 w-full rounded-2xl border border-cyan-500/20 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500" />
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Пароль</label>
          <input value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') doLogin(); }}
            type="password" autoComplete="current-password" placeholder="Пароль"
            className="w-full rounded-2xl border border-cyan-500/20 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500" />
          {authError && <div className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{authError}</div>}
          <button type="button" onClick={doLogin}
            className="mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.02]">
            Войти
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------ панель операторов ------------------------------

  // Числа для значков. Сервер присылает их вместе со списком операторов,
  // который и так обновляется каждые пять секунд, — отдельный запрос не нужен.
  const badges = totals || { unanswered: 0, newRequests: 0 };

  const selectedOperator = operators.find((o) => o.id === operatorId) || null;

  const operatorPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-slate-400">Операторы ({operators.length})</span>
        <button type="button" onClick={loadOperators} className="text-slate-500 transition hover:text-cyan-400">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {operators.length === 0 && (
          <div className="px-3 py-10 text-center text-sm text-slate-500">К вам пока не привязан ни один оператор</div>
        )}
        {operators.map((o) => (
          <button key={o.id} type="button"
            onClick={() => { setOperatorId(o.id); setChatId(''); setStatus(''); }}
            className={`w-full rounded-2xl border p-3 text-left transition ${operatorId === o.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-transparent hover:bg-slate-900'}`}>
            <div className="flex items-center gap-2">
              <Headset className="h-4 w-4 shrink-0 text-cyan-400" />
              <span className="truncate font-semibold text-white">{o.name}</span>

              {/* Два числа на виду: сколько сообщений без ответа и сколько
                  заявок оператор ещё не взял в работу. По ним сразу видно,
                  кто разгребает, а кто нет. */}
              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                {o.unanswered > 0 && (
                  <span title={`Сообщений без ответа: ${o.unanswered}`}
                    className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    <MessageSquare className="h-3 w-3" /> {o.unanswered}
                  </span>
                )}
                {o.newRequests > 0 && (
                  <span title={`Новых заявок: ${o.newRequests}`}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    <InboxIcon className="h-3 w-3" /> {o.newRequests}
                  </span>
                )}
                {o.unanswered === 0 && o.newRequests === 0 && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">всё отвечено</span>
                )}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-slate-500">
              <span>чатов: {o.chats}</span>
              <span>заявок: {o.requests}</span>
              {o.waiting > 0 && <span className="text-cyan-400">ждут ответа: {o.waiting}</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ------------------------------ основной экран ------------------------------

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black text-white">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-cyan-500/15 bg-slate-950 px-3 py-3 sm:px-5">
        <div className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-base font-bold text-transparent sm:text-lg">
          OLAN<span className="hidden sm:inline"> — Кабинет менеджера</span>
        </div>

        {me && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
            {isManager ? <Users className="h-3.5 w-3.5 text-blue-400" /> : <Headset className="h-3.5 w-3.5 text-cyan-400" />}
            <span className="max-w-[120px] truncate">{me.name}</span>
            <span className="hidden text-slate-500 sm:inline">· {isManager ? 'менеджер' : 'оператор'}</span>
          </span>
        )}

        {/* Что менеджеру разрешено в переписке, решает администратор
            кнопкой «Правит чаты». Показываем текущее состояние, чтобы
            не гадать, почему поле ввода то есть, то нет. */}
        {me && (
          me.rights && me.rights.canChat ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] text-emerald-300">
              <PenLine className="h-3 w-3" /> можно писать и удалять
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-[11px] text-slate-400">
              <Lock className="h-3 w-3" /> только чтение
            </span>
          )
        )}

        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${online ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
          <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="hidden sm:inline">{online ? 'на связи' : 'нет сервера'}</span>
        </span>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-full border border-cyan-500/20 p-1">
            <button type="button" onClick={() => { setView('chats'); setStatus(''); }}
              title={badges.unanswered ? `Без ответа: ${badges.unanswered}` : 'Все сообщения отвечены'}
              className={`relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs transition sm:px-3 ${view === 'chats' ? 'bg-cyan-500 text-white' : 'text-slate-300 hover:text-white'}`}>
              <MessageSquare className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Чаты</span>
              <Badge value={badges.unanswered} />
            </button>
            <button type="button" onClick={() => { setView('requests'); setChatId(''); }}
              title={badges.newRequests ? `Новых заявок: ${badges.newRequests}` : 'Новых заявок нет'}
              className={`relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs transition sm:px-3 ${view === 'requests' ? 'bg-cyan-500 text-white' : 'text-slate-300 hover:text-white'}`}>
              <InboxIcon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Заявки</span>
              <Badge value={badges.newRequests} tone="amber" />
            </button>
          </div>
          <button type="button" onClick={logout}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-cyan-500/20 px-3 text-sm text-slate-300 transition hover:text-white">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Выйти</span>
          </button>
        </div>
      </header>

      {/* ------------------------------- ЧАТЫ ------------------------------- */}
      {view === 'chats' && (
        isManager ? (
          // Менеджер: операторы → чаты выбранного → переписка
          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[260px_300px_1fr]">
            <aside className={`min-h-0 border-r border-cyan-500/15 bg-slate-950 ${operatorId ? 'hidden md:block' : ''}`}>
              {operatorPanel}
            </aside>

            <aside className={`min-h-0 border-r border-cyan-500/15 bg-slate-950 ${!operatorId || chatId ? 'hidden md:block' : ''}`}>
              {selectedOperator ? (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="flex shrink-0 items-center gap-2 px-3 py-2.5 md:hidden">
                    <button type="button" onClick={() => setOperatorId('')} className="text-slate-400 transition hover:text-white">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <span className="truncate text-sm text-slate-300">{selectedOperator.name}</span>
                  </div>
                  <div className="min-h-0 flex-1">
                    <ChatList authKey={key} operatorId={operatorId} selected={chatId} onSelect={setChatId} />
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-slate-500">
                  <Headset className="h-9 w-9 opacity-40" />
                  <span className="text-sm">Выберите оператора слева</span>
                </div>
              )}
            </aside>

            <section className={`min-h-0 bg-black ${chatId ? '' : 'hidden md:block'}`}>
              <ChatThread authKey={key} sessionId={chatId} onBack={() => setChatId('')} />
            </section>
          </div>
        ) : (
          // Оператор: свои чаты → переписка
          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[340px_1fr]">
            <aside className={`min-h-0 border-r border-cyan-500/15 bg-slate-950 ${chatId ? 'hidden md:block' : ''}`}>
              <ChatList authKey={key} operatorId={operatorId} selected={chatId} onSelect={setChatId} />
            </aside>
            <section className={`min-h-0 bg-black ${chatId ? '' : 'hidden md:block'}`}>
              <ChatThread authKey={key} sessionId={chatId} onBack={() => setChatId('')} />
            </section>
          </div>
        )
      )}

      {/* ------------------------------ ЗАЯВКИ ------------------------------ */}
      {view === 'requests' && (
        isManager ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[260px_1fr]">
            <aside className="flex min-h-0 flex-col border-r border-cyan-500/15 bg-slate-950 max-md:max-h-[38vh]">
              <div className="shrink-0 border-b border-slate-800 px-3 py-2">
                <button type="button" onClick={() => { setOperatorId(''); setStatus(''); }}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${!operatorId ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-300 hover:bg-slate-900'}`}>
                  Все операторы
                </button>
              </div>
              <div className="min-h-0 flex-1">{operatorPanel}</div>
            </aside>

            <section className="min-h-0 overflow-y-auto bg-black p-3 sm:p-4">
              <RequestStats
                authKey={key}
                operatorId={operatorId}
                activeStatus={status}
                onPick={setStatus}
                title={selectedOperator ? `Заявки оператора ${selectedOperator.name}` : 'Заявки всех операторов'}
              />
              <div className="mt-4">
                {status
                  ? <RequestList authKey={key} operatorId={operatorId} status={status} canWrite={false} showOperator={!operatorId} />
                  : <div className="py-10 text-center text-sm text-slate-500">Нажмите на «Новая», «В разработке» или «Обработано», чтобы увидеть заявки</div>}
              </div>
            </section>
          </div>
        ) : (
          <section className="min-h-0 flex-1 overflow-y-auto bg-black p-3 sm:p-4">
            <div className="mx-auto max-w-3xl">
              <RequestStats authKey={key} operatorId={operatorId} activeStatus={status} onPick={setStatus} title="Мои заявки" />
              <div className="mt-4">
                <RequestList authKey={key} operatorId={operatorId} status={status} canWrite />
              </div>
            </div>
          </section>
        )
      )}
    </div>
  );
}
