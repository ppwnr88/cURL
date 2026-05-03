import { useState, useMemo, useEffect, useRef, useCallback } from 'react';

function useCopyToClipboard(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);
  return { copied, copy };
}

interface Props {
  body: string;
  contentType?: string;
}

type DisplayMode = 'pretty' | 'raw';

// ─── Syntax highlight ─────────────────────────────────────────────────────────

function syntaxHighlight(json: string): string {
  const escaped = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-string';
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function tryPrettyJson(body: string): { pretty: string | null; isJson: boolean } {
  try {
    const parsed = JSON.parse(body);
    return { pretty: JSON.stringify(parsed, null, 2), isJson: true };
  } catch {
    return { pretty: null, isJson: false };
  }
}

// ─── Search highlight ─────────────────────────────────────────────────────────

/**
 * Inject <mark> tags into an HTML string for visible text matches only
 * (skips content inside < > tags so span/class attributes aren't touched).
 * Marks all matches with data-match attribute and search-match class only —
 * active highlight is applied separately via DOM manipulation.
 * Returns the modified HTML and the total match count.
 */
function highlightInHtml(
  html: string,
  term: string,
  caseSensitive: boolean,
): { html: string; count: number } {
  if (!term.trim()) return { html, count: 0 };

  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const flags = caseSensitive ? 'g' : 'gi';
  let regex: RegExp;
  try {
    regex = new RegExp(escapedTerm, flags);
  } catch {
    return { html, count: 0 };
  }

  let result = '';
  let globalMatchIndex = 0;
  let inTag = false;
  let buffer = '';

  const flushBuffer = () => {
    if (!buffer) return;
    // Reset regex lastIndex for each text chunk
    regex.lastIndex = 0;
    const highlighted = buffer.replace(regex, (match) => {
      const idx = globalMatchIndex++;
      return `<mark class="search-match" data-match="${idx}">${match}</mark>`;
    });
    result += highlighted;
    buffer = '';
  };

  for (let i = 0; i < html.length; i++) {
    const ch = html[i];
    if (ch === '<') {
      flushBuffer();
      inTag = true;
      result += ch;
    } else if (ch === '>') {
      inTag = false;
      result += ch;
    } else if (inTag) {
      result += ch;
    } else {
      buffer += ch;
    }
  }
  flushBuffer();

  return { html: result, count: globalMatchIndex };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ResponseBody({ body, contentType }: Props) {
  const isJsonContent = contentType?.includes('json') || contentType?.includes('javascript');
  const { pretty, isJson } = useMemo(() => tryPrettyJson(body), [body]);
  const canPretty = isJson || isJsonContent;

  const [mode, setMode] = useState<DisplayMode>('pretty');
  const { copied, copy } = useCopyToClipboard(mode === 'pretty' && canPretty && pretty ? pretty : body);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');       // live input value
  const [committedTerm, setCommittedTerm] = useState(''); // only applied on Enter / Find click
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  // Base HTML without search marks
  const baseHtml = useMemo(() => {
    if (mode === 'pretty' && canPretty && pretty) {
      return syntaxHighlight(pretty);
    }
    return escapeHtml(body);
  }, [mode, canPretty, pretty, body]);

  // HTML with search highlights applied — driven by committedTerm, not live input.
  // currentMatch is intentionally excluded: active state is toggled by DOM effect below.
  const { displayHtml, totalMatches } = useMemo(() => {
    if (!searchOpen || !committedTerm.trim()) {
      return { displayHtml: baseHtml, totalMatches: 0 };
    }
    const { html, count } = highlightInHtml(baseHtml, committedTerm, caseSensitive);
    return { displayHtml: html, totalMatches: count };
  }, [baseHtml, searchOpen, committedTerm, caseSensitive]);

  // Clamp currentMatch when totalMatches changes
  useEffect(() => {
    if (totalMatches > 0 && currentMatch >= totalMatches) {
      setCurrentMatch(totalMatches - 1);
    } else if (totalMatches === 0) {
      setCurrentMatch(0);
    }
  }, [totalMatches, currentMatch]);

  // DOM-only effect: toggle active class without re-rendering the whole HTML string
  useEffect(() => {
    if (!preRef.current) return;
    // clear previous active
    preRef.current.querySelectorAll('.search-match-active').forEach((el) => {
      el.classList.remove('search-match-active');
    });
    if (!committedTerm || totalMatches === 0) return;
    const el = preRef.current.querySelector<HTMLElement>(`[data-match="${currentMatch}"]`);
    if (el) {
      el.classList.add('search-match-active');
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentMatch, totalMatches, committedTerm, displayHtml]);

  // Open search bar on Ctrl/Cmd+F; select all response text on Ctrl/Cmd+A
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 30);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;
        if (!preRef.current) return;
        e.preventDefault();
        const sel = window.getSelection();
        if (!sel) return;
        const range = document.createRange();
        range.selectNodeContents(preRef.current);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 30);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchTerm('');
    setCommittedTerm('');
    setCurrentMatch(0);
  }, []);

  const commitSearch = useCallback(() => {
    setCurrentMatch(0);
    setCommittedTerm(searchTerm);
  }, [searchTerm]);

  const goNext = useCallback(() => {
    if (totalMatches === 0) return;
    setCurrentMatch((c) => (c + 1) % totalMatches);
  }, [totalMatches]);

  const goPrev = useCallback(() => {
    if (totalMatches === 0) return;
    setCurrentMatch((c) => (c - 1 + totalMatches) % totalMatches);
  }, [totalMatches]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // First Enter commits; subsequent Enter navigates
      if (committedTerm !== searchTerm) {
        commitSearch();
      } else {
        e.shiftKey ? goPrev() : goNext();
      }
    } else if (e.key === 'Escape') {
      closeSearch();
    }
  };

  // Reset match position when committed term or case changes
  useEffect(() => {
    setCurrentMatch(0);
  }, [committedTerm, caseSensitive]);

  if (!body) {
    return (
      <div className="flex items-center justify-center h-full text-pm-muted italic text-xs">
        No response body
      </div>
    );
  }

  const matchLabel =
    totalMatches === 0
      ? committedTerm ? 'No matches' : ''
      : `${currentMatch + 1} / ${totalMatches}`;

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-pm-line flex-shrink-0 bg-pm-panel">
        <div className="flex items-center gap-0.5">
          {(['pretty', 'raw'] as DisplayMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              disabled={m === 'pretty' && !canPretty}
              className={`
                px-3 py-1 text-xs rounded transition-colors capitalize
                ${mode === m
                  ? 'bg-pm-active text-pm-text'
                  : 'text-pm-sub hover:text-pm-text disabled:opacity-30 disabled:cursor-not-allowed'
                }
              `}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
        {/* Copy button */}
        <button
          type="button"
          onClick={copy}
          title="Copy response body"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors text-pm-sub hover:text-pm-text hover:bg-pm-raised"
        >
          {copied ? (
            <>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <polyline points="2,8 6,12 14,4" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="5" y="5" width="9" height="9" rx="1.5" />
                <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" />
              </svg>
              Copy
            </>
          )}
        </button>

        {/* Find toggle */}
        <button
          type="button"
          onClick={openSearch}
          title="Find in response (Ctrl+F)"
          className={`
            flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors
            ${searchOpen
              ? 'bg-pm-active text-pm-text'
              : 'text-pm-sub hover:text-pm-text hover:bg-pm-raised'
            }
          `}
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="6.5" cy="6.5" r="4.5" />
            <line x1="10.5" y1="10.5" x2="14" y2="14" />
          </svg>
          Find
        </button>
        </div>
      </div>

      {/* ── Find bar ─────────────────────────────────────────── */}
      {searchOpen && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-pm-panel border-b border-pm-line flex-shrink-0">
          <div className="relative flex-1 min-w-[140px]">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Type then press Enter or Find…"
              className={`
                w-full rounded px-3 py-1.5 text-xs font-mono
                text-pm-text placeholder-pm-muted outline-none transition-colors pr-20
                bg-pm-bg border-[1.5px]
                ${committedTerm && totalMatches === 0
                  ? 'border-red-500/60 focus:border-red-500'
                  : 'border-pm-border focus:border-orange hover:border-pm-active'
                }
              `}
            />
            {committedTerm && (
              <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-mono whitespace-nowrap
                ${totalMatches === 0 ? 'text-red-400' : 'text-pm-muted'}`}>
                {matchLabel}
              </span>
            )}
          </div>

          {/* Find */}
          <button
            type="button"
            onClick={commitSearch}
            disabled={!searchTerm.trim()}
            className="flex-shrink-0 px-3 py-1.5 rounded text-xs font-semibold bg-orange hover:bg-orange-hover disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            Find
          </button>

          {/* Case-sensitive */}
          <button
            type="button"
            onClick={() => setCaseSensitive((v) => !v)}
            title="Match case"
            className={`
              flex-shrink-0 w-7 h-7 flex items-center justify-center rounded
              text-xs font-bold border transition-colors
              ${caseSensitive
                ? 'bg-orange/15 border-orange/40 text-orange'
                : 'bg-pm-raised border-pm-border text-pm-muted hover:text-pm-text'
              }
            `}
          >
            Aa
          </button>

          {/* Prev / Next */}
          <button
            type="button"
            onClick={goPrev}
            disabled={totalMatches === 0}
            title="Previous match (Shift+Enter)"
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded bg-pm-raised border border-pm-border text-pm-sub hover:text-pm-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="2,7 5,3 8,7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={totalMatches === 0}
            title="Next match (Enter)"
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded bg-pm-raised border border-pm-border text-pm-sub hover:text-pm-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="2,3 5,7 8,3" />
            </svg>
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={closeSearch}
            title="Close (Escape)"
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded text-pm-muted hover:text-pm-text hover:bg-pm-raised transition-colors text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Body content ─────────────────────────────────────── */}
      <div className="flex-1 overflow-auto min-h-0 p-4">
        <pre
          ref={preRef}
          className="text-xs font-mono text-pm-text whitespace-pre-wrap break-words leading-relaxed"
          dangerouslySetInnerHTML={{ __html: displayHtml }}
        />
      </div>
    </div>
  );
}
