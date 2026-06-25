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
        className="mx-4 mt-3 cursor-pointer"
        style={{
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 18,
          border: '1px solid rgba(212,168,67,0.22)',
          boxShadow: '0 2px 16px rgba(212,168,67,0.08)',
          padding: '12px 16px',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Subtle gold sparkle icon */}
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg, #F5EDD8 0%, #EDE0C4 100%)',
            border: '1px solid rgba(212,168,67,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}>✨</div>
          <div className="flex-1 min-w-0">
            <h3 style={{ fontSize: 12, fontWeight: 600, color: '#3D2B1F', letterSpacing: '0.04em', margin: 0 }}>
              {t('dashboard.aiAssistant')}
            </h3>
            <p style={{ fontSize: 11, color: '#9A8880', margin: '2px 0 0', letterSpacing: '0.02em' }}>
              {t('dashboard.aiSubtitle')}
            </p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #D4A843 0%, #E8C870 100%)',
            borderRadius: 50, paddingLeft: 12, paddingRight: 12, paddingTop: 6, paddingBottom: 6,
            boxShadow: '0 2px 8px rgba(212,168,67,0.25)',
          }}>
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
              {t('dashboard.askMeAnything')}
            </span>
          </div>
        </div>
      </motion.div>

      <ChatModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
