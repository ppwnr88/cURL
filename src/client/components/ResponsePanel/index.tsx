import { useState } from 'react';
import { ResponseBody } from './ResponseBody';
import { ResponseHeaders } from './ResponseHeaders';
import type { HttpResponse } from '../../types/index';

type Tab = 'body' | 'headers';

interface Props {
  response: HttpResponse | null;
  loading: boolean;
  error: string | null;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function StatusBadge({ status }: { status: number }) {
  const color =
    status >= 500                 ? '#FF5F57' :
    status >= 400                 ? '#FF5F57' :
    status >= 300 && status < 400 ? '#FFD166' :
    status >= 200 && status < 300 ? '#35D07F' :
                                    '#A8B3C2';
  return (
    <span className="font-bold font-mono text-sm" style={{ color }}>{status}</span>
  );
}

export function ResponsePanel({ response, loading, error }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('body');

  const headerCount = response ? Object.keys(response.headers).length : 0;

  return (
    <div className="flex flex-col h-full bg-pm-bg">

      {/* ── Tab bar + meta ──────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-pm-border px-1 flex-shrink-0 bg-pm-panel">

        <div className="flex">
          {(['body', 'headers'] as Tab[]).map((tab) => {
            const badge = tab === 'headers' ? headerCount : 0;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`
                  flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium
                  transition-colors capitalize select-none
                  ${isActive
                    ? 'text-pm-text border-b-2 border-orange -mb-px'
                    : 'text-pm-sub hover:text-pm-text border-b-2 border-transparent -mb-px'
                  }
                `}
              >
                {tab}
                {badge > 0 && (
                  <span className="px-1 min-w-[16px] h-4 flex items-center justify-center rounded text-[10px] font-semibold bg-orange/20 text-orange">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Response meta */}
        {response && (
          <div className="flex items-center gap-2 sm:gap-3 pr-2 sm:pr-3 text-xs">
            <StatusBadge status={response.status} />
            <span className="text-pm-sub hidden sm:inline">{response.statusText}</span>
            <span className="text-pm-border hidden sm:inline">│</span>
            <span>
              <span className="text-pm-text font-medium">{response.duration}</span>
              <span className="text-pm-muted"> ms</span>
            </span>
            <span className="text-pm-border hidden sm:inline">│</span>
            <span className="text-pm-text font-medium">{formatSize(response.size)}</span>
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-7 h-7 border-2 border-pm-border border-t-orange rounded-full animate-spin" />
            <span className="text-pm-muted text-xs">Sending request…</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center justify-center h-full p-6">
            <div className="w-full max-w-lg bg-red-500/10 border border-red-500/25 rounded p-4">
              <p className="text-red-400 text-xs font-semibold mb-1.5">Request Failed</p>
              <p className="text-red-300/80 text-xs font-mono break-all leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && !response && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-pm-muted">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="opacity-20">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 8 16 12 12 16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            <span className="text-xs">Enter a URL and press Send</span>
          </div>
        )}

        {!loading && !error && response && (
          <>
            {activeTab === 'body'    && <ResponseBody body={response.body} contentType={response.headers['content-type']} />}
            {activeTab === 'headers' && <ResponseHeaders headers={response.headers} />}
          </>
        )}
      </div>
    </div>
  );
}
