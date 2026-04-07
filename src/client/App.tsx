import { useState, useRef, useCallback, useEffect } from 'react';
import { UrlBar } from './components/UrlBar';
import { RequestPanel } from './components/RequestPanel/index';
import { ResponsePanel } from './components/ResponsePanel/index';
import { ImportCurlModal } from './components/ImportCurlModal';
import { useRequest } from './hooks/useRequest';
import type { HttpRequest, HttpMethod, KeyValuePair } from './types/index';

function newRow(): KeyValuePair {
  return { id: crypto.randomUUID(), key: '', value: '', enabled: true };
}

const DEFAULT_REQUEST: HttpRequest = {
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

const MIN_PANEL_HEIGHT_PX = 120;

export default function App() {
  const [request, setRequest] = useState<HttpRequest>(DEFAULT_REQUEST);
  const { response, loading, error, send } = useRequest();
  const [importModal, setImportModal] = useState<{ open: boolean; prefill?: string }>({ open: false });

  const [splitPct, setSplitPct] = useState(44);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const openImport = useCallback((prefill?: string) => {
    setImportModal({ open: true, prefill });
  }, []);

  const handleImported = useCallback((imported: HttpRequest) => {
    setRequest(imported);
  }, []);

  const handleSend = useCallback(() => {
    if (!request.url.trim() || loading) return;
    void send(request);
  }, [request, loading, send]);

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
      const newPct = Math.min(maxPct, Math.max(minPct, (relativeY / totalHeight) * 100));
      setSplitPct(newPct);
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

  const curlCommand = response?.curlCommand ?? null;

  return (
    <div className="flex flex-col h-screen bg-pm-bg overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 h-10 bg-pm-panel border-b border-pm-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Postman-style logo mark */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8.5" fill="#FF6C37" />
            <path d="M6 6.5 L9 4.5 L12 6.5 L12 11.5 L9 13.5 L6 11.5 Z" fill="white" opacity="0.9" />
          </svg>
          <span className="text-pm-text font-semibold text-[13px] tracking-tight">cURL UI</span>
          <span className="text-pm-muted text-xs">HTTP Tester</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-pm-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          <span>Ready</span>
        </div>
      </header>

      {/* ── URL bar ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-pm-panel border-b border-pm-border">
        <UrlBar
          method={request.method}
          url={request.url}
          loading={loading}
          onMethodChange={(method: HttpMethod) => setRequest((r) => ({ ...r, method }))}
          onUrlChange={(url: string) => setRequest((r) => ({ ...r, url }))}
          onSend={handleSend}
          onImportCurl={openImport}
        />
      </div>

      {/* ── Split panels ────────────────────────────────────────────── */}
      <div ref={containerRef} className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Request panel */}
        <div
          style={{ height: `${splitPct}%` }}
          className="flex-shrink-0 overflow-hidden"
        >
          <RequestPanel
            request={request}
            onChange={setRequest}
            curlCommand={curlCommand}
          />
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={handleMouseDown}
          className="flex-shrink-0 h-3 cursor-row-resize select-none flex items-center justify-center group transition-colors hover:bg-pm-hover active:bg-pm-active"
          style={{ background: '#1C1C1C', borderTop: '1px solid #464646', borderBottom: '1px solid #464646' }}
        >
          {/* Grip dots */}
          <div className="flex items-center gap-[3px] opacity-40 group-hover:opacity-100 transition-opacity">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="w-[3px] h-[3px] rounded-full bg-pm-sub" />
            ))}
          </div>
        </div>

        {/* Response panel */}
        <div className="flex-1 overflow-hidden min-h-0">
          <ResponsePanel
            response={response}
            loading={loading}
            error={error}
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
