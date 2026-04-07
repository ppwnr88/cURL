import { useState, useRef, useCallback, useEffect } from 'react';
import { UrlBar } from './components/UrlBar';
import { RequestPanel } from './components/RequestPanel/index';
import { ResponsePanel } from './components/ResponsePanel/index';
import { ImportCurlModal } from './components/ImportCurlModal';
import { TabBar } from './components/TabBar';
import type { HttpRequest, HttpMethod, HttpResponse, KeyValuePair, Tab } from './types/index';

type MobilePanel = 'request' | 'response';

function newRow(): KeyValuePair {
  return { id: crypto.randomUUID(), key: '', value: '', enabled: true };
}

function createDefaultRequest(): HttpRequest {
  return {
    method: 'GET',
    url: '',
    params: [newRow()],
    headers: [newRow()],
    body: {
      type: 'none',
      rawContent: '',
      rawContentType: 'application/json',
      formData: [newRow()],
      urlencoded: [newRow()],
    },
    auth: { type: 'none' },
  };
}

function createTab(): Tab {
  return {
    id: crypto.randomUUID(),
    request: createDefaultRequest(),
    response: null,
    loading: false,
    error: null,
  };
}

const MIN_PANEL_HEIGHT_PX = 120;

export default function App() {
  // Stable initial tab — useRef so IDs match between the two useState calls
  const initRef = useRef<Tab | null>(null);
  if (!initRef.current) initRef.current = createTab();

  const [tabs, setTabs] = useState<Tab[]>([initRef.current]);
  const [activeTabId, setActiveTabId] = useState<string>(initRef.current.id);
  const [importModal, setImportModal] = useState<{ open: boolean; prefill?: string }>({ open: false });
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('request');

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  // ── Tab operations ──────────────────────────────────────────────────────────

  const addTab = useCallback(() => {
    const tab = createTab();
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    setMobilePanel('request');
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      if (prev.length === 1) return prev;
      const idx = prev.findIndex((t) => t.id === tabId);
      const next = prev.filter((t) => t.id !== tabId);
      setActiveTabId((current) => {
        if (current !== tabId) return current;
        return next[Math.min(idx, next.length - 1)].id;
      });
      return next;
    });
  }, []);

  const switchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const updateTabRequest = useCallback((tabId: string, request: HttpRequest) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, request } : t)));
  }, []);

  // ── Send request ────────────────────────────────────────────────────────────

  const sendRequest = useCallback(async (tabId: string, request: HttpRequest) => {
    if (!request.url.trim()) return;

    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, loading: true, error: null, response: null } : t))
    );

    try {
      const apiUrl = (import.meta.env.VITE_API_URL as string) || '';
      const res = await fetch(`${apiUrl}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const errData = data as { error?: string };
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? { ...t, loading: false, error: errData.error ?? `Server error: ${res.status}` }
              : t
          )
        );
      } else {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId ? { ...t, loading: false, response: data as HttpResponse } : t
          )
        );
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Network error — is the server running?';
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, loading: false, error: message } : t))
      );
    }
  }, []);

  // Auto-switch to response panel on mobile after send completes
  useEffect(() => {
    if (!activeTab.loading && (activeTab.response || activeTab.error)) {
      setMobilePanel('response');
    }
  }, [activeTab.loading, activeTab.response, activeTab.error]);

  // Reset to request panel on mobile when switching to an empty tab
  useEffect(() => {
    if (!activeTab.response && !activeTab.error && !activeTab.loading) {
      setMobilePanel('request');
    }
  }, [activeTabId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Split panel drag ────────────────────────────────────────────────────────

  const [splitPct, setSplitPct] = useState(44);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalHeight = rect.height;
      const relativeY = e.clientY - rect.top;
      const minPct = (MIN_PANEL_HEIGHT_PX / totalHeight) * 100;
      const maxPct = 100 - minPct;
      setSplitPct(Math.min(maxPct, Math.max(minPct, (relativeY / totalHeight) * 100)));
    };
    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // ── Import modal ────────────────────────────────────────────────────────────

  const openImport = useCallback((prefill?: string) => {
    setImportModal({ open: true, prefill });
  }, []);

  const handleImported = useCallback(
    (imported: HttpRequest) => {
      updateTabRequest(activeTabId, imported);
    },
    [activeTabId, updateTabRequest]
  );

  const handleSend = useCallback(() => {
    if (!activeTab.request.url.trim() || activeTab.loading) return;
    void sendRequest(activeTabId, activeTab.request);
  }, [activeTab, activeTabId, sendRequest]);

  const curlCommand = activeTab.response?.curlCommand ?? null;

  return (
    <div className="flex flex-col h-screen bg-pm-bg overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 h-10 bg-pm-panel border-b border-pm-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8.5" fill="#FF6C37" />
            <path d="M6 6.5 L9 4.5 L12 6.5 L12 11.5 L9 13.5 L6 11.5 Z" fill="white" opacity="0.9" />
          </svg>
          <span className="text-pm-text font-semibold text-[13px] tracking-tight">cURL UI</span>
          <span className="text-pm-muted text-xs hidden sm:inline">HTTP Tester</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-pm-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          <span>Ready</span>
        </div>
      </header>

      {/* ── Tab bar ─────────────────────────────────────────────────── */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSwitch={switchTab}
        onAdd={addTab}
        onClose={closeTab}
      />

      {/* ── URL bar ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-pm-panel border-b border-pm-border">
        <UrlBar
          method={activeTab.request.method}
          url={activeTab.request.url}
          loading={activeTab.loading}
          onMethodChange={(method: HttpMethod) =>
            updateTabRequest(activeTabId, { ...activeTab.request, method })
          }
          onUrlChange={(url: string) =>
            updateTabRequest(activeTabId, { ...activeTab.request, url })
          }
          onSend={handleSend}
          onImportCurl={openImport}
        />
      </div>

      {/* ── Mobile: panel tab switcher ──────────────────────────────── */}
      <div className="md:hidden flex flex-shrink-0 border-b border-pm-border bg-pm-panel">
        {(['request', 'response'] as MobilePanel[]).map((panel) => (
          <button
            key={panel}
            type="button"
            onClick={() => setMobilePanel(panel)}
            className={`
              flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium capitalize
              transition-colors select-none border-b-2 -mb-px
              ${mobilePanel === panel
                ? 'text-pm-text border-orange'
                : 'text-pm-sub hover:text-pm-text border-transparent'
              }
            `}
          >
            {panel}
            {panel === 'response' && (activeTab.response || activeTab.error) && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  activeTab.error ? 'bg-red-400' : 'bg-green-500'
                }`}
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Mobile: single active panel ─────────────────────────────── */}
      <div className="md:hidden flex-1 overflow-hidden min-h-0">
        {mobilePanel === 'request' ? (
          <RequestPanel request={activeTab.request} onChange={(r) => updateTabRequest(activeTabId, r)} curlCommand={curlCommand} />
        ) : (
          <ResponsePanel response={activeTab.response} loading={activeTab.loading} error={activeTab.error} />
        )}
      </div>

      {/* ── Desktop: split panels ───────────────────────────────────── */}
      <div ref={containerRef} className="hidden md:flex flex-1 flex-col min-h-0 overflow-hidden">

        {/* Request panel */}
        <div style={{ height: `${splitPct}%` }} className="flex-shrink-0 overflow-hidden">
          <RequestPanel
            request={activeTab.request}
            onChange={(r) => updateTabRequest(activeTabId, r)}
            curlCommand={curlCommand}
          />
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={handleMouseDown}
          className="flex-shrink-0 h-3 cursor-row-resize select-none flex items-center justify-center group transition-colors hover:bg-pm-hover active:bg-pm-active"
          style={{ background: '#1C1C1C', borderTop: '1px solid #464646', borderBottom: '1px solid #464646' }}
        >
          <div className="flex items-center gap-[3px] opacity-40 group-hover:opacity-100 transition-opacity">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="w-[3px] h-[3px] rounded-full bg-pm-sub" />
            ))}
          </div>
        </div>

        {/* Response panel */}
        <div className="flex-1 overflow-hidden min-h-0">
          <ResponsePanel
            response={activeTab.response}
            loading={activeTab.loading}
            error={activeTab.error}
          />
        </div>
      </div>

      {/* ── Import modal ────────────────────────────────────────────── */}
      {importModal.open && (
        <ImportCurlModal
          initialValue={importModal.prefill}
          onImport={handleImported}
          onClose={() => setImportModal({ open: false })}
        />
      )}
    </div>
  );
}
