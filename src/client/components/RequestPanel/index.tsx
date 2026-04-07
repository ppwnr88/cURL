import { useState } from 'react';
import { ParamsTab } from './ParamsTab';
import { HeadersTab } from './HeadersTab';
import { BodyTab } from './BodyTab';
import { AuthTab } from './AuthTab';
import type { HttpRequest, KeyValuePair, RequestBody, AuthConfig } from '../../types/index';

type Tab = 'params' | 'headers' | 'body' | 'auth';

interface Props {
  request: HttpRequest;
  onChange: (request: HttpRequest) => void;
  curlCommand: string | null;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'params',  label: 'Params'  },
  { id: 'headers', label: 'Headers' },
  { id: 'body',    label: 'Body'    },
  { id: 'auth',    label: 'Auth'    },
];

function countActive(pairs: KeyValuePair[]): number {
  return pairs.filter((p) => p.enabled && p.key.trim() !== '').length;
}

export function RequestPanel({ request, onChange, curlCommand }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('params');
  const [showCurl, setShowCurl] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!curlCommand) return;
    try {
      await navigator.clipboard.writeText(curlCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const paramCount  = countActive(request.params);
  const headerCount = countActive(request.headers);
  const bodyActive  = request.body.type !== 'none';

  return (
    <div className="flex flex-col h-full bg-pm-bg">

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-pm-border px-1 flex-shrink-0 bg-pm-panel">
        <div className="flex">
          {TABS.map((tab) => {
            const badge =
              tab.id === 'params'  ? paramCount  :
              tab.id === 'headers' ? headerCount :
              tab.id === 'body' && bodyActive ? 1 : 0;

            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium
                  transition-colors select-none
                  ${isActive
                    ? 'text-pm-text border-b-2 border-orange -mb-px'
                    : 'text-pm-sub hover:text-pm-text border-b-2 border-transparent -mb-px'
                  }
                `}
              >
                {tab.label}
                {badge > 0 && (
                  <span className="px-1 min-w-[16px] h-4 flex items-center justify-center rounded text-[10px] font-semibold bg-orange/20 text-orange">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Copy as cURL */}
        <button
          type="button"
          onClick={() => setShowCurl((v) => !v)}
          className={`
            text-xs px-2.5 py-1 rounded border transition-colors mr-1
            ${showCurl
              ? 'border-orange/50 text-orange bg-orange/10'
              : 'border-pm-border text-pm-sub hover:text-pm-text hover:border-pm-active'
            }
          `}
        >
          {showCurl ? 'Hide cURL' : 'Code'}
        </button>
      </div>

      {/* ── cURL snippet ────────────────────────────────────────── */}
      {showCurl && (
        <div className="flex-shrink-0 border-b border-pm-border bg-pm-bg">
          <div className="flex items-start justify-between gap-2 p-3">
            <pre className="flex-1 text-xs font-mono text-pm-sub whitespace-pre-wrap break-all leading-relaxed overflow-auto max-h-24">
              {curlCommand ?? '— send a request first —'}
            </pre>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!curlCommand}
              className="flex-shrink-0 text-xs px-2.5 py-1 rounded border border-pm-border text-pm-sub hover:text-pm-text hover:border-pm-active transition-colors disabled:opacity-40 whitespace-nowrap"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'params'  && <ParamsTab  params={request.params}   onChange={(params)  => onChange({ ...request, params  })} />}
        {activeTab === 'headers' && <HeadersTab headers={request.headers} onChange={(headers) => onChange({ ...request, headers })} />}
        {activeTab === 'body'    && <BodyTab    body={request.body}        onChange={(body: RequestBody)  => onChange({ ...request, body    })} />}
        {activeTab === 'auth'    && <AuthTab    auth={request.auth}        onChange={(auth: AuthConfig)   => onChange({ ...request, auth    })} />}
      </div>
    </div>
  );
}
