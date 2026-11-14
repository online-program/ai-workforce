import React, { useState } from 'react';
import {
  MessageSquare,
  Search,
  Flame,
  User,
  Clock,
  ExternalLink,
  ChevronRight,
  Bot,
} from 'lucide-react';
import { AdminTranscriptModal } from './AdminTranscriptModal.tsx';

export interface AdminConversationRecord {
  id: string;
  userId: string;
  widgetId: string;
  visitorId: string;
  customerName: string;
  leadScore: string;
  messagesCount: number;
  lastMessageText: string;
  messages: Array<{ sender: 'user' | 'assistant' | 'system'; text: string; timestamp?: string }>;
  updatedAt: string;
  status: string;
}

interface AdminConversationsTabProps {
  conversations: AdminConversationRecord[];
  onRefresh: () => void;
  loading: boolean;
}

export const AdminConversationsTab: React.FC<AdminConversationsTabProps> = ({
  conversations,
  onRefresh,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConv, setSelectedConv] = useState<AdminConversationRecord | null>(null);

  const filtered = conversations.filter((c) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      c.customerName.toLowerCase().includes(s) ||
      c.widgetId.toLowerCase().includes(s) ||
      c.lastMessageText.toLowerCase().includes(s) ||
      c.visitorId.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Conversations & Transcripts</h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            Full-fidelity dialogue audit across all tenant widgets and sales interactions.
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by customer name, widget, visitor ID, or message keywords..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        />
      </div>

      {/* Conversations Table */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-neutral-950/75 border-b border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 font-semibold">
                <th className="py-3 px-4">Customer & Widget</th>
                <th className="py-3 px-4">Latest Message</th>
                <th className="py-3 px-4">Lead Score</th>
                <th className="py-3 px-4">Turns</th>
                <th className="py-3 px-4">Updated</th>
                <th className="py-3 px-4 text-right">Transcript</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No conversations recorded.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedConv(c)}
                    className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{c.customerName}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">[{c.widgetId}]</div>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <p className="text-slate-600 dark:text-neutral-300 truncate font-medium">
                        "{c.lastMessageText}"
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.leadScore === 'HOT'
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {c.leadScore === 'HOT' && <Flame className="w-3 h-3" />}
                        <span>{c.leadScore}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-neutral-300">
                      {c.messagesCount} msgs
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-neutral-400">
                      {new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedConv(c);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-slate-700 dark:text-neutral-300 transition-colors cursor-pointer"
                        title="View Full Transcript"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transcript Modal */}
      <AdminTranscriptModal
        isOpen={Boolean(selectedConv)}
        onClose={() => setSelectedConv(null)}
        conversation={selectedConv}
      />
    </div>
  );
};
