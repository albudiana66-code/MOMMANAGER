import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { sendMessageStream } from '../../lib/anthropic';
import type { ChatMessage } from '../../types';
import { ChatBubble } from './ChatBubble';

interface ChatModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChatModal({ open, onClose }: ChatModalProps) {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  async function handleSend() {
    const text = input.trim();
    if (!text || typing) return;
    setInput('');

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const aiId = (Date.now() + 1).toString();
    const aiMsg: ChatMessage = { id: aiId, role: 'assistant', content: '', timestamp: new Date() };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setTyping(true);

    try {
      let firstChunk = true;
      await sendMessageStream(messages, text, i18n.language, (chunk) => {
        if (firstChunk) { setTyping(false); firstChunk = false; }
        setMessages((prev) =>
          prev.map((m) => m.id === aiId ? { ...m, content: m.content + chunk } : m)
        );
      });
    } catch {
      setMessages((prev) =>
        prev.map((m) => m.id === aiId ? { ...m, content: t('ai.errorMessage') } : m)
      );
    } finally {
      setTyping(false);
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div style={{
          position: 'fixed',
          top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430,
          height: '100dvh',
          zIndex: 9999,
          display: 'flex', flexDirection: 'column',
          background: 'var(--modal-bg, #FAF6F2)',
        }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', paddingBottom: 16, borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--lavender) 100%)' }}>
              🤖
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-[var(--text-primary)] text-sm">{t('ai.title')}</h2>
            </div>
            <button
              onClick={() => { setMessages([]); }}
              className="text-xs text-[var(--text-secondary)] mr-2"
            >
              {t('ai.newChat')}
            </button>
            <button onClick={onClose} className="text-[var(--text-secondary)] text-lg">✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center opacity-60">
                <span className="text-4xl">🤖</span>
                <p className="text-sm text-[var(--text-secondary)]">{t('ai.placeholder')}</p>
              </div>
            )}
            {messages.map((m) => <ChatBubble key={m.id} message={m} />)}
            {typing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-3"
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs" style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--lavender) 100%)' }}>🤖</div>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)] block"
                    />
                  ))}
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
            <div className="flex gap-3 items-center">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={t('ai.placeholder')}
                className="flex-1 rounded-2xl px-4 py-3 text-sm placeholder:text-[var(--text-secondary)] focus:outline-none"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || typing}
                className="w-11 h-11 rounded-2xl flex items-center justify-center disabled:opacity-40 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  , document.body);
}
