import { type ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  fullScreen?: boolean;
}

export function Modal({ open, onClose, title, children, fullScreen }: ModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-end justify-center"
          style={{ maxWidth: 430, margin: '0 auto', zIndex: 10000 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative w-full bg-[var(--bg-card)] rounded-t-3xl z-10 ${fullScreen ? 'h-[90vh]' : 'max-h-[85vh]'} overflow-y-auto`}
            style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 16px), 32px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{ background: 'var(--border-strong)' }} />
            {title && (
              <div className="flex items-center justify-between px-5 pb-4">
                <h2 className="text-lg text-[var(--text-primary)]" style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</h2>
                <button
                  onClick={onClose}
                  className="text-[var(--text-secondary)] p-2 -mr-1"
                  aria-label={t('common.close')}
                  style={{ fontSize: 18, lineHeight: 1, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ✕
                </button>
              </div>
            )}
            <div className="px-5" style={{ paddingBottom: 8 }}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
