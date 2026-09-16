// ---------------------------------------------------------------------------
// Сотрудники: менеджеры и операторы.
//
// • Менеджер — руководитель группы. К нему привязываются операторы.
// • Оператор — отвечает в чате и получает заявки. Всегда привязан к менеджеру.
//
// Создавать, менять пароли и удалять может ТОЛЬКО администратор через
// админ-панель. Сами сотрудники свои пароли менять не могут.
//
// Обращения клиентов распределяются между операторами случайно, но «липко»:
// один и тот же клиент всегда попадает к одному и тому же оператору —
// и в онлайн-чате, и в заявках с формы.
// ---------------------------------------------------------------------------

import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const MIN_PASSWORD = 4;

function readJson(file, fallback) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

// Ключ клиента: по email и по телефону сразу, чтобы человек узнавался
// независимо от того, что он указал в чате и что в форме заявки.
function clientKeys({ email, phone }) {
  const keys = [];
  const mail = String(email || '').trim().toLowerCase();
  const tel = String(phone || '').replace(/\D/g, '');
  if (mail) keys.push(`email:${mail}`);
  if (tel.length >= 7) keys.push(`phone:${tel.slice(-9)}`);
  return keys;
}

function pickRandom(list) {
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

// Права сотрудников.
//
// Значения по умолчанию подобраны так, чтобы у всех, кто заведён раньше,
// ничего не изменилось: оператор как и прежде отвечает клиенту и может
// отправлять файлы, менеджер по-прежнему только читает переписку.
// Администратор в этой таблице не участвует — ему можно всё.
export const DEFAULT_RIGHTS = {
  operator: {
    canReply: true,      // писать клиенту в чат
    canSendFiles: true,  // отправлять клиенту фото и файлы
  },
  manager: {
    canChat: false,      // писать в чат и удалять сообщения
  },
};

export class Staff {
  constructor(usersFile, assignmentsFile, sessionsFile) {
    this.usersFile = usersFile;
    this.assignmentsFile = assignmentsFile;
    this.sessionsFile = sessionsFile;
    this.data = readJson(usersFile, null) || { managers: [], operators: [] };
    this.assignments = readJson(assignmentsFile, {}) || {};
    this.sessions = readJson(sessionsFile, {}) || {};
    this.ensureSeed();
  }

  save() { writeJson(this.usersFile, this.data); }
  saveAssignments() { writeJson(this.assignmentsFile, this.assignments); }
  saveSessions() { writeJson(this.sessionsFile, this.sessions); }

  // Первый запуск: создаём одного менеджера и одного оператора,
  // чтобы система сразу работала. Их можно переименовать или удалить.
  ensureSeed() {
    if (this.data.managers.length || this.data.operators.length) return;
    const manager = {
      id: `m_${randomUUID().slice(0, 8)}`,
      name: 'Главный менеджер',
      login: 'manager',
      password: 'manager1971',
      createdAt: new Date().toISOString(),
    };
    const operator = {
      id: `o_${randomUUID().slice(0, 8)}`,
      name: 'Оператор 1',
      login: 'operator',
      password: 'operator1971',
      managerId: manager.id,
      createdAt: new Date().toISOString(),
    };
    this.data.managers.push(manager);
    this.data.operators.push(operator);
    this.save();
  }

  // Имя сотрудника на нужном языке. Переводы складываются в nameI18n
  // при создании и переименовании; если перевода нет — берём оригинал.
  localizedName(user, language) {
    if (!user) return null;
    if (user.nameI18n && user.nameI18n[language]) return user.nameI18n[language];
    return user.name;
  }

  setNameTranslations(id, translations) {
    const user = this.findById(id);
    if (!user || !translations) return;
    user.nameI18n = { ...(user.nameI18n || {}), ...translations };
    this.save();
  }

  // ------------------------------ выборки ------------------------------

  all() { return [...this.data.managers, ...this.data.operators]; }
  findById(id) { return this.all().find((u) => u.id === id) || null; }
  findByLogin(login) {
    const value = String(login || '').trim().toLowerCase();
    return this.all().find((u) => u.login.toLowerCase() === value) || null;
  }
  roleOf(user) { return user && user.id.startsWith('m_') ? 'manager' : 'operator'; }
  operatorsOfManager(managerId) { return this.data.operators.filter((o) => o.managerId === managerId); }

  // Структура для админ-панели: менеджеры, внутри каждого — его операторы.
  tree() {
    return {
      managers: this.data.managers.map((m) => ({
        ...this.withRights(m),
        operators: this.operatorsOfManager(m.id).map((o) => this.withRights(o)),
      })),
      // Операторы без менеджера появляются, только если менеджеров не осталось.
      orphanOperators: this.data.operators
        .filter((o) => !this.data.managers.some((m) => m.id === o.managerId))
        .map((o) => this.withRights(o)),
    };
  }

  // Чьи чаты и заявки видит сотрудник.
  visibleOperatorIds(user) {
    if (!user) return [];
    if (this.roleOf(user) === 'operator') return [user.id];
    return this.operatorsOfManager(user.id).map((o) => o.id);
  }

  // ------------------------------ права ------------------------------

  // Права сотрудника: умолчания роли, поверх них — то, что выставил админ.
  rightsOf(user) {
    if (!user) return {};
    const defaults = DEFAULT_RIGHTS[this.roleOf(user)] || {};
    return { ...defaults, ...(user.rights || {}) };
  }

  can(user, right) {
    return this.rightsOf(user)[right] === true;
  }

  // Сотрудник вместе с правами — в таком виде его ждёт админ-панель.
  withRights(user) {
    return { ...user, rights: this.rightsOf(user) };
  }

  // ------------------------------ создание ------------------------------

  create({ role, name, login, password, managerId }) {
    const cleanName = String(name || '').trim();
    const cleanLogin = String(login || '').trim();
    const cleanPassword = String(password || '');

    if (!cleanName) throw new Error('Укажите имя сотрудника.');
    if (!cleanLogin) throw new Error('Укажите логин.');
    if (!/^[A-Za-z0-9._-]+$/.test(cleanLogin)) throw new Error('Логин: только латиница, цифры, точка, дефис и подчёркивание.');
    if (cleanPassword.length < MIN_PASSWORD) throw new Error(`Пароль должен быть не короче ${MIN_PASSWORD} символов.`);
    if (this.findByLogin(cleanLogin)) throw new Error(`Логин «${cleanLogin}» уже занят.`);

    if (role === 'manager') {
      const manager = {
        id: `m_${randomUUID().slice(0, 8)}`,
        name: cleanName,
        login: cleanLogin,
        password: cleanPassword,
        createdAt: new Date().toISOString(),
      };
      this.data.managers.push(manager);
      this.save();
      return manager;
    }

    if (role === 'operator') {
      if (!this.data.managers.length) throw new Error('Сначала создайте хотя бы одного менеджера.');
      const manager = this.data.managers.find((m) => m.id === managerId);
      if (!manager) throw new Error('Выберите менеджера, к которому привязать оператора.');
      const operator = {
        id: `o_${randomUUID().slice(0, 8)}`,
        name: cleanName,
        login: cleanLogin,
        password: cleanPassword,
        managerId: manager.id,
        createdAt: new Date().toISOString(),
      };
      this.data.operators.push(operator);
      this.save();
      return operator;
    }

    throw new Error('Неизвестная роль сотрудника.');
  }

  // ------------------------------ изменение ------------------------------

  update(id, patch = {}) {
    const user = this.findById(id);
    if (!user) throw new Error('Сотрудник не найден.');

    if (patch.name !== undefined) {
      const value = String(patch.name).trim();
      if (!value) throw new Error('Имя не может быть пустым.');
      user.name = value;
    }
    if (patch.login !== undefined) {
      const value = String(patch.login).trim();
      if (!value) throw new Error('Логин не может быть пустым.');
      if (!/^[A-Za-z0-9._-]+$/.test(value)) throw new Error('Логин: только латиница, цифры, точка, дефис и подчёркивание.');
      const busy = this.findByLogin(value);
      if (busy && busy.id !== id) throw new Error(`Логин «${value}» уже занят.`);
      user.login = value;
    }
    if (patch.password !== undefined && patch.password !== '') {
      const value = String(patch.password);
      if (value.length < MIN_PASSWORD) throw new Error(`Пароль должен быть не короче ${MIN_PASSWORD} символов.`);
      user.password = value;
      // Смена пароля разлогинивает сотрудника.
      this.dropSessionsFor(id);
    }
    if (patch.rights !== undefined && patch.rights && typeof patch.rights === 'object') {
      // Принимаем только те переключатели, которые есть у этой роли:
      // случайное «canChat» у оператора ничего не должно менять.
      const allowed = Object.keys(DEFAULT_RIGHTS[this.roleOf(user)] || {});
      const next = { ...(user.rights || {}) };
      for (const [key, value] of Object.entries(patch.rights)) {
        if (!allowed.includes(key)) throw new Error(`Неизвестное право: ${key}.`);
        next[key] = value === true;
      }
      user.rights = next;
    }
    if (patch.managerId !== undefined && this.roleOf(user) === 'operator') {
      const manager = this.data.managers.find((m) => m.id === patch.managerId);
      if (!manager) throw new Error('Такого менеджера нет.');
      user.managerId = manager.id;
    }

    this.save();
    return user;
  }

  // ------------------------------ удаление ------------------------------

  // Удаляет сотрудника и разбирается с «осиротевшими» связями:
  //   • удалили менеджера → его операторы случайно расходятся к другим менеджерам;
  //   • удалили оператора → его клиенты случайно расходятся к другим операторам.
  remove(id) {
    const user = this.findById(id);
    if (!user) throw new Error('Сотрудник не найден.');
    const role = this.roleOf(user);
    const moved = [];

    if (role === 'manager') {
      this.data.managers = this.data.managers.filter((m) => m.id !== id);
      const orphans = this.data.operators.filter((o) => o.managerId === id);
      for (const operator of orphans) {
        const target = pickRandom(this.data.managers);
        operator.managerId = target ? target.id : null;
        moved.push({ operator: operator.name, manager: target ? target.name : null });
      }
    } else {
      this.data.operators = this.data.operators.filter((o) => o.id !== id);
      const remaining = this.data.operators;
      for (const [clientKey, operatorId] of Object.entries(this.assignments)) {
        if (operatorId !== id) continue;
        const target = pickRandom(remaining);
        if (target) this.assignments[clientKey] = target.id;
        else delete this.assignments[clientKey];
      }
      this.saveAssignments();
    }

    this.dropSessionsFor(id);
    this.save();
    return { role, name: user.name, moved };
  }

  // ------------------------------ сессии ------------------------------

  authenticate(login, password) {
    const user = this.findByLogin(login);
    if (!user || user.password !== String(password || '')) return null;
    return user;
  }

  createSession(user) {
    const token = randomUUID();
    this.sessions[token] = { userId: user.id, at: new Date().toISOString() };
    this.saveSessions();
    return token;
  }

  userByToken(token) {
    const session = this.sessions[String(token || '')];
    if (!session) return null;
    const user = this.findById(session.userId);
    if (!user) { delete this.sessions[token]; this.saveSessions(); return null; }
    return user;
  }

  dropSession(token) {
    if (this.sessions[token]) { delete this.sessions[token]; this.saveSessions(); }
  }

  dropSessionsFor(userId) {
    let changed = false;
    for (const [token, session] of Object.entries(this.sessions)) {
      if (session.userId === userId) { delete this.sessions[token]; changed = true; }
    }
    if (changed) this.saveSessions();
  }

  // -------------------- распределение клиентов --------------------

  // Возвращает id оператора для клиента. Если клиент уже обращался —
  // отдаёт того же оператора. Если нет — выбирает случайного и запоминает.
  assignOperator({ email, phone }) {
    const keys = clientKeys({ email, phone });
    if (!keys.length) return pickRandom(this.data.operators)?.id || null;

    // Уже знаем этого клиента?
    for (const key of keys) {
      const existing = this.assignments[key];
      if (existing && this.data.operators.some((o) => o.id === existing)) {
        // Закрепляем и за вторым ключом тоже (например, узнали телефон позже).
        keys.forEach((k) => { this.assignments[k] = existing; });
        this.saveAssignments();
        return existing;
      }
    }

    const operator = pickRandom(this.data.operators);
    if (!operator) return null;
    keys.forEach((k) => { this.assignments[k] = operator.id; });
    this.saveAssignments();
    return operator.id;
  }

  operatorName(operatorId) {
    const operator = this.data.operators.find((o) => o.id === operatorId);
    return operator ? operator.name : null;
  }

  // Все переводы имени оператора — чтобы сайт показал его на своём языке.
  operatorNames(operatorId) {
    const operator = this.data.operators.find((o) => o.id === operatorId);
    if (!operator) return null;
    return { ru: operator.name, ...(operator.nameI18n || {}) };
  }
}

export { clientKeys, MIN_PASSWORD };
