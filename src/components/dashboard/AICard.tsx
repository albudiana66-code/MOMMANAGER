import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChatModal } from '../ai/ChatModal';

export function AICard() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.div
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        className="mx-4 mt-3 rounded-2xl p-4 cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #E91E8C 0%, #c2185b 50%, #7b1fa2 100%)',
          boxShadow: '0 8px 32px rgba(233,30,140,0.3)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">🤖</span>
          <div className="flex-1">
            <h3 className="font-bold text-white text-sm">{t('dashboard.aiAssistant')}</h3>
            <p className="text-white/70 text-xs mt-0.5">{t('dashboard.aiSubtitle')}</p>
          </div>
          <div className="bg-white/20 rounded-xl px-3 py-1.5">
            <span className="text-white text-xs font-medium">{t('dashboard.askMeAnything')}</span>
          </div>
        </div>
      </motion.div>

      <ChatModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
