import React from 'react';
import { MethodSelect } from './MethodSelect';
import type { HttpMethod } from '../types/index';

interface Props {
  method: HttpMethod;
  url: string;
  loading: boolean;
  onMethodChange: (method: HttpMethod) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
  onImportCurl: (prefill?: string) => void;
}

export function UrlBar({ method, url, loading, onMethodChange, onUrlChange, onSend, onImportCurl }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSend();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').trim();
    if (/^(?:.*[/\\])?curl\s/.test(pasted)) {
      e.preventDefault();
      onImportCurl(pasted);
    }
  };

  return (
    <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">

      {/* Row 1: Method + URL */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <MethodSelect value={method} onChange={onMethodChange} />
        <input
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Enter URL or paste a curl command"
          className="
            flex-1 min-w-0 rounded px-3 py-1.5 text-sm text-pm-text placeholder-pm-muted
            outline-none transition-colors font-mono
            bg-pm-bg border-[1.5px] border-pm-border
            focus:border-orange hover:border-pm-active
          "
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      {/* Row 2 (mobile) / inline (sm+): Import + Send */}
      <div className="flex items-center gap-2">
        {/* Import cURL */}
        <button
          type="button"
          onClick={() => onImportCurl()}
          title="Import a curl command"
          className="
            flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded
            text-pm-sub hover:text-pm-text text-xs font-medium
            transition-colors whitespace-nowrap bg-pm-bg border-[1.5px] border-pm-border hover:border-pm-active
          "
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
            <rect x="5" y="1" width="9" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M5 4H3.5A1.5 1.5 0 0 0 2 5.5v9A1.5 1.5 0 0 0 3.5 16h7A1.5 1.5 0 0 0 12 14.5V13" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
          Import cURL
        </button>

        {/* Send */}
        <button
          type="button"
          onClick={onSend}
          disabled={loading || !url.trim()}
          className="
            flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded
            disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110
            bg-send hover:bg-send-hover text-white text-sm font-semibold transition-all
          "
        >
          {loading ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Sending</span>
            </>
          ) : (
            'Send'
          )}
        </button>
      </div>
    </div>
  );
}
