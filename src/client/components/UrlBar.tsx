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
    <div className="flex items-center gap-2 px-3 py-2.5">

      {/* Method dropdown */}
      <MethodSelect value={method} onChange={onMethodChange} />

      {/* URL input */}
      <input
        type="url"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder="Enter URL or paste a curl command"
        className="
          flex-1 rounded px-3 py-1.5 text-sm text-pm-text placeholder-pm-muted
          outline-none transition-colors font-mono
          focus:border-orange hover:border-[#606060]
        "
        style={{ background: '#141414', border: '1.5px solid #505050' }}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />

      {/* Import cURL */}
      <button
        type="button"
        onClick={() => onImportCurl()}
        title="Import a curl command"
        className="
          flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded
          text-pm-sub hover:text-pm-text text-xs font-medium
          transition-colors whitespace-nowrap hover:brightness-125
        "
        style={{ background: '#141414', border: '1.5px solid #505050' }}
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
        style={{ background: '#2762F5' }}
        className="
          flex-shrink-0 flex items-center gap-2 px-4 py-1.5 rounded
          disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110
          text-white text-sm font-semibold transition-all
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
  );
}
