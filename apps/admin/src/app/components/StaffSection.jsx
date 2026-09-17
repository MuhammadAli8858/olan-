// ---------------------------------------------------------------------------
// Раздел «Сотрудники» в админ-панели.
//
// Менеджеры показаны карточками, внутри каждой — привязанные к ней операторы.
// Здесь же создаются новые сотрудники, меняются пароли и удаляются учётки.
// Всё это доступно только администратору.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { UserPlus, Trash2, KeyRound, Users, Headset, ChevronDown, ChevronRight, Eye, EyeOff, AlertTriangle, Check, X, MessageSquare, Inbox as InboxIcon, ArrowLeft, MessageSquareOff, Paperclip, PenLine, ShieldCheck } from 'lucide-react';
import { getJson, postJson } from '../lib/api.js';
import { ChatList, ChatThread, RequestStats, RequestList } from './Inbox.jsx';

// --------------------- окно просмотра обращений оператора --------------------
// Администратор видит переписку и заявки, но ничего не редактирует:
// сервер отдаёт canWrite = false, поэтому поля ввода не появляются.

function OperatorInbox({ adminKey, operator, mode, onClose }) {
  const [view, setView] = useState(mode);
  const [chatId, setChatId] = useState('');
  // Счётчик заставляет список чатов перечитаться после удаления.
  const [listStamp, setListStamp] = useState(0);
  const [status, setStatus] = useState('');

  useEffect(() => { setView(mode); setChatId(''); setStatus(''); }, [mode, operator]);
  if (!operator) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 p-2 backdrop-blur-sm sm:p-4">
      <div className="mx-auto flex h-full w-full max-w-6xl min-h-0 flex-col overflow-hidden rounded-2xl border border-cyan-500/25 bg-slate-950">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-cyan-500/15 px-3 py-3 sm:px-4">
          <Headset className="h-4 w-4 shrink-0 text-cyan-400" />
          <span className="font-semibold text-white">{operator.name}</span>
          <span className="hidden text-xs text-slate-500 sm:inline">логин {operator.login}</span>

          <div className="ml-2 flex rounded-full border border-cyan-500/20 p-1">
            <button type="button" onClick={() => setView('chats')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition ${view === 'chats' ? 'bg-cyan-500 text-white' : 'text-slate-300 hover:text-white'}`}>
              <MessageSquare className="h-3.5 w-3.5" /> Чаты
            </button>
            <button type="button" onClick={() => setView('requests')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition ${view === 'requests' ? 'bg-cyan-500 text-white' : 'text-slate-300 hover:text-white'}`}>
              <InboxIcon className="h-3.5 w-3.5" /> Заявки
            </button>
          </div>

          <button type="button" onClick={onClose}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-500/20 text-slate-300 transition hover:text-white"
            aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>

        {view === 'chats' ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[320px_1fr]">
            <div className={`min-h-0 border-r border-cyan-500/15 ${chatId ? 'hidden md:block' : ''}`}>
              <ChatList key={listStamp} authKey={adminKey} operatorId={operator.id} selected={chatId} onSelect={setChatId} />
            </div>
            <div className={`min-h-0 ${chatId ? '' : 'hidden md:block'}`}>
              {/* Удалили переписку — закрываем её и перечитываем список,
                  иначе слева остался бы чат, которого уже нет. */}
              <ChatThread authKey={adminKey} sessionId={chatId} onBack={() => setChatId('')}
                onDeleted={() => { setChatId(''); setListStamp((n) => n + 1); }} />
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
            <RequestStats authKey={adminKey} operatorId={operator.id} activeStatus={status} onPick={setStatus}
              title={`Заявки оператора ${operator.name}`} />
            <div className="mt-4">
              {status
                ? <RequestList authKey={adminKey} operatorId={operator.id} status={status} canWrite={false} />
                : <div className="py-8 text-center text-sm text-slate-500">Выберите статус выше, чтобы увидеть заявки</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------- окно подтверждения -------------------------

function ConfirmDelete({ target, onCancel, onConfirm, busy }) {
  if (!target) return null;
  const isManager = target.role === 'manager';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Подтвердите удаление</h3>
        </div>

        <p className="text-sm leading-relaxed text-slate-300">
          Удалить {isManager ? 'менеджера' : 'оператора'}{' '}
          <span className="font-semibold text-white">«{target.name}»</span>{' '}
          <span className="text-slate-500">(логин {target.login})</span>?
        </p>

        {isManager && target.operatorCount > 0 && (
          <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
            К нему привязано операторов: {target.operatorCount}. После удаления они
            случайным образом перейдут к оставшимся менеджерам.
          </p>
        )}
        {!isManager && (
          <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
            Клиенты этого оператора случайным образом перейдут к другим операторам.
          </p>
        )}

        <p className="mt-3 text-xs text-slate-500">Действие необратимо.</p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {busy ? 'Удаляю…' : `Удалить «${target.name}»`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------- поле пароля --------------------------------

function PasswordCell({ user, onSave, busy }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [shown, setShown] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <code className="rounded-lg bg-black/40 px-2 py-1 text-xs text-slate-300">
          {shown ? user.password : '•'.repeat(Math.min(user.password.length, 10))}
        </code>
        <button type="button" onClick={() => setShown((v) => !v)} title={shown ? 'Скрыть' : 'Показать'}
          className="text-slate-500 transition hover:text-slate-300">
          {shown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <button type="button" onClick={() => { setEditing(true); setValue(''); }} title="Сменить пароль"
          className="text-slate-500 transition hover:text-cyan-300">
          <KeyRound className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && value.length >= 4) { onSave(value); setEditing(false); } if (e.key === 'Escape') setEditing(false); }}
        placeholder="новый пароль"
        className="w-32 rounded-lg border border-cyan-500/30 bg-black/40 px-2 py-1 text-xs text-white outline-none focus:border-cyan-400"
      />
      <button type="button" disabled={busy || value.length < 4}
        onClick={() => { onSave(value); setEditing(false); }}
        className="text-emerald-400 transition hover:text-emerald-300 disabled:opacity-30" title="Сохранить">
        <Check className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => setEditing(false)} className="text-slate-500 transition hover:text-slate-300" title="Отмена">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ------------------------------- основной блок ------------------------------

// Переключатель права. Состояние видно сразу по цвету: включённое право
// подсвечено, выключенное — серое и перечёркнутое по смыслу подписи.
function RightToggle({ on, onToggle, busy, icon: Icon, label, titleOn, titleOff }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!on)}
      disabled={busy}
      title={on ? titleOn : titleOff}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition disabled:opacity-50 ${
        on
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400'
          : 'border-slate-700 bg-slate-900 text-slate-500 hover:border-slate-500 hover:text-slate-300'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

export default function StaffSection({ adminKey }) {
  const [tree, setTree] = useState({ managers: [], orphanOperators: [] });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [expanded, setExpanded] = useState({});
  // Какого оператора и в каком режиме сейчас смотрим.
  const [inbox, setInbox] = useState(null);

  const [newManager, setNewManager] = useState({ name: '', login: '', password: '' });
  const [newOperator, setNewOperator] = useState({ name: '', login: '', password: '', managerId: '' });

  const load = async () => {
    try {
      const data = await getJson(`/api/admin/users?key=${encodeURIComponent(adminKey)}`);
      setTree(data);
      setError('');
      if (!newOperator.managerId && data.managers[0]) {
        setNewOperator((p) => ({ ...p, managerId: data.managers[0].id }));
      }
    } catch (e) {
      setError(`Не удалось загрузить сотрудников: ${e.message}`);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [adminKey]);

  const apply = (result) => {
    if (result.tree) setTree(result.tree);
    if (!newOperator.managerId && result.tree?.managers?.[0]) {
      setNewOperator((p) => ({ ...p, managerId: result.tree.managers[0].id }));
    }
  };

  const createManager = async () => {
    setBusy(true); setError(''); setStatus('');
    try {
      const res = await postJson('/api/admin/users/create', { key: adminKey, role: 'manager', ...newManager });
      apply(res);
      setNewManager({ name: '', login: '', password: '' });
      setStatus(`Менеджер «${res.user.name}» создан.`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const createOperator = async () => {
    setBusy(true); setError(''); setStatus('');
    try {
      const res = await postJson('/api/admin/users/create', { key: adminKey, role: 'operator', ...newOperator });
      apply(res);
      setNewOperator((p) => ({ name: '', login: '', password: '', managerId: p.managerId }));
      setStatus(`Оператор «${res.user.name}» создан и привязан к менеджеру.`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const changeField = async (id, patch, message) => {
    setBusy(true); setError(''); setStatus('');
    try {
      const res = await postJson('/api/admin/users/update', { key: adminKey, id, patch });
      apply(res);
      setStatus(message);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const doDelete = async () => {
    if (!confirmTarget) return;
    setBusy(true); setError('');
    try {
      const res = await postJson('/api/admin/users/delete', { key: adminKey, id: confirmTarget.id });
      apply(res);
      const moved = (res.moved || []).filter((m) => m.manager);
      setStatus(
        moved.length
          ? `«${res.name}» удалён. Операторы перешли: ${moved.map((m) => `${m.operator} → ${m.manager}`).join(', ')}.`
          : `«${res.name}» удалён.`,
      );
      setConfirmTarget(null);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const totalOperators = tree.managers.reduce((n, m) => n + m.operators.length, 0) + tree.orphanOperators.length;

  const renderOperator = (operator) => (
    <div key={operator.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-slate-800 bg-black/30 px-3 py-2">
      <Headset className="h-4 w-4 shrink-0 text-cyan-400" />
      <input
        defaultValue={operator.name}
        onBlur={(e) => { if (e.target.value.trim() && e.target.value !== operator.name) changeField(operator.id, { name: e.target.value }, 'Имя оператора изменено.'); }}
        className="w-36 rounded-lg bg-transparent px-1 py-0.5 text-sm text-white outline-none transition hover:bg-slate-800/60 focus:bg-slate-800"
      />
      <span className="text-xs text-slate-500">логин</span>
      <input
        defaultValue={operator.login}
        onBlur={(e) => { if (e.target.value.trim() && e.target.value !== operator.login) changeField(operator.id, { login: e.target.value }, 'Логин изменён.'); }}
        className="w-28 rounded-lg bg-transparent px-1 py-0.5 text-sm text-slate-300 outline-none transition hover:bg-slate-800/60 focus:bg-slate-800"
      />
      <PasswordCell user={operator} busy={busy} onSave={(pw) => changeField(operator.id, { password: pw }, `Пароль оператора «${operator.name}» изменён.`)} />
      <select
        value={operator.managerId || ''}
        onChange={(e) => changeField(operator.id, { managerId: e.target.value }, 'Оператор переведён к другому менеджеру.')}
        className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 outline-none"
      >
        {tree.managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <div className="ml-auto flex items-center gap-1.5">
        {/* Два права оператора: писать клиенту и прикладывать файлы.
            Второе имеет смысл только вместе с первым — без права писать
            файл всё равно не уйдёт. */}
        <RightToggle
          on={operator.rights?.canReply !== false}
          busy={busy}
          icon={PenLine}
          label="Пишет"
          titleOn={`${operator.name} может писать клиенту. Нажмите, чтобы запретить`}
          titleOff={`${operator.name} не может писать клиенту. Нажмите, чтобы разрешить`}
          onToggle={(value) => changeField(operator.id, { rights: { canReply: value } },
            value ? `Оператор «${operator.name}» снова может писать клиенту.` : `Оператору «${operator.name}» закрыта отправка сообщений.`)}
        />
        <RightToggle
          on={operator.rights?.canSendFiles !== false}
          busy={busy}
          icon={Paperclip}
          label="Файлы"
          titleOn={`${operator.name} может отправлять фото и файлы. Нажмите, чтобы запретить`}
          titleOff={`${operator.name} не может отправлять фото и файлы. Нажмите, чтобы разрешить`}
          onToggle={(value) => changeField(operator.id, { rights: { canSendFiles: value } },
            value ? `Оператор «${operator.name}» снова может отправлять файлы.` : `Оператору «${operator.name}» закрыта отправка файлов.`)}
        />
        <button
          type="button"
          onClick={() => setInbox({ operator, mode: 'chats' })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/20 px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:border-cyan-500/50 hover:text-white"
          title={`Читать переписку оператора ${operator.name}`}
        >
          <MessageSquare className="h-3.5 w-3.5" /> Чаты
        </button>
        <button
          type="button"
          onClick={() => setInbox({ operator, mode: 'requests' })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/20 px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:border-cyan-500/50 hover:text-white"
          title={`Заявки оператора ${operator.name}`}
        >
          <InboxIcon className="h-3.5 w-3.5" /> Заявки
        </button>
        <button
          type="button"
          onClick={() => setConfirmTarget({ id: operator.id, name: operator.name, login: operator.login, role: 'operator' })}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
          title={`Удалить оператора ${operator.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <ConfirmDelete target={confirmTarget} busy={busy} onCancel={() => setConfirmTarget(null)} onConfirm={doDelete} />
      {inbox && (
        <OperatorInbox adminKey={adminKey} operator={inbox.operator} mode={inbox.mode} onClose={() => setInbox(null)} />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-white">Сотрудники</h2>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
          менеджеров: {tree.managers.length} · операторов: {totalOperators}
        </span>
      </div>

      {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
      {status && <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{status}</div>}

      {/* --- формы создания --- */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/60 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Users className="h-4 w-4 text-cyan-400" /> Новый менеджер
          </div>
          <div className="space-y-2">
            <input value={newManager.name} onChange={(e) => setNewManager((p) => ({ ...p, name: e.target.value }))}
              placeholder="Имя, например Азиз"
              className="w-full rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" />
            <input value={newManager.login} onChange={(e) => setNewManager((p) => ({ ...p, login: e.target.value }))}
              placeholder="Логин латиницей, например aziz"
              className="w-full rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" />
            <input value={newManager.password} onChange={(e) => setNewManager((p) => ({ ...p, password: e.target.value }))}
              placeholder="Пароль, минимум 4 символа"
              className="w-full rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" />
            <button type="button" onClick={createManager} disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              <UserPlus className="h-4 w-4" /> Создать менеджера
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/60 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Headset className="h-4 w-4 text-cyan-400" /> Новый оператор
          </div>
          <div className="space-y-2">
            <input value={newOperator.name} onChange={(e) => setNewOperator((p) => ({ ...p, name: e.target.value }))}
              placeholder="Имя, например Нигина"
              className="w-full rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" />
            <input value={newOperator.login} onChange={(e) => setNewOperator((p) => ({ ...p, login: e.target.value }))}
              placeholder="Логин латиницей, например nigina"
              className="w-full rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" />
            <input value={newOperator.password} onChange={(e) => setNewOperator((p) => ({ ...p, password: e.target.value }))}
              placeholder="Пароль, минимум 4 символа"
              className="w-full rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" />
            <div>
              <div className="mb-1 text-xs text-slate-400">Привязать к менеджеру</div>
              <select value={newOperator.managerId} onChange={(e) => setNewOperator((p) => ({ ...p, managerId: e.target.value }))}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400">
                {tree.managers.length === 0 && <option value="">Сначала создайте менеджера</option>}
                {tree.managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <button type="button" onClick={createOperator} disabled={busy || !tree.managers.length}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              <UserPlus className="h-4 w-4" /> Создать оператора
            </button>
          </div>
        </div>
      </div>

      {/* --- карточки менеджеров --- */}
      <div className="space-y-3">
        {tree.managers.map((manager) => {
          const open = expanded[manager.id] !== false;
          return (
            <div key={manager.id} className="rounded-2xl border border-cyan-500/15 bg-slate-900/40">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <button type="button" onClick={() => setExpanded((p) => ({ ...p, [manager.id]: !open }))}
                  className="text-slate-400 transition hover:text-white">
                  {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <Users className="h-4 w-4 shrink-0 text-blue-400" />
                <input
                  defaultValue={manager.name}
                  onBlur={(e) => { if (e.target.value.trim() && e.target.value !== manager.name) changeField(manager.id, { name: e.target.value }, 'Имя менеджера изменено.'); }}
                  className="w-40 rounded-lg bg-transparent px-1 py-0.5 font-semibold text-white outline-none transition hover:bg-slate-800/60 focus:bg-slate-800"
                />
                <span className="text-xs text-slate-500">логин</span>
                <input
                  defaultValue={manager.login}
                  onBlur={(e) => { if (e.target.value.trim() && e.target.value !== manager.login) changeField(manager.id, { login: e.target.value }, 'Логин изменён.'); }}
                  className="w-28 rounded-lg bg-transparent px-1 py-0.5 text-sm text-slate-300 outline-none transition hover:bg-slate-800/60 focus:bg-slate-800"
                />
                <PasswordCell user={manager} busy={busy}
                  onSave={(pw) => changeField(manager.id, { password: pw }, `Пароль менеджера «${manager.name}» изменён.`)} />
                <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
                  операторов: {manager.operators.length}
                </span>
                {/* По умолчанию менеджер переписку только читает. Этой кнопкой
                    админ разрешает ему писать клиентам и удалять сообщения
                    в чатах своих операторов. */}
                <RightToggle
                  on={manager.rights?.canChat === true}
                  busy={busy}
                  icon={ShieldCheck}
                  label="Правит чаты"
                  titleOn={`${manager.name} может писать в чаты и удалять сообщения. Нажмите, чтобы закрыть доступ`}
                  titleOff={`${manager.name} только читает переписку. Нажмите, чтобы открыть доступ`}
                  onToggle={(value) => changeField(manager.id, { rights: { canChat: value } },
                    value ? `Менеджеру «${manager.name}» открыт доступ к переписке.` : `Менеджер «${manager.name}» снова только читает переписку.`)}
                />
                <button
                  type="button"
                  onClick={() => setConfirmTarget({ id: manager.id, name: manager.name, login: manager.login, role: 'manager', operatorCount: manager.operators.length })}
                  className="ml-auto rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
                  title={`Удалить менеджера ${manager.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {open && (
                <div className="space-y-2 border-t border-slate-800 px-4 py-3">
                  {manager.operators.length === 0
                    ? <div className="text-xs text-slate-600">К этому менеджеру пока никто не привязан.</div>
                    : manager.operators.map(renderOperator)}
                </div>
              )}
            </div>
          );
        })}

        {tree.orphanOperators.length > 0 && (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
            <div className="mb-2 text-sm font-semibold text-amber-200">Операторы без менеджера</div>
            <div className="mb-3 text-xs text-amber-200/70">Создайте менеджера, и их можно будет привязать.</div>
            <div className="space-y-2">{tree.orphanOperators.map(renderOperator)}</div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-black/20 px-4 py-3 text-xs leading-relaxed text-slate-500">
        Пароли задаёт и меняет только администратор — сами сотрудники сделать этого не могут.
        Смена пароля сразу разлогинивает сотрудника. Кабинет для входа: <span className="text-slate-400">http://localhost:9090</span>
      </div>
    </div>
  );
}
