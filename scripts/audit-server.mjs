// Прогон серверной логики по всем основным сценариям.
// Каждый шаг проверяет не «ответил ли сервер», а именно правильный ли ответ.
const B = process.env.BASE || 'http://localhost:5100';
const KEY = 'test';

const post = (u, b) => fetch(B + u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
  .then(async (r) => ({ s: r.status, d: await r.json().catch(() => ({})) }));
const get = (u) => fetch(B + u).then(async (r) => ({ s: r.status, d: await r.json().catch(() => ({})) }));

let passed = 0;
let failed = 0;
const check = (name, ok, extra = '') => {
  if (ok) { passed += 1; } else { failed += 1; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`); }
};
const section = (t) => console.log(`\n${t}`);

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const run = async () => {
  section('Доступ без ключа');
  check('контент отдаётся всем', (await get('/api/content')).s === 200);
  check('сотрудники закрыты', (await get('/api/admin/users')).s === 401);
  check('переписка закрыта', (await get('/api/inbox/chats')).s === 401);
  check('сохранение закрыто', (await post('/api/admin/save', { content: {} })).s === 401);
  check('чужой ключ не подходит', (await get('/api/admin/users?key=нет')).s === 401);

  section('Контакты проверяются');
  check('почта без собаки отклонена', (await post('/api/chat/start', { name: 'A', email: 'nomail', phone: '+998901234567' })).s === 400);
  check('короткий номер отклонён', (await post('/api/chat/start', { name: 'A', email: 'a@b.uz', phone: '12' })).s === 400);
  check('заявка без темы отклонена', (await post('/api/contact', { name: 'A', email: 'a@b.uz', phone: '+998901234567' })).s === 400);

  section('Сотрудники');
  const tree0 = (await get(`/api/admin/users?key=${KEY}`)).d;
  const mgId = tree0.managers[0].id;
  const created = await post('/api/admin/users/create', { key: KEY, role: 'operator', name: 'Тест', login: 'testop', password: 'pass1234', managerId: mgId });
  check('оператор создаётся', created.s === 200, created.d.message);
  const tree = (await get(`/api/admin/users?key=${KEY}`)).d;
  const op2 = tree.managers[0].operators.find((o) => o.login === 'testop');
  check('права по умолчанию у оператора', op2 && op2.rights.canReply === true && op2.rights.canSendFiles === true);
  check('права по умолчанию у менеджера', tree.managers[0].rights.canChat === false);
  check('короткий пароль отклонён', (await post('/api/admin/users/create', { key: KEY, role: 'operator', name: 'X', login: 'x1', password: '12', managerId: mgId })).s === 400);
  check('занятый логин отклонён', (await post('/api/admin/users/create', { key: KEY, role: 'operator', name: 'X', login: 'testop', password: 'pass1234', managerId: mgId })).s === 400);

  section('Чат и права');
  const opTok = (await post('/api/operator/login', { login: 'operator', password: 'operator1971' })).d.token;
  const mgTok = (await post('/api/operator/login', { login: 'manager', password: 'manager1971' })).d.token;
  check('неверный пароль не пускает', (await post('/api/operator/login', { login: 'operator', password: 'нет' })).s === 401);
  const sid = (await post('/api/chat/start', { name: 'Клиент', email: 'k@mail.uz', phone: '+998901234567' })).d.sessionId;
  await post('/api/chat/send', { sessionId: sid, text: 'здравствуйте' });

  const owner = (await get(`/api/inbox/chats?key=${KEY}`)).d.chats.find((c) => c.sessionId === sid);
  const ownerTok = owner.operatorId === op2.id ? null : opTok;
  check('чат назначен оператору', Boolean(owner.operatorId));

  check('админ пишет в чат', (await post('/api/operator/reply', { key: KEY, sessionId: sid, text: 'от админа' })).s === 200);
  check('менеджер без права не пишет', (await post('/api/operator/reply', { key: mgTok, sessionId: sid, text: 'нет' })).s === 403);
  await post('/api/admin/users/update', { key: KEY, id: mgId, patch: { rights: { canChat: true } } });
  check('менеджер с правом пишет', (await post('/api/operator/reply', { key: mgTok, sessionId: sid, text: 'да' })).s === 200);

  const thread = (await get(`/api/inbox/thread?key=${KEY}&sessionId=${sid}`)).d;
  check('админ видит право удаления', thread.canDelete === true);
  check('автор сообщений виден сотрудникам', thread.messages.some((m) => m.by));
  const hist = (await get(`/api/chat/history?sessionId=${sid}`)).d;
  check('клиенту имена не видны', hist.messages.every((m) => !m.by));
  check('удаление сообщения работает', (await post('/api/chat/message/delete', { key: KEY, sessionId: sid, messageId: thread.messages[0].id })).s === 200);
  check('оператор удалять не может', (await post('/api/chat/message/delete', { key: opTok, sessionId: sid, messageId: thread.messages[1].id })).s === 403);

  section('Файлы в чате');
  const up = await post('/api/chat/upload', { key: KEY, sessionId: sid, dataUrl: png, name: 'тест.png' });
  check('файл принят', up.s === 200 && up.d.file && up.d.file.url);
  if (up.d.file) check('файл отдаётся по ссылке', (await fetch(B + up.d.file.url)).status === 200);
  check('запрещённый тип отклонён', (await post('/api/chat/upload', { key: KEY, sessionId: sid, dataUrl: 'data:application/x-msdownload;base64,QQ==', name: 'v.exe' })).s === 400);

  section('Заявки: три этапа');
  await post('/api/contact', { name: 'Заявитель', email: 'z@mail.uz', phone: '+998907654321', message: 'вопрос' });
  const mine = (await get(`/api/inbox/requests?key=${KEY}`)).d.requests;
  const req = mine.find((r) => r.email === 'z@mail.uz');
  check('заявка попала в раздел заявок', Boolean(req));
  check('статус новой заявки', req && (req.status || 'new') === 'new');
  const st1 = await post('/api/inbox/request-status', { key: KEY, id: req.id, status: 'in_progress' });
  check('переход в работу', st1.s === 200 && st1.d.request.status === 'in_progress');
  const st2 = await post('/api/inbox/request-status', { key: KEY, id: req.id, status: 'done' });
  check('переход в обработано', st2.s === 200 && st2.d.request.status === 'done');
  check('неизвестный статус отклонён', (await post('/api/inbox/request-status', { key: KEY, id: req.id, status: 'нет' })).s === 400);

  section('Закрепление клиента за оператором');
  await post('/api/chat/start', { name: 'Заявитель', email: 'z@mail.uz', phone: '+998907654321' });
  const chatOfSame = (await get(`/api/inbox/chats?key=${KEY}`)).d.chats.find((c) => c.email === 'z@mail.uz');
  const reqOfSame = (await get(`/api/admin/messages?key=${KEY}`)).d.messages.find((m) => m.email === 'z@mail.uz');
  check('чат и заявка у одного оператора', chatOfSame.operatorId === reqOfSame.operatorId);

  section('Счётчики для индикаторов');
  const ops = (await get(`/api/inbox/operators?key=${KEY}`)).d;
  check('счётчики приходят', ops.totals && typeof ops.totals.waiting === 'number' && typeof ops.totals.newRequests === 'number');
  check('у каждого оператора свои числа', ops.operators.every((o) => 'waiting' in o && 'unanswered' in o && 'newRequests' in o));

  section('Контент');
  const c = (await get('/api/content')).d;
  check('шесть языков', c.LANGUAGE_OPTIONS.length === 6);
  check('блок мониторинга на месте', Boolean(c.MONITOR && c.MONITOR.kinds && c.MONITOR.places));
  check('словарь подписей на месте', Object.keys(c.UI_TEXT.ru.s || {}).length > 100);
  const save = await post('/api/admin/save', { key: KEY, content: c, autoTranslate: false });
  check('сохранение контента', save.s === 200);
  check('мусор вместо контента отклонён', (await post('/api/admin/save', { key: KEY, content: 'строка' })).s === 400);

  section('Уборка');
  check('оператор удаляется', (await post('/api/admin/users/delete', { key: KEY, id: op2.id })).s === 200);
  await post('/api/admin/users/update', { key: KEY, id: mgId, patch: { rights: { canChat: false } } });

  console.log(`\nПройдено: ${passed}, провалено: ${failed}`);
  process.exit(failed ? 1 : 0);
};

run();
