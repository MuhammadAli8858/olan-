import { motion } from 'motion/react';
import { ShieldCheck, Award, Factory, BadgeCheck, ArrowLeft, ArrowRight, MapPin, Phone, Mail } from 'lucide-react';
import { ABOUT_FEATURES, CONTACT_INFO, localize } from '../data/siteData.js';
import { useSite } from '../context/SiteContext.jsx';
import { AnimatedNumber } from './AnimatedNumber.jsx';
import { tr } from '../lib/i18n.js';

const iconMap = { ShieldCheck, Award, Factory, BadgeCheck };

// Функция, а не константа: переводы должны пересчитываться при смене
// языка, а константа вычислилась бы один раз при загрузке модуля.
const companyParagraphs = () => [
  tr("OLAN HIGH TECH PROJECT — производитель и поставщик интеллектуальных комплексов автоматической фиксации нарушений правил дорожного движения. Мы выпускаем сертифицированное оборудование для контроля скорости, проезда на красный свет, нарушений правил парковки, проезда железнодорожных переездов и выезда на полосу общественного транспорта."),
  tr("За более чем 15 лет работы наши комплексы были поставлены на городские дороги, магистрали и объекты транспортной инфраструктуры. Мы делаем ставку на надёжность, точность измерений и долгий срок службы оборудования в любых климатических условиях — от −50 °C до +70 °C."),
  tr("Оборудование выпускается на собственном производстве, поэтому вы покупаете напрямую, без посредников и лишних наценок. Каждый комплекс проходит контроль качества и поставляется с гарантией, полным комплектом документов и сертификатами соответствия."),
];

export function AboutPage({ onBack, onSection }) {
  const { language, text } = useSite();

  return (
    <main className="bg-slate-50 pt-24 transition-colors dark:bg-black">
      {/* Заголовок страницы */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-100 via-white to-slate-50 py-20 transition-colors dark:from-black dark:via-slate-950 dark:to-black">
        <div className="absolute inset-0 opacity-60 dark:opacity-100">
          <div className="absolute left-1/4 top-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        </div>
        <div className="container relative z-10 mx-auto px-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-cyan-500/20 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-500/40 hover:text-cyan-600 dark:bg-slate-950 dark:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            {tr("На главную")}
          </button>

          <div className="mx-auto mt-10 max-w-3xl text-center">
            <span className="inline-flex rounded-full border border-slate-200 dark:border-cyan-500/20 bg-white px-4 py-2 text-sm font-medium text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
              {text.about.tag}
            </span>
            <h1 className="mt-6 text-4xl font-bold text-slate-900 dark:text-white md:text-5xl">{text.about.title}</h1>
            <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">{text.about.description}</p>
          </div>
        </div>
      </section>

      {/* О компании — текст */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl space-y-6">
            {companyParagraphs().map((paragraph) => (
              <motion.p
                key={paragraph.slice(0, 24)}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-base leading-8 text-slate-600 dark:text-slate-300 md:text-lg"
              >
                {paragraph}
              </motion.p>
            ))}
          </div>

          {/* Сильные стороны */}
          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
            {ABOUT_FEATURES.map((feature, index) => {
              const Icon = iconMap[feature.icon] || ShieldCheck;
              return (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  viewport={{ once: true }}
                  className="olan-card rounded-3xl border border-slate-200 dark:border-cyan-500/15 bg-white p-8 shadow-lg shadow-slate-900/5 dark:bg-slate-950/65"
                >
                  <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{localize(feature.title, language)}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{localize(feature.short, language)}</p>
                  <div className="mt-5 space-y-3">
                    {localize(feature.details, language).map((detail) => (
                      <div key={detail} className="rounded-2xl border border-slate-200 dark:border-cyan-500/15 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {detail}
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Цифры */}
          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4">
            {text.about.stats.map((stat) => (
              <div key={stat.label} className="olan-card rounded-3xl border border-slate-200 dark:border-cyan-500/15 bg-white p-6 text-center shadow-lg shadow-slate-900/5 dark:bg-slate-950/60">
                <AnimatedNumber value={stat.value} className="block bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-4xl font-bold text-transparent" />
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Контакты компании */}
          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
            <a href={CONTACT_INFO.phoneHref} className="olan-card flex items-start gap-4 rounded-3xl border border-slate-200 dark:border-cyan-500/15 bg-white p-6 shadow-lg shadow-slate-900/5 transition hover:border-cyan-500/40 dark:bg-slate-950/65">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white"><Phone className="h-6 w-6" /></div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{text.contact.phone}</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-white">{CONTACT_INFO.phone}</div>
              </div>
            </a>
            <a href={CONTACT_INFO.emailHref} className="olan-card flex items-start gap-4 rounded-3xl border border-slate-200 dark:border-cyan-500/15 bg-white p-6 shadow-lg shadow-slate-900/5 transition hover:border-cyan-500/40 dark:bg-slate-950/65">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white"><Mail className="h-6 w-6" /></div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{text.contact.email}</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-white">{CONTACT_INFO.email}</div>
              </div>
            </a>
            <div className="olan-card flex items-start gap-4 rounded-3xl border border-slate-200 dark:border-cyan-500/15 bg-white p-6 shadow-lg shadow-slate-900/5 dark:bg-slate-950/65">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white"><MapPin className="h-6 w-6" /></div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{text.contact.addressLabel}</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-white">{localize(CONTACT_INFO.address, language)}</div>
              </div>
            </div>
          </div>

          {/* Призыв к действию */}
          <div className="mx-auto mt-16 max-w-4xl rounded-3xl border border-slate-200 dark:border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-10 text-center">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">{tr("Готовы подобрать комплекс?")}</h3>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-300">{tr("Откройте каталог комплексов по типам нарушений или свяжитесь с нами — поможем с выбором и подготовим предложение.")}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => onSection('catalog')}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:scale-105"
              >
                {text.actions.openCatalog}
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => onSection('contact')}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-cyan-500/20 bg-white px-8 py-4 text-lg font-semibold text-slate-700 transition hover:border-cyan-500/50 hover:text-cyan-600 dark:bg-white/5 dark:text-white"
              >
                {text.actions.contact}
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
