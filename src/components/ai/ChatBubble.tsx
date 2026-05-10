import { motion } from 'framer-motion';
import type { ChatMessage } from '../../types';
import { format } from 'date-fns';

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E91E8C] to-purple-600 flex items-center justify-center text-xs mr-2 mt-1 flex-shrink-0">
          🤖
        </div>
      )}
      <div className={`max-w-[75%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-[#E91E8C] text-white rounded-br-sm'
              : 'bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-bl-sm border border-white/10'
          }`}
        >
          {message.content}
        </div>
        <span className="text-[10px] text-[var(--text-secondary)] mt-1 px-1">
          {format(message.timestamp, 'HH:mm')}
        </span>
      </div>
    </motion.div>
  );
}
