import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db, auth } from '../../firebase.ts';
import {
  Globe,
  Radio,
  Laptop,
  Smartphone,
  Tablet,
  Search,
  Lock,
  Clock,
  ExternalLink,
  Shield,
  Activity,
  CheckCircle2,
  RefreshCw,
  Eye,
  Sparkles
} from 'lucide-react';

export interface LiveVisitorRecord {
  id: string;
  visitorId: string;
  sessionId?: string;
  widgetId?: string;
  companyName?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  device?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser?: string;
  os?: string;
  landingPage?: string;
  referrer?: string;
  widgetOpened?: boolean;
  messagesCount?: number;
  inquirySubmitted?: boolean;
  leadScore?: 'HOT' | 'WARM' | 'COLD' | null;
  durationSeconds?: number;
}

interface LiveVisitorsMonitorProps {
  userRole?: string;
  initialVisitors?: LiveVisitorRecord[];
  onRefreshApi?: () => void;
}

enum OperationType {
  LIST = 'list',
  GET = 'get',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path,
  };
  console.error('Firestore Error in LiveVisitorsMonitor: ', JSON.stringify(errInfo));
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    if (diffSec < 15) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    return `${diffHrs}h ago`;
  } catch {
    return 'Recently';
  }
}

export const LiveVisitorsMonitor: React.FC<LiveVisitorsMonitorProps> = ({
  userRole = 'CEO',
  initialVisitors = [],
  onRefreshApi,
}) => {
  const isCeo = userRole.toUpperCase() === 'CEO';

  const [visitors, setVisitors] = useState<LiveVisitorRecord[]>(initialVisitors);
  const [listenerConnected, setListenerConnected] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'ALL' | 'INQUIRY' | 'MOBILE' | 'DESKTOP'>('ALL');
  const [lastHeartbeat, setLastHeartbeat] = useState<string>(new Date().toLocaleTimeString());

  // 1. Strict CEO Access Boundary Check
  if (!isCeo) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-900/60 text-red-400 mx-auto flex items-center justify-center">
          <Lock className="w-7 h-7" />
        </div>
        <div className="max-w-md mx-auto">
          <h3 className="text-base font-bold text-white tracking-tight">CEO-Only Live Visitor Telemetry</h3>
          <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
            Real-time website visitor surveillance is strictly restricted to the Chief Executive Officer.
            Super Admin and Admin roles do not have permission to view live telemetry streams.
          </p>
        </div>
      </div>
    );
  }

  // 2. Real-time Firestore Listener
  useEffect(() => {
    let isMounted = true;
    const collectionPath = 'system_visitor_sessions';

    try {
      const q = query(collection(db, collectionPath), limit(150));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!isMounted) return;
          const liveList: LiveVisitorRecord[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            liveList.push({
              id: docSnap.id,
              visitorId: data.visitorId || docSnap.id,
              sessionId: data.sessionId,
              widgetId: data.widgetId,
              companyName: data.companyName || 'Unassigned Tenant',
              firstSeenAt: data.firstSeenAt || new Date().toISOString(),
              lastSeenAt: data.lastSeenAt || new Date().toISOString(),
              device: data.device || 'desktop',
              browser: data.browser || 'Unknown',
              os: data.os || 'Unknown',
              landingPage: data.landingPage || '/',
              referrer: data.referrer || 'Direct',
              widgetOpened: Boolean(data.widgetOpened),
              messagesCount: Number(data.messagesCount || 0),
              inquirySubmitted: Boolean(data.inquirySubmitted),
              leadScore: data.leadScore,
              durationSeconds: Number(data.durationSeconds || 0),
            });
          });

          // Sort by latest activity first
          liveList.sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());

          if (liveList.length > 0) {
            setVisitors(liveList);
          } else if (initialVisitors.length > 0) {
            // Keep initial if firestore collection is still populating
            setVisitors(initialVisitors);
          }
          setListenerConnected(true);
          setLastHeartbeat(new Date().toLocaleTimeString());
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, collectionPath);
          setListenerConnected(false);
          // Fallback to initial API visitors
          if (initialVisitors.length > 0) {
            setVisitors(initialVisitors);
          }
        }
      );

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, collectionPath);
      setListenerConnected(false);
      return () => {};
    }
  }, [initialVisitors]);

  // Keep synced if initialVisitors updates and firestore hasn't connected
  useEffect(() => {
    if (!listenerConnected && initialVisitors.length > 0) {
      setVisitors(initialVisitors);
    }
  }, [initialVisitors, listenerConnected]);

  // 3. Filter visitors
  const filteredVisitors = visitors.filter((v) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      v.visitorId.toLowerCase().includes(q) ||
      (v.companyName && v.companyName.toLowerCase().includes(q)) ||
      (v.landingPage && v.landingPage.toLowerCase().includes(q)) ||
      (v.browser && v.browser.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (filterType === 'INQUIRY') return v.inquirySubmitted;
    if (filterType === 'MOBILE') return v.device === 'mobile';
    if (filterType === 'DESKTOP') return v.device === 'desktop';
    return true;
  });

  const activeInLast10Min = visitors.filter(
    (v) => Date.now() - new Date(v.lastSeenAt).getTime() < 10 * 60 * 1000
  ).length;

  const totalInquiries = visitors.filter((v) => v.inquirySubmitted).length;
  const mobileCount = visitors.filter((v) => v.device === 'mobile').length;
  const desktopCount = visitors.filter((v) => v.device === 'desktop').length;

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-neutral-900 border border-neutral-800 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <h2 className="text-base font-bold text-white tracking-tight">Live Visitors Monitor</h2>
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                listenerConnected
                  ? 'bg-emerald-950/80 border-emerald-800/80 text-emerald-400'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  listenerConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                }`}
              />
              <span>{listenerConnected ? 'FIRESTORE REAL-TIME' : 'SNAPSHOT STANDBY'}</span>
            </div>
          </div>
          <p className="text-xs text-neutral-400">
            Real-time listener tracking active sessions, current pages, and timestamps with Zero-Trust privacy.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Last Stream Sync</div>
            <div className="text-xs font-mono text-neutral-300 font-bold">{lastHeartbeat}</div>
          </div>
          {onRefreshApi && (
            <button
              onClick={onRefreshApi}
              title="Refresh telemetry"
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-neutral-900/90 border border-neutral-800 rounded-2xl">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider">Active (10m)</span>
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{activeInLast10Min}</div>
          <div className="text-[10px] text-neutral-500 mt-1">Real-time visitors online</div>
        </div>

        <div className="p-4 bg-neutral-900/90 border border-neutral-800 rounded-2xl">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider">Inquiries</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{totalInquiries}</div>
          <div className="text-[10px] text-neutral-500 mt-1">Converted to sales inquiries</div>
        </div>

        <div className="p-4 bg-neutral-900/90 border border-neutral-800 rounded-2xl">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider">Desktop</span>
            <Laptop className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{desktopCount}</div>
          <div className="text-[10px] text-neutral-500 mt-1">Desktop workstations</div>
        </div>

        <div className="p-4 bg-neutral-900/90 border border-neutral-800 rounded-2xl">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider">Mobile</span>
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{mobileCount}</div>
          <div className="text-[10px] text-neutral-500 mt-1">Mobile & handheld visitors</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
          {(['ALL', 'INQUIRY', 'DESKTOP', 'MOBILE'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterType(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === mode
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {mode === 'ALL' && 'All Visitors'}
              {mode === 'INQUIRY' && 'Inquiries Only'}
              {mode === 'DESKTOP' && 'Desktop'}
              {mode === 'MOBILE' && 'Mobile'}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search visitor ID, page, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-72 pl-9 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Real-time Visitors Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950 text-neutral-400 font-mono uppercase text-[10px] border-b border-neutral-800">
              <tr>
                <th className="p-4">Visitor / Session ID</th>
                <th className="p-4">Current Page</th>
                <th className="p-4">Company / Tenant</th>
                <th className="p-4">Device & Browser</th>
                <th className="p-4">Arrival Timestamp</th>
                <th className="p-4">Last Active</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {filteredVisitors.map((v) => {
                const isOnlineNow = Date.now() - new Date(v.lastSeenAt).getTime() < 3 * 60 * 1000;
                return (
                  <tr key={v.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-white">
                      <div className="flex items-center space-x-2">
                        <div className="relative">
                          <Globe className="w-4 h-4 text-neutral-400" />
                          {isOnlineNow && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5 ring-2 ring-neutral-900 animate-pulse" />
                          )}
                        </div>
                        <span className="truncate max-w-[140px]" title={v.visitorId}>
                          {v.visitorId}
                        </span>
                      </div>
                    </td>

                    <td className="p-4 font-mono text-neutral-300">
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-[11px] text-amber-300/90 font-mono truncate max-w-[180px]">
                          {v.landingPage || '/'}
                        </span>
                      </div>
                    </td>

                    <td className="p-4 text-neutral-300 font-medium">
                      <div>{v.companyName || 'Unassigned Tenant'}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">Widget: {v.widgetId || 'default'}</div>
                    </td>

                    <td className="p-4 font-mono text-neutral-400">
                      <div className="flex items-center space-x-1.5">
                        {v.device === 'mobile' ? (
                          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                        ) : v.device === 'tablet' ? (
                          <Tablet className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <Laptop className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span>{v.browser} / {v.os}</span>
                      </div>
                    </td>

                    <td className="p-4 font-mono text-neutral-400">
                      <div>{new Date(v.firstSeenAt).toLocaleTimeString()}</div>
                      <div className="text-[10px] text-neutral-500">{new Date(v.firstSeenAt).toLocaleDateString()}</div>
                    </td>

                    <td className="p-4 font-mono text-neutral-400">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3 h-3 text-neutral-500" />
                        <span className="text-white font-medium">{formatRelativeTime(v.lastSeenAt)}</span>
                      </div>
                      <div className="text-[10px] text-neutral-500">{v.durationSeconds}s duration</div>
                    </td>

                    <td className="p-4 text-right">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                          v.inquirySubmitted
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : isOnlineNow
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                        }`}
                      >
                        {v.inquirySubmitted ? (
                          <>
                            <Sparkles className="w-3 h-3" />
                            <span>Inquiry ({v.leadScore || 'HOT'})</span>
                          </>
                        ) : isOnlineNow ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>Active Now</span>
                          </>
                        ) : (
                          <span>Browsing</span>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredVisitors.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-neutral-500 font-mono text-xs">
                    {searchQuery ? 'No visitors match your search filter.' : 'No active website visitor sessions recorded yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
