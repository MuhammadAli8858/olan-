import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send } from 'lucide-react';
import { postJson, getJson } from '../lib/api.js';
import { useSite } from '../context/SiteContext.jsx';
import { localize } from '../data/siteData.js';

const SESSION_KEY = 'olan-chat-session';
const POLL_MS = 5000;
// Через сколько миллисекунд чат открывается сам после загрузки страницы (5 секунд).
const AUTO_OPEN_DELAY = 5000;
// Ключ, чтобы авто-открытие срабатывало один раз за сессию браузера.
const AUTO_POPUP_KEY = 'olan-chat-autopopup';

function loadSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function ChatWidget() {
  const { language } = useSite();
  // Имя оператора приходит с сервера сразу на всех языках сайта,
  // поэтому при смене языка оно меняется вместе с интерфейсом.
  const [operatorNames, setOperatorNames] = useState(null);
  const operatorName = operatorNames ? localize(operatorNames, language) : '';
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(loadSession); // { sessionId, name, email, phone }
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState(''); // error/info text
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [unread, setUnread] = useState(0);

  const scrollRef = useRef(null);
  const seenCountRef = useRef(0);
  const autoTimerRef = useRef(null);

  // Отменяем авто-открытие и помечаем, что в этой сессии всплытие уже было
  const markAutoPopupDone = () => {
    try { sessionStorage.setItem(AUTO_POPUP_KEY, '1'); } catch { /* ignore */ }
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
  };

  // Авто-открытие чата через несколько секунд (один раз за сессию браузера)
  useEffect(() => {
    let dismissed = false;
    try { dismissed = sessionStorage.getItem(AUTO_POPUP_KEY) === '1'; } catch { /* ignore */ }
    if (dismissed) return undefined;
    autoTimerRef.current = setTimeout(() => {
      setOpen(true);
      markAutoPopupDone();
    }, AUTO_OPEN_DELAY);
    return () => { if (autoTimerRef.current) clearTimeout(autoTimerRef.current); };
  }, []);

  const persistSession = (value) => {
    setSession(value);
    try {
      if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value));
      else localStorage.removeItem(SESSION_KEY);
    } catch { /* ignore */ }
  };

  const resetToForm = () => {
    persistSession(null);
    setMessages([]);
    seenCountRef.current = 0;
  };

  // Fetch new messages for the active session
  const fetchMessages = async (afterIndex) => {
    if (!session) return;
    try {
      const data = await getJson(`/api/chat/history?sessionId=${encodeURIComponent(session.sessionId)}&after=${afterIndex}`);
      if (data.operatorNames) setOperatorNames(data.operatorNames);
      if (Array.isArray(data.messages) && data.messages.length) {
        setMessages((prev) => {
          const merged = [...prev, ...data.messages];
          return merged;
        });
      }
      setStatus('');
    } catch (error) {
      if (/не найдена|not found/i.test(error.message)) {
        resetToForm();
      }
    }
  };

  // Initial load of full history when a session exists
  useEffect(() => {
    if (!session) return;
    setMessages([]);
    fetchMessages(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session && session.sessionId]);

  // Polling for new messages (also when closed, to drive the unread badge)
  useEffect(() => {
    if (!session) return undefined;
    const timer = setInterval(() => {
      fetchMessages(messages.length);
    }, POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session && session.sessionId, messages.length]);

  // Track unread operator messages while the panel is closed
  useEffect(() => {
    const operatorCount = messages.filter((m) => m.from === 'operator').length;
    if (open) {
      seenCountRef.current = operatorCount;
      setUnread(0);
    } else {
      const delta = operatorCount - seenCountRef.current;
      setUnread(delta > 0 ? delta : 0);
    }
  }, [messages, open]);

  // Auto-scroll to the latest message
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const startChat = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    if (!name || !email || !phone) {
      setStatus('Заполните имя, email и телефон.');
      return;
    }
    setStarting(true);
    setStatus('');
    try {
      const data = await postJson('/api/chat/start', { name, email, phone });
      if (data.operatorNames) setOperatorNames(data.operatorNames);
      persistSession({ sessionId: data.sessionId, name, email, phone });
      setMessages([]);
      seenCountRef.current = 0;
    } catch (error) {
      setStatus(error.message || 'Не удалось начать чат. Проверьте, что сервер запущен.');
    } finally {
      setStarting(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !session) return;
    setSending(true);
    setStatus('');
    // optimistic
    const optimistic = { id: `local-${Date.now()}`, from: 'user', text, at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    try {
      await postJson('/api/chat/send', { sessionId: session.sessionId, text });
    } catch (error) {
      setStatus(error.message || 'Сообщение не отправлено. Проверьте соединение.');
      if (/не найдена|not found/i.test(error.message)) resetToForm();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="mb-3 flex h-[520px] w-[92vw] max-w-[380px] flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-cyan-500/20 bg-white shadow-2xl shadow-cyan-500/20 dark:bg-slate-950"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-4 text-white">
              <div className="min-w-0">
                <div className="truncate text-base font-bold">
                  {operatorName ? operatorName : 'Онлайн-чат OLAN'}
                </div>
                <div className="truncate text-xs text-cyan-100">
                  {operatorName ? 'ваш оператор' : 'Ответим на ваш вопрос'}
                </div>
              </div>
              <button type="button" onClick={() => { markAutoPopupDone(); setOpen(false); }} aria-label="Закрыть чат" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!session ? (
              /* Pre-chat form */
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Представьтесь, пожалуйста — так мы сможем ответить именно вам. Ответ оператора появится здесь, в чате.
                </p>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ваше имя"
                  className="rounded-2xl border border-slate-200 dark:border-cyan-500/20 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500 dark:bg-slate-900 dark:text-white"
                />
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  type="email"
                  placeholder="Email"
                  className="rounded-2xl border border-slate-200 dark:border-cyan-500/20 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500 dark:bg-slate-900 dark:text-white"
                />
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Телефон"
                  className="rounded-2xl border border-slate-200 dark:border-cyan-500/20 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500 dark:bg-slate-900 dark:text-white"
                />
                {status && <div className="text-sm text-red-500">{status}</div>}
                <button
                  type="button"
                  onClick={startChat}
                  disabled={starting}
                  className="mt-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:scale-[1.02] disabled:opacity-60"
                >
                  {starting ? 'Запуск…' : 'Начать чат'}
                </button>
              </div>
            ) : (
              /* Chat thread */
              <>
                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4 dark:bg-black">
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white px-4 py-2 text-sm text-slate-700 shadow dark:bg-slate-900 dark:text-slate-200">
                      Здравствуйте, {session.name}! Напишите ваш вопрос — мы ответим здесь и продублируем на ваш email.
                    </div>
                  </div>
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm shadow ${
                          m.from === 'user'
                            ? 'rounded-tr-sm bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                            : 'rounded-tl-sm bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
                {status && <div className="px-4 py-1 text-xs text-red-500">{status}</div>}
                <div className="flex items-center gap-2 border-t border-slate-200 dark:border-cyan-500/15 bg-white p-3 dark:bg-slate-950">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Введите сообщение…"
                    className="flex-1 rounded-2xl border border-slate-200 dark:border-cyan-500/20 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-500 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={sending || !input.trim()}
                    aria-label="Отправить"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white transition hover:scale-105 disabled:opacity-50"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => { markAutoPopupDone(); setOpen((v) => !v); }}
        aria-label="Открыть чат"
        className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/30 transition hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {unread}
          </span>
        )}
      </button>
    </div>
  );
}
