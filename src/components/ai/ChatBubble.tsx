import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '../../types';
import { format } from 'date-fns';

interface ChatBubbleProps {
  message: ChatMessage;
}

const chatMdComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  h1: ({ children }) => <p className="font-bold text-sm mt-1">{children}</p>,
  h2: ({ children }) => <p className="font-bold text-sm mt-1">{children}</p>,
  h3: ({ children }) => <p className="font-semibold text-sm mt-1">{children}</p>,
  p:  ({ children }) => <p className="my-0.5">{children}</p>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  ul: ({ children }) => <div className="flex flex-col gap-0.5 my-0.5">{children}</div>,
  ol: ({ children }) => <div className="flex flex-col gap-0.5 my-0.5">{children}</div>,
  li: ({ children }) => (
    <p className="flex gap-1.5">
      <span className="flex-shrink-0 mt-px">•</span><span>{children}</span>
    </p>
  ),
};

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs mr-2 mt-1 flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--lavender) 100%)' }}>
          🤖
        </div>
      )}
      <div className={`max-w-[75%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
          style={isUser ? {
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
            color: '#fff',
            borderBottomRightRadius: 4,
          } : {
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderBottomLeftRadius: 4,
          }}
        >
          {isUser ? message.content : (
            <ReactMarkdown components={chatMdComponents}>{message.content}</ReactMarkdown>
          )}
        </div>
        <span className="text-[10px] text-[var(--text-secondary)] mt-1 px-1">
          {format(message.timestamp, 'HH:mm')}
        </span>
      </div>
    </motion.div>
  );
}
