// ---------------------------------------------------------------------------
// Просмотр обращений оператора: переписка и заявки.
//
// Один и тот же компонент используют три роли:
//   • администратор — читает всё, писать не может;
//   • менеджер      — читает своих операторов, писать не может;
//   • оператор      — читает своё, отвечает и меняет статусы заявок.
//
// Право на запись приходит с сервера в поле canWrite. Экран сам ничего
// не решает: если сервер сказал «только чтение», поля ввода не появятся.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import {
  MessageSquare, Inbox, RefreshCw, Send, ArrowLeft, Clock, Lock,
} from 'lucide-react';
import { getJson, postJson } from '../lib/api.js';

export const STATUSES = [
  { id: 'new', label: 'Новая', dot: 'bg-cyan-400', chip: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  { id: 'in_progress', label: 'В разработке', dot: 'bg-amber-400', chip: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { id: 'done', label: 'Обработано', dot: 'bg-emerald-400', chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
];

export function statusOf(id) {
  return STATUSES.find((s) => s.id === id) || STATUSES[0];
}

// Дата и время в привычном виде: 02.09.2026, 14:35
export function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
}

export function formatShort(iso) {
  try {
    return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

// ------------------------------- переписка ----------------------------------

export function ChatThread({ authKey, sessionId, onBack }) {
  const [thread, setThread] = useState(null);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  const load = async () => {
    if (!sessionId) return;
    try {
      setThread(await getJson(`/api/inbox/thread?key=${encodeURIComponent(authKey)}&sessionId=${encodeURIComponent(sessionId)}`));
      setError('');
    } catch (e) { setError(e.message); }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, authKey]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread]);

  const send = async () => {
    const text = reply.trim();
    if (!text) return;
    setReply('');
    try {
      await postJson('/api/operator/reply', { key: authKey, sessionId, text });
      await load();
    } catch (e) { setError(e.message); }
  };

  if (!sessionId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
        <MessageSquare className="h-10 w-10 opacity-40" />
        <span className="text-sm">Выберите чат, чтобы прочитать переписку</span>
      </div>
    );
  }

  if (!thread) return <div className="p-6 text-sm text-slate-500">Загрузка переписки…</div>;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-start gap-3 border-b border-cyan-500/15 bg-slate-950 px-4 py-3">
        {onBack && (
          <button type="button" onClick={onBack} className="mt-0.5 text-slate-400 transition hover:text-white md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <div className="truncate font-bold text-white">{thread.name}</div>
          <div className="truncate text-xs text-slate-400">
            {thread.email} · {thread.phone}
            {thread.operatorName && <span className="text-cyan-400"> · оператор: {thread.operatorName}</span>}
          </div>
        </div>
        {!thread.canWrite && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-1 text-[11px] text-slate-400">
            <Lock className="h-3 w-3" /> только чтение
          </span>
        )}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-black p-4">
        {thread.messages.length === 0 && <div className="py-8 text-center text-sm text-slate-500">Сообщений пока нет</div>}
        {thread.messages.map((m) => (
          <div key={m.id} className={`flex ${m.from === 'operator' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm ${m.from === 'operator' ? 'rounded-tr-sm bg-gradient-to-r from-cyan-500 to-blue-600 text-white' : 'rounded-tl-sm bg-slate-900 text-slate-100'}`}>
              <div>{m.text}</div>
              <div className={`mt-1 text-[10px] ${m.from === 'operator' ? 'text-cyan-100' : 'text-slate-500'}`}>{formatShort(m.at)}</div>
            </div>
          </div>
        ))}
      </div>

      {thread.canWrite ? (
        <div className="flex shrink-0 items-center gap-2 border-t border-cyan-500/15 bg-slate-950 p-3">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ответ клиенту…"
            className="min-w-0 flex-1 rounded-2xl border border-cyan-500/20 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
          />
          <button type="button" onClick={send} disabled={!reply.trim()}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white transition hover:scale-105 disabled:opacity-50">
            <Send className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div className="shrink-0 border-t border-cyan-500/15 bg-slate-950 px-4 py-3 text-center text-xs text-slate-500">
          Переписку можно только читать. Отвечать клиенту может лишь сам оператор.
        </div>
      )}

      {error && <div className="bg-red-500/10 px-4 py-2 text-center text-xs text-red-300">{error}</div>}
    </div>
  );
}

// ----------------------------- список чатов ---------------------------------

export function ChatList({ authKey, operatorId, selected, onSelect, showOperator }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const suffix = operatorId ? `&operatorId=${encodeURIComponent(operatorId)}` : '';
      const data = await getJson(`/api/inbox/chats?key=${encodeURIComponent(authKey)}${suffix}`);
      setChats(data.chats || []);
    } catch { /* показывается пустым списком */ } finally { setLoading(false); }
  };

  useEffect(() => {
    setLoading(true);
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authKey, operatorId]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-slate-400">Чаты ({chats.length})</span>
        <button type="button" onClick={load} className="text-slate-500 transition hover:text-cyan-400">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {loading && <div className="px-3 py-8 text-center text-sm text-slate-500">Загрузка…</div>}
        {!loading && chats.length === 0 && <div className="px-3 py-10 text-center text-sm text-slate-500">Обращений нет</div>}
        {chats.map((c) => (
          <button key={c.sessionId} type="button" onClick={() => onSelect(c.sessionId)}
            className={`w-full rounded-2xl border p-3 text-left transition ${selected === c.sessionId ? 'border-cyan-500 bg-cyan-500/10' : 'border-transparent hover:bg-slate-900'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold text-white">{c.name}</span>
              <span className="flex shrink-0 items-center gap-2">
                {c.lastFrom === 'user' && <span className="h-2 w-2 rounded-full bg-cyan-400" title="Ждёт ответа" />}
                <span className="text-[11px] text-slate-500">{formatShort(c.lastAt)}</span>
              </span>
            </div>
            <div className="mt-1 truncate text-xs text-slate-400">{c.lastText || '—'}</div>
            <div className="mt-1 truncate text-[11px] text-slate-500">{c.email} · {c.phone}</div>
            {showOperator && c.operatorName && (
              <div className="mt-1 truncate text-[11px] text-cyan-400">оператор: {c.operatorName}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// --------------------------- статистика заявок ------------------------------

export function RequestStats({ authKey, operatorId, activeStatus, onPick, title }) {
  const [stats, setStats] = useState(null);

  const load = async () => {
    try {
      const suffix = operatorId ? `&operatorId=${encodeURIComponent(operatorId)}` : '';
      setStats(await getJson(`/api/inbox/stats?key=${encodeURIComponent(authKey)}${suffix}`));
    } catch { /* ниже покажем пустую сводку */ }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authKey, operatorId]);

  const counts = stats ? stats.counts : { new: 0, in_progress: 0, done: 0 };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold text-slate-300">{title || 'Заявки — сводка'}</h3>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">всего: {stats ? stats.total : 0}</span>
        {stats && stats.lastAt && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" /> последняя: {formatDateTime(stats.lastAt)}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {STATUSES.map((st) => (
          <button key={st.id} type="button" onClick={() => onPick(activeStatus === st.id ? '' : st.id)}
            className={`rounded-2xl border p-4 text-left transition ${activeStatus === st.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-cyan-500/15 bg-slate-900/50 hover:border-cyan-500/40'}`}>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${st.dot}`} />
              <span className="text-sm text-slate-300">{st.label}</span>
            </div>
            <div className="mt-2 text-3xl font-bold text-white">{counts[st.id] || 0}</div>
            <div className="mt-1 text-[11px] text-slate-500">
              {activeStatus === st.id ? 'нажмите, чтобы скрыть список' : 'нажмите, чтобы открыть список'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ----------------------------- список заявок --------------------------------

export function RequestList({ authKey, operatorId, status, canWrite, showOperator, onChanged }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const parts = [`key=${encodeURIComponent(authKey)}`];
      if (operatorId) parts.push(`operatorId=${encodeURIComponent(operatorId)}`);
      if (status) parts.push(`status=${encodeURIComponent(status)}`);
      const data = await getJson(`/api/inbox/requests?${parts.join('&')}`);
      setRequests(data.requests || []);
      setError('');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authKey, operatorId, status]);

  const changeStatus = async (id, next) => {
    setBusyId(id);
    try {
      await postJson('/api/inbox/request-status', { key: authKey, id, status: next });
      await load();
      if (onChanged) onChanged();
    } catch (e) { setError(e.message); } finally { setBusyId(''); }
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-500">Загрузка заявок…</div>;

  return (
    <div className="space-y-3">
      {error && <div className="rounded-2xl bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</div>}
      {requests.length === 0 && <div className="py-10 text-center text-sm text-slate-500">Заявок в этой группе нет</div>}

      {requests.map((r) => {
        const st = statusOf(r.status);
        return (
          <div key={r.id} className="rounded-2xl border border-cyan-500/15 bg-slate-950 p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] ${st.chip}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
              </span>
              <span className="font-semibold text-white">{r.name}</span>
              <span className="text-xs text-slate-400">{r.email} · {r.phone}</span>
              <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                <Clock className="h-3.5 w-3.5" /> поступила {formatDateTime(r.createdAt)}
              </span>
            </div>

            {showOperator && r.operatorName && (
              <div className="mt-1.5 text-[11px] text-cyan-400">оператор: {r.operatorName}</div>
            )}

            <div className="mt-2.5 whitespace-pre-wrap break-words rounded-xl bg-black/40 p-3 text-sm text-slate-200">
              {r.message}
            </div>

            {canWrite ? (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] text-slate-500">статус:</span>
                {STATUSES.map((option) => (
                  <button key={option.id} type="button" disabled={busyId === r.id || option.id === r.status}
                    onClick={() => changeStatus(r.id, option.id)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition disabled:opacity-100 ${option.id === r.status ? option.chip : 'border-slate-700 text-slate-400 hover:border-cyan-500/40 hover:text-white'}`}>
                    {option.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-slate-600">
                <Lock className="h-3 w-3" /> статус меняет оператор
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export { Inbox };
