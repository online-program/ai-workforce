import React, { useState } from 'react';
import {
  Cpu,
  Search,
  CheckCircle2,
  ExternalLink,
  Code,
  Copy,
  Check,
  Palette,
  Sparkles,
  Layers,
} from 'lucide-react';

export interface AdminWidgetRecord {
  widget_id: string;
  user_id?: string;
  business_name: string;
  welcome_message: string;
  theme_color: string;
  is_active: boolean;
  position: string;
  design_style?: 'simple' | 'attractive_3d';
}

interface AdminWidgetsTabProps {
  widgets: AdminWidgetRecord[];
  onRefresh: () => void;
  loading: boolean;
}

export const AdminWidgetsTab: React.FC<AdminWidgetsTabProps> = ({
  widgets,
  onRefresh,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = widgets.filter((w) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      w.widget_id.toLowerCase().includes(s) ||
      w.business_name.toLowerCase().includes(s)
    );
  });

  const handleCopySnippet = (wId: string) => {
    const origin = window.location.origin;
    const snippet = `<script src="${origin}/widget.js" data-widget-id="${wId}" async></script>`;
    navigator.clipboard.writeText(snippet);
    setCopiedId(wId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Live Widget Deployments</h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            Active embeddable scripts, visual design styles, and tenant routing identifiers.
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
          placeholder="Search by widget ID or business name..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        />
      </div>

      {/* Widgets Table */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-neutral-950/75 border-b border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 font-semibold">
                <th className="py-3 px-4">Widget ID</th>
                <th className="py-3 px-4">Business Name & Greeting</th>
                <th className="py-3 px-4">Visual Theme</th>
                <th className="py-3 px-4">Design Style</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No widgets found.
                  </td>
                </tr>
              ) : (
                filtered.map((w) => (
                  <tr key={w.widget_id} className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {w.widget_id}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-slate-800 dark:text-neutral-200">{w.business_name}</div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">{w.welcome_message}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-4 h-4 rounded-full border border-slate-300 dark:border-neutral-700 shadow-xs"
                          style={{ backgroundColor: w.theme_color || '#0f172a' }}
                        />
                        <span className="font-mono text-[11px] text-slate-600 dark:text-neutral-400">{w.theme_color}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        w.design_style === 'simple'
                          ? 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300'
                          : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      }`}>
                        {w.design_style === 'simple' ? <Layers className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                        <span>{w.design_style === 'simple' ? 'Simple' : '3D / Attractive'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleCopySnippet(w.widget_id)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 transition-colors cursor-pointer"
                          title="Copy Embed Script"
                        >
                          {copiedId === w.widget_id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <a
                          href={`/embed/chat?widget_id=${encodeURIComponent(w.widget_id)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 transition-colors"
                          title="Open Standalone Widget"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
