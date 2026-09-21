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
import { MessageSquare, Inbox, RefreshCw, Send, ArrowLeft, Clock, Lock, Trash2, Paperclip, FileText, PlayCircle, CheckCircle2, Mail, Phone, ExternalLink } from 'lucide-react';
import { getJson, postJson, API_BASE_URL } from '../lib/api.js';

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


// Вложение в сообщении: картинку показываем сразу, остальное — ссылкой.
function ChatAttachment({ file }) {
  if (!file || !file.url) return null;
  // Путь /chat-files/... раздаёт сервер; при разработке кабинет открыт на
  // другом порту, поэтому адрес собираем от сервера, а не от страницы.
  const url = /^(https?:|data:|blob:)/i.test(file.url) ? file.url : `${API_BASE_URL}${file.url}`;
  const size = file.size ? `${(file.size / 1024).toFixed(0)} КБ` : '';

  if (file.isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <img src={url} alt={file.name || ''} className="max-h-56 w-auto rounded-xl object-contain" />
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer"
      className="flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2 transition hover:bg-black/30">
      <FileText className="h-4 w-4 shrink-0" />
      <span className="min-w-0 truncate text-xs underline">{file.name || 'файл'}</span>
      {size && <span className="shrink-0 text-[10px] opacity-70">{size}</span>}
    </a>
  );
}

export function ChatThread({ authKey, sessionId, onBack, onDeleted }) {
  const [thread, setThread] = useState(null);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);

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

  // Удаление сообщения. Спрашиваем подтверждение: действие необратимо,
  // переписка — это то, на что потом ссылаются.
  const onDelete = async (message) => {
    const preview = (message.text || (message.file && message.file.name) || '').slice(0, 60);
    if (!confirm(`Удалить сообщение?\n\n${preview}`)) return;
    try {
      await postJson('/api/chat/message/delete', { key: authKey, sessionId, messageId: message.id });
      await load();
    } catch (e) { setError(e.message); }
  };

  // Удаление всей переписки. Спрашиваем дважды: восстановить нельзя,
  // а вместе с чатом уходят и присланные в нём файлы.
  const deleteChat = async () => {
    const count = thread && thread.messages ? thread.messages.length : 0;
    const who = thread ? thread.name : '';
    if (!confirm(`Удалить переписку с клиентом «${who}»?\n\nБудет стёрто сообщений: ${count}, вместе с присланными файлами. Отменить это нельзя.`)) return;
    try {
      await postJson('/api/chat/delete', { key: authKey, sessionId });
      if (onDeleted) onDeleted();
    } catch (e) { setError(e.message); }
  };

  // Файл уходит строкой data:…;base64 — тем же способом, что и картинки
  // товаров в админке, поэтому отдельная форма загрузки не нужна.
  const sendFile = async (file) => {
    if (!file) return;
    if (fileRef.current) fileRef.current.value = '';
    if (file.size > 10 * 1024 * 1024) {
      setError(`Файл больше 10 МБ (${(file.size / 1048576).toFixed(1)} МБ).`);
      return;
    }
    setUploading(true);
    setError('');
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Не удалось прочитать файл.'));
        reader.readAsDataURL(file);
      });
      await postJson('/api/chat/upload', { key: authKey, sessionId, dataUrl, name: file.name, text: reply.trim() });
      setReply('');
      await load();
    } catch (e) { setError(e.message); } finally { setUploading(false); }
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

        {/* Удаление всей переписки. Сервер отдаёт этот флаг только
            администратору, поэтому у оператора и менеджера кнопки нет. */}
        {thread.canDeleteChat && (
          <button type="button" onClick={deleteChat}
            title="Удалить всю переписку с этим клиентом"
            className={`${thread.canWrite ? 'ml-auto' : 'ml-2'} inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-500/30 px-2.5 py-1.5 text-[11px] text-red-400 transition hover:bg-red-500/10 hover:text-red-300`}>
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Удалить чат</span>
          </button>
        )}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-black p-4">
        {thread.messages.length === 0 && <div className="py-8 text-center text-sm text-slate-500">Сообщений пока нет</div>}
        {thread.messages.map((m) => (
          <div key={m.id} className={`group flex items-end gap-1.5 ${m.from === 'operator' ? 'justify-end' : 'justify-start'}`}>
            {/* Кнопка удаления стоит снаружи пузыря и появляется по наведению,
                чтобы случайно не нажать её при чтении переписки. */}
            {thread.canDelete && m.from === 'operator' && (
              <button type="button" onClick={() => onDelete(m)} title="Удалить сообщение"
                className="mb-1 hidden rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400 group-hover:block">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <div className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm ${m.from === 'operator' ? 'rounded-tr-sm bg-gradient-to-r from-cyan-500 to-blue-600 text-white' : 'rounded-tl-sm bg-slate-900 text-slate-100'}`}>
              {m.file && <ChatAttachment file={m.file} />}
              {m.text && <div className={m.file ? 'mt-2' : ''}>{m.text}</div>}
              <div className={`mt-1 text-[10px] ${m.from === 'operator' ? 'text-cyan-100' : 'text-slate-500'}`}>
                {formatShort(m.at)}
                {/* Кто именно ответил: у клиента все ответы «от оператора»,
                    а сотрудникам важно различать оператора, менеджера и админа. */}
                {m.from === 'operator' && m.by ? ` · ${m.by}` : ''}
              </div>
            </div>
            {thread.canDelete && m.from === 'user' && (
              <button type="button" onClick={() => onDelete(m)} title="Удалить сообщение"
                className="mb-1 hidden rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400 group-hover:block">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {thread.canWrite ? (
        <div className="flex shrink-0 items-center gap-2 border-t border-cyan-500/15 bg-slate-950 p-3">
          {/* Скрепка появляется, только если сервер разрешил файлы:
              закрытую возможность не показываем вовсе. */}
          {thread.canSendFiles && (
            <>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => sendFile(e.target.files && e.target.files[0])}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />
              <button type="button" onClick={() => fileRef.current && fileRef.current.click()} disabled={uploading}
                title="Отправить фото или файл"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/20 text-slate-300 transition hover:border-cyan-500/50 hover:text-white disabled:opacity-50">
                <Paperclip className="h-5 w-5" />
              </button>
            </>
          )}
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={uploading ? 'Отправляю файл…' : 'Ответ клиенту…'}
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


// Тема письма клиенту по заявке.
const MAIL_SUBJECT = 'Ваша заявка на сайте OLAN HIGH TECH PROJECT';

// Ссылка на окно нового письма в Gmail: адрес клиента уже в поле «Кому»,
// тема заполнена, в тексте — цитата его обращения, чтобы оператор
// не переключался между вкладками.
function gmailCompose(request) {
  const body = [
    `Здравствуйте, ${request.name || ''}!`,
    '',
    'Вы оставили заявку на нашем сайте:',
    `«${request.message || ''}»`,
    '',
    '',
  ].join('\n');
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: request.email || '',
    su: MAIL_SUBJECT,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

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

            {/* Связаться с клиентом прямо отсюда: на втором этапе оператор
                пишет на почту или звонит, и искать контакты глазами незачем. */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {/* Открывает Gmail с уже заполненным полем «Кому» и темой.
                  Через mailto: письмо не откроется, если в системе не назначен
                  почтовый клиент, — а это как раз обычный случай в браузере.
                  Для тех, кто работает в почтовой программе, рядом стоит
                  вторая, маленькая кнопка. */}
              <a href={gmailCompose(r)} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:border-cyan-500/50 hover:text-white">
                <Mail className="h-3.5 w-3.5" /> Написать
              </a>
              <a href={`mailto:${r.email}?subject=${encodeURIComponent(MAIL_SUBJECT)}`}
                title="Открыть в почтовой программе на компьютере"
                className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-xl border border-slate-700 text-slate-400 transition hover:border-cyan-500/50 hover:text-white">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a href={`tel:${String(r.phone || '').replace(/[^+\d]/g, '')}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:border-cyan-500/50 hover:text-white">
                <Phone className="h-3.5 w-3.5" /> Позвонить
              </a>
            </div>

            {canWrite ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {/* Заявка идёт по одному маршруту: новая → в разработке →
                    обработано. Поэтому главная кнопка одна — следующий шаг,
                    а возврат назад спрятан рядом мелким текстом. */}
                {r.status === 'new' && (
                  <button type="button" disabled={busyId === r.id}
                    onClick={() => changeStatus(r.id, 'in_progress')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
                    <PlayCircle className="h-4 w-4" /> Принять в работу
                  </button>
                )}

                {r.status === 'in_progress' && (
                  <>
                    <button type="button" disabled={busyId === r.id}
                      onClick={() => changeStatus(r.id, 'done')}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50">
                      <CheckCircle2 className="h-4 w-4" /> Заявка обработана
                    </button>
                    <button type="button" disabled={busyId === r.id}
                      onClick={() => changeStatus(r.id, 'new')}
                      className="text-[11px] text-slate-500 underline transition hover:text-slate-300 disabled:opacity-50">
                      вернуть в новые
                    </button>
                  </>
                )}

                {r.status === 'done' && (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> обработана {formatDateTime(r.statusAt)}
                    </span>
                    <button type="button" disabled={busyId === r.id}
                      onClick={() => changeStatus(r.id, 'in_progress')}
                      className="text-[11px] text-slate-500 underline transition hover:text-slate-300 disabled:opacity-50">
                      вернуть в работу
                    </button>
                  </>
                )}
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
