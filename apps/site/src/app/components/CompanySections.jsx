// ---------------------------------------------------------------------------
// Три блока из презентации, которые важны для B2G- и партнёрских переговоров:
//
//   • «Модели сотрудничества» — в какой роли компания входит в проект;
//   • «Как мы работаем» — десять этапов от обследования до интеграции;
//   • «Команда» — компетенции, которыми закрывается весь маршрут.
// ---------------------------------------------------------------------------

import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';
import { localize, ENGAGEMENT_MODELS, WORKFLOW, TEAM, COMPANY } from '../data/siteData.js';

function Icon({ name, className }) {
  const Component = Icons[name] || Icons.Circle;
  return <Component className={className} />;
}

// ───────────────────────── Модели сотрудничества ─────────────────────────

export function Engagement({ bare }) {
  const { language } = useSite();
  const rows = ENGAGEMENT_MODELS || [];

  return (
    <section id="engagement" className="relative overflow-hidden bg-slate-100 py-24 transition-colors dark:bg-slate-950">
      <div className="container mx-auto px-4">
        {!bare && (
          <div className="mb-12 text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-400">
              Модели сотрудничества
            </div>
            <h2 className="mt-4 font-black text-slate-900 dark:text-white">
              Роль OLAN в проектах партнёров
            </h2>
          </div>
        )}

        {/* Широкий экран — таблица, узкий — карточки */}
        <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white lg:block dark:border-cyan-500/15 dark:bg-black">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900 text-white dark:bg-slate-900">
                <th className="px-6 py-4 text-sm font-semibold">Тип проекта</th>
                <th className="px-6 py-4 text-sm font-semibold">Роль OLAN</th>
                <th className="px-6 py-4 text-sm font-semibold">Что получает партнёр</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}
                  className={`border-t border-slate-200 dark:border-slate-800 ${index % 2 ? 'bg-slate-50 dark:bg-slate-950/50' : ''}`}>
                  <td className="px-6 py-5 align-top text-sm font-semibold leading-6 text-slate-900 dark:text-white">
                    {localize(row.type, language)}
                  </td>
                  <td className="px-6 py-5 align-top text-sm leading-6 text-cyan-800 dark:text-cyan-300">
                    {localize(row.role, language)}
                  </td>
                  <td className="px-6 py-5 align-top text-sm leading-6 text-slate-700 dark:text-slate-400">
                    {localize(row.result, language)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 lg:hidden">
          {rows.map((row) => (
            <div key={row.id}
              className="olan-card rounded-3xl border border-slate-200 bg-white p-5 dark:border-cyan-500/15 dark:bg-black">
              <div className="font-semibold leading-6 text-slate-900 dark:text-white">{localize(row.type, language)}</div>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Роль OLAN</div>
              <div className="mt-1 text-sm leading-6 text-cyan-800 dark:text-cyan-300">{localize(row.role, language)}</div>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Что получает партнёр</div>
              <div className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-400">{localize(row.result, language)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────── Как мы работаем ─────────────────────────────

export function Workflow() {
  const { language } = useSite();
  const workflow = WORKFLOW || {};
  const steps = workflow.steps || [];
  const operation = workflow.operation || {};

  return (
    <section id="workflow" className="relative overflow-hidden bg-white py-24 transition-colors dark:bg-black">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-400">
            Как мы работаем
          </div>
          <h2 className="mt-4 text-4xl font-black text-slate-900 dark:text-white md:text-5xl">
            Инфраструктурные проекты полного цикла
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, index) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
              className="olan-card rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-cyan-500/15 dark:bg-slate-950/70"
            >
              <div className="font-mono text-2xl font-black text-cyan-700 dark:text-cyan-400">{step.n}</div>
              <div className="mt-2 text-sm font-semibold leading-6 text-slate-900 dark:text-white">
                {localize(step.title, language)}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 rounded-3xl bg-slate-900 p-6 text-center leading-7 text-slate-100">
          {localize(workflow.note, language)}
        </div>

        {/* Эксплуатация и SLA */}
        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {localize(operation.title, language)}
            </h3>
            <ul className="mt-6 space-y-3">
              {(operation.items || []).map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700 dark:text-cyan-400" />
                  <span className="leading-7 text-slate-800 dark:text-slate-300">{localize(item, language)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl bg-slate-900 p-8 dark:bg-slate-950">
            <div className="text-5xl font-black text-cyan-400">SLA</div>
            <p className="mt-4 leading-7 text-slate-200">{localize(operation.slaText, language)}</p>
            <ul className="mt-6 space-y-2.5">
              {(operation.slaPoints || []).map((point, index) => (
                <li key={index} className="flex items-start gap-2.5 text-sm leading-6 text-slate-300">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  {localize(point, language)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────── Команда ──────────────────────────────────

export function Team({ onOpenCard }) {
  const { language } = useSite();
  const team = TEAM || {};

  return (
    <section id="team" className="relative overflow-hidden bg-slate-100 py-24 transition-colors dark:bg-slate-950">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-400">
            Команда
          </div>
          <h2 className="mt-4 text-4xl font-black text-slate-900 dark:text-white md:text-5xl">
            Компетенции команды
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(team.roles || []).map((role, index) => (
            <div key={index}
              className="olan-card flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-cyan-500/15 dark:bg-black">
              <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-600 dark:bg-cyan-400" />
              <span className="text-sm font-medium leading-6 text-slate-900 dark:text-white">
                {localize(role, language)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-3xl bg-slate-900 p-6 text-center leading-7 text-slate-100">
          {localize(team.note, language)}
        </div>

        <h3 className="mt-16 text-2xl font-bold text-slate-900 dark:text-white">Профессиональные компетенции</h3>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(team.capabilities || []).map((item, index) => (
            <button key={index} type="button"
              onClick={() => onOpenCard && onOpenCard('capabilities', index)}
              className="olan-card rounded-3xl border border-slate-200 bg-white p-6 text-left dark:border-cyan-500/15 dark:bg-black">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                <Icon name={item.icon} className="h-6 w-6 text-white" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{localize(item.title, language)}</div>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-400">{localize(item.text, language)}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 dark:text-cyan-400">
                Подробнее <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>

        <h3 className="mt-16 text-2xl font-bold text-slate-900 dark:text-white">Как работает команда</h3>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(team.strengths || []).map((item, index) => (
            <button key={index} type="button"
              onClick={() => onOpenCard && onOpenCard('strengths', index)}
              className="olan-card rounded-3xl border border-slate-200 bg-white p-6 text-left dark:border-cyan-500/15 dark:bg-black">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                <Icon name={item.icon} className="h-6 w-6 text-white" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{localize(item.title, language)}</div>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-400">{localize(item.text, language)}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 dark:text-cyan-400">
                Подробнее <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────── Один партнёр и локальный контур ────────────────────────

export function PartnerValue({ onOpenCard }) {
  const { language } = useSite();
  const company = COMPANY || {};
  const partner = company.partner || {};
  const proof = company.proof || {};

  return (
    <section id="partner" className="relative overflow-hidden bg-slate-900 py-24 text-white">
      <div className="olan-grid absolute inset-0 opacity-40" />
      <div className="container relative z-10 mx-auto px-4">
        {/* Локальный контур в Узбекистане */}
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">
              Практическое подтверждение
            </div>
            <h2 className="mt-4 text-3xl font-black md:text-4xl">{localize(proof.title, language)}</h2>
            <p className="mt-5 leading-8 text-slate-300">{localize(proof.text, language)}</p>
            <div className="mt-6 rounded-3xl border border-cyan-400/30 bg-cyan-400/10 p-5 font-semibold leading-7 text-cyan-100">
              {localize(proof.highlight, language)}
            </div>
          </div>

          <div className="space-y-4">
            {(proof.items || []).map((item, index) => (
              <button key={index} type="button"
                onClick={() => onOpenCard && onOpenCard(index)}
                className="olan-card flex w-full items-start gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 text-left">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                  <Icon name={item.icon} className="h-6 w-6 text-cyan-300" />
                </div>
                <div>
                  <div className="font-bold">{localize(item.title, language)}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-300">{localize(item.text, language)}</div>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                    Подробнее <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Один партнёр — полный результат */}
        <div className="mt-20 grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">
              Что это значит для партнёра
            </div>
            <h2 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
              {localize(partner.title, language)}
            </h2>
            <p className="mt-6 leading-8 text-slate-300">{localize(partner.text, language)}</p>
          </div>

          <div className="space-y-3">
            {(partner.points || []).map((point, index) => (
              <div key={index} className="olan-card flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 font-bold text-white">
                  {index + 1}
                </span>
                <span className="font-medium leading-6">{localize(point, language)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
