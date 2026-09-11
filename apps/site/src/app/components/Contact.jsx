import { motion } from 'motion/react';
import { Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { useState } from 'react';
import { CONTACT_INFO, localize } from '../data/siteData.js';
import { useSite } from '../context/SiteContext.jsx';
import { postJson } from '../lib/api.js';

export function Contact() {
  const { language, text } = useSite();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSending, setIsSending] = useState(false);

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSending(true);
    setStatus({ type: '', message: '' });

    try {
      const { name, email, phone, message } = formData;
      // Заявка с формы уходит на операторский сайт как чат — оператор видит её
      // в списке чатов вместе с обращениями из онлайн-чата.
      const started = await postJson('/api/chat/start', { name, email, phone });
      await postJson('/api/chat/send', {
        sessionId: started.sessionId,
        text: `Заявка с формы «Контакты»:\n${message}`,
      });
      setStatus({ type: 'success', message: text.contact.sendSuccess });
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      setStatus({ type: 'warning', message: `${text.contact.sendFallback} (${error.message})` });
    } finally {
      setIsSending(false);
    }
  };

  const contactCards = [
    { icon: Phone, label: text.contact.phone, value: CONTACT_INFO.phone, href: CONTACT_INFO.phoneHref },
    { icon: Mail, label: text.contact.email, value: CONTACT_INFO.email, href: CONTACT_INFO.emailHref },
    { icon: MessageCircle, label: text.contact.hoursLabel, value: localize(CONTACT_INFO.hours, language), href: '' },
    { icon: MapPin, label: text.contact.addressLabel, value: localize(CONTACT_INFO.address, language), href: 'https://maps.google.com/?q=Tashkent%20Almazar%20Ustashirin%20105' },
  ];

  return (
    <section id="contact" className="relative overflow-hidden bg-gradient-to-b from-slate-100 via-white to-slate-50 py-24 transition-colors dark:from-black dark:via-slate-950 dark:to-black">
      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-16 max-w-3xl text-center"
        >
          <span className="inline-flex rounded-full border border-slate-200 dark:border-cyan-500/20 bg-white px-4 py-2 text-sm font-medium text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
            {text.contact.tag}
          </span>
          <h2 className="mt-6 text-4xl font-bold text-slate-900 dark:text-white md:text-5xl">{text.contact.title}</h2>
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">{text.contact.description}</p>
        </motion.div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="olan-card rounded-3xl border border-slate-200 dark:border-cyan-500/15 bg-white p-8 shadow-lg shadow-slate-900/5 dark:bg-slate-950/65"
          >
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{text.contact.formTitle}</h3>
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-400">{text.contact.name}</label>
                <input id="name" value={formData.name} onChange={handleChange('name')} required placeholder={text.contact.namePlaceholder} className="w-full rounded-2xl border border-slate-200 dark:border-cyan-500/15 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-cyan-500 dark:bg-slate-900 dark:text-white" />
              </div>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-400">{text.contact.email}</label>
                <input id="email" type="email" value={formData.email} onChange={handleChange('email')} required placeholder={text.contact.emailPlaceholder} className="w-full rounded-2xl border border-slate-200 dark:border-cyan-500/15 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-cyan-500 dark:bg-slate-900 dark:text-white" />
              </div>
              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-400">{text.contact.phone}</label>
                <input id="phone" value={formData.phone} onChange={handleChange('phone')} required placeholder={text.contact.phonePlaceholder} className="w-full rounded-2xl border border-slate-200 dark:border-cyan-500/15 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-cyan-500 dark:bg-slate-900 dark:text-white" />
              </div>
              <div>
                <label htmlFor="message" className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-400">{text.contact.message}</label>
                <textarea id="message" rows={5} value={formData.message} onChange={handleChange('message')} required placeholder={text.contact.messagePlaceholder} className="w-full resize-none rounded-2xl border border-slate-200 dark:border-cyan-500/15 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-cyan-500 dark:bg-slate-900 dark:text-white" />
              </div>
              {status.message ? (
                <div className={`rounded-2xl px-4 py-3 text-sm ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'}`}>
                  {status.message}
                </div>
              ) : null}
              <button disabled={isSending} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-xl shadow-cyan-500/20 disabled:opacity-70">
                {text.actions.send}
                <Send className="h-5 w-5" />
              </button>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            {contactCards.map((card) => (
              <div key={card.label} className="olan-card rounded-3xl border border-slate-200 dark:border-cyan-500/15 bg-white p-6 shadow-lg shadow-slate-900/5 dark:bg-slate-950/65">
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                    <card.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">{card.label}</div>
                    {card.href ? (
                      <a href={card.href} target={card.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="mt-1 block text-lg font-semibold text-slate-900 transition hover:text-cyan-600 dark:text-white dark:hover:text-cyan-400">
                        {card.value}
                      </a>
                    ) : (
                      <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{card.value}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="olan-card overflow-hidden rounded-3xl border border-slate-200 dark:border-cyan-500/15 bg-white shadow-lg shadow-slate-900/5 dark:bg-slate-950/65">
              <iframe title="OLAN HIGH TECH map" src={CONTACT_INFO.mapEmbed} className="h-80 w-full" loading="lazy" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
