// ---------------------------------------------------------------------------
// Страница одной карточки.
//
// Одна и та же разметка обслуживает карточки из разных разделов: направления
// деятельности, компетенции команды, принципы работы, локальный контур
// и пункты блока «Один партнёр». Различается только источник данных.
//
// Что показывает: заголовок, короткий текст с карточки, развёрнутое
// объяснение и фотографию с подписью. Если подробностей у карточки нет,
// страница честно ограничивается тем, что есть.
// ---------------------------------------------------------------------------

import { motion } from 'motion/react';
import { Icons } from '../lib/icons.jsx';
import { ArrowLeft, ArrowRight, ImageOff } from 'lucide-react';
import { useState } from 'react';
import { useSite } from '../context/SiteContext.jsx';
import { localize, DIRECTIONS, TEAM, COMPANY } from '../data/siteData.js';
import { tr } from '../lib/i18n.js';

function CardIcon({ name, className }) {
  const Component = Icons[name] || Icons.Circle;
  return <Component className={className} />;
}

// Откуда брать карточку. Ключ приходит из адреса: #card-directions-enforcement
const SOURCES = {
  directions: {
    label: tr("Направление деятельности"),
    back: 'directions',
    list: () => DIRECTIONS || [],
  },
  capabilities: {
    label: tr("Профессиональная компетенция"),
    back: 'team',
    list: () => (TEAM && TEAM.capabilities) || [],
  },
  strengths: {
    label: tr("Как работает команда"),
    back: 'team',
    list: () => (TEAM && TEAM.strengths) || [],
  },
  proof: {
    label: tr("Локальный контур"),
    back: 'home',
    list: () => (COMPANY && COMPANY.proof && COMPANY.proof.items) || [],
  },
};

// Карточка ищется по id, а если его нет — по порядковому номеру.
function findCard(source, key) {
  const list = source.list();
  const byId = list.find((item) => item.id === key);
  if (byId) return byId;
  const index = Number(key);
  return Number.isInteger(index) ? list[index] : null;
}

function Illustration({ src, caption }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-3xl border border-slate-200 bg-slate-100 text-slate-400 dark:border-cyan-500/15 dark:bg-slate-900">
        <ImageOff className="h-10 w-10" />
      </div>
    );
  }
  return (
    <figure>
      <img
        src={src}
        alt={caption || ''}
        onError={() => setBroken(true)}
        className="aspect-[4/3] w-full rounded-3xl border border-slate-200 object-cover dark:border-cyan-500/15"
      />
      {caption && (
        <figcaption className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{caption}</figcaption>
      )}
    </figure>
  );
}

export function CardPage({ collection, cardKey, onBack, onContact, onSection }) {
  const { language } = useSite();
  const source = SOURCES[collection];
  const card = source ? findCard(source, cardKey) : null;

  if (!card) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-32 text-center">
        <p className="text-lg text-slate-700 dark:text-slate-400">{tr("Раздел не найден.")}</p>
        <button type="button" onClick={onBack}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan-600/40 px-5 py-2.5 text-sm text-cyan-700 transition hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-500/10">
          <ArrowLeft className="h-4 w-4" /> {tr("На главную")}
        </button>
      </div>
    );
  }

  const details = card.details || [];
  const short = localize(card.text, language);
  const caption = localize(card.imageCaption, language);
  const siblings = source.list().filter((item) => item !== card);

  return (
    <div className="bg-white pt-24 transition-colors dark:bg-black">
      <div className="container mx-auto px-4 pb-20">
        <button type="button" onClick={onBack}
          className="mb-8 inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-300">
          <ArrowLeft className="h-4 w-4" /> {tr("Назад")}
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
              <CardIcon name={card.icon} className="h-7 w-7 text-white" />
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-400">
                {source.label}
              </div>
              <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white md:text-4xl">
                {localize(card.title, language)}
              </h1>
            </div>
          </div>

          {short && (
            <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-800 dark:text-slate-300">{short}</p>
          )}
        </motion.div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-5">
            {details.length > 0 ? (
              details.map((paragraph, index) => (
                <p key={index} className="leading-8 text-slate-800 dark:text-slate-300">
                  {localize(paragraph, language)}
                </p>
              ))
            ) : (
              <p className="leading-8 text-slate-700 dark:text-slate-400">
                {tr("Подробное описание этого раздела ещё готовится. Напишите нам — расскажем в деталях применительно к вашему объекту.")}
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button type="button" onClick={onContact}
                className="olan-sweep inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-3 font-semibold text-white transition hover:scale-[1.02]">
                {tr("Обсудить проект")} <ArrowRight className="h-4 w-4" />
              </button>
              {onSection && (
                <button type="button" onClick={() => onSection(source.back)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:border-cyan-600/50 hover:text-cyan-700 dark:border-cyan-500/20 dark:text-slate-300">
                  {tr("Ко всем разделам")}
                </button>
              )}
            </div>
          </div>

          <Illustration src={card.image} caption={caption} />
        </div>

        {siblings.length > 0 && (
          <div className="mt-14">
            <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">{tr("Смотрите также")}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {siblings.map((item, index) => (
                <button key={item.id || index} type="button"
                  onClick={() => { if (typeof window !== 'undefined') window.location.hash = `card-${collection}-${item.id || source.list().indexOf(item)}`; }}
                  className="rounded-full border border-slate-300 px-3.5 py-1.5 text-xs text-slate-700 transition hover:border-cyan-600/50 hover:text-cyan-700 dark:border-cyan-500/20 dark:text-slate-300 dark:hover:text-cyan-300">
                  {localize(item.title, language)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { SOURCES };
