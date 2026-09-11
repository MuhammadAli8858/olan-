import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

export function BaseModal({ isOpen, onClose, title, children, wide = false }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[101] overflow-y-auto p-4 md:p-6">
            <div className="flex min-h-full items-start justify-center pt-8 md:pt-12">
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className={`relative w-full ${wide ? 'max-w-6xl' : 'max-w-2xl'} rounded-3xl border border-slate-200 dark:border-cyan-500/20 bg-white/95 p-6 text-slate-900 shadow-2xl shadow-cyan-500/10 dark:bg-slate-950/95 dark:text-white`}
              >
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-cyan-500/20 bg-slate-100 text-slate-700 transition hover:border-cyan-500/50 hover:text-cyan-600 dark:bg-slate-900 dark:text-slate-300"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
                {title ? <h3 className="mb-5 pr-12 text-2xl font-bold">{title}</h3> : null}
                {children}
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
