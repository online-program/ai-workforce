import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, Bot, User, Clock, CheckCircle2 } from 'lucide-react';

interface MessageItem {
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp?: string;
}

interface AdminTranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: {
    id: string;
    customerName?: string;
    widgetId?: string;
    visitorId?: string;
    leadScore?: string;
    updatedAt?: string;
    messages?: MessageItem[];
  } | null;
}

export const AdminTranscriptModal: React.FC<AdminTranscriptModalProps> = ({
  isOpen,
  onClose,
  conversation,
}) => {
  if (!isOpen || !conversation) return null;

  const messages = conversation.messages || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="w-full max-w-2xl max-h-[85vh] bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-slate-50/70 dark:bg-neutral-950/70">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {conversation.customerName || 'Website Visitor Chat'}
                </h3>
                <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-neutral-400">
                  <span>Widget: <strong className="text-slate-700 dark:text-neutral-200">{conversation.widgetId}</strong></span>
                  <span>•</span>
                  <span>Visitor: <strong className="text-slate-700 dark:text-neutral-200">{conversation.visitorId}</strong></span>
                  {conversation.leadScore && (
                    <>
                      <span>•</span>
                      <span className={`px-1.5 py-0.2 rounded font-semibold text-[10px] ${
                        conversation.leadScore === 'HOT'
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {conversation.leadScore}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Transcript Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-neutral-950/30">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">No transcript messages recorded.</div>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex items-start space-x-2.5 ${
                    m.sender === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                      m.sender === 'user'
                        ? 'bg-slate-200 dark:bg-neutral-700 text-slate-800 dark:text-neutral-200'
                        : 'bg-black text-white dark:bg-white dark:text-black font-bold'
                    }`}
                  >
                    {m.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-black text-white dark:bg-white dark:text-black font-medium'
                        : 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 border border-slate-200 dark:border-neutral-700 shadow-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    {m.timestamp && (
                      <div className={`mt-1 text-[9px] opacity-70 ${m.sender === 'user' ? 'text-right' : 'text-left'}`}>
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between text-xs text-slate-500">
            <span>Conversation ID: <span className="font-mono text-slate-700 dark:text-neutral-300">{conversation.id}</span></span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-white rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
