import { useState, useRef, useEffect } from 'react';
import type { HttpMethod } from '../types/index';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const METHOD_STYLE: Record<HttpMethod, { text: string; selectedBg: string; dot: string }> = {
  GET:     { text: '#49CC90', selectedBg: '#1a3326', dot: '#49CC90' },
  POST:    { text: '#FCA130', selectedBg: '#332510', dot: '#FCA130' },
  PUT:     { text: '#50A8FB', selectedBg: '#152236', dot: '#50A8FB' },
  PATCH:   { text: '#C084FC', selectedBg: '#261a36', dot: '#C084FC' },
  DELETE:  { text: '#F93E3E', selectedBg: '#361515', dot: '#F93E3E' },
  HEAD:    { text: '#9B59B6', selectedBg: '#221530', dot: '#9B59B6' },
  OPTIONS: { text: '#60A5FA', selectedBg: '#152236', dot: '#60A5FA' },
};

interface Props {
  value: HttpMethod;
  onChange: (method: HttpMethod) => void;
}

export function MethodSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const current = METHOD_STYLE[value];

  return (
    <div ref={ref} className="relative flex-shrink-0">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ color: current.text, background: '#141414', border: '1.5px solid #505050' }}
        className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded font-bold text-xs min-w-[86px] justify-between transition-colors hover:border-[#686868]"
      >
        <span className="tracking-wide">{value}</span>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          stroke="currentColor" strokeWidth="1.8"
          style={{ opacity: 0.7 }}
          className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="2,3 5,7 8,3" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 rounded border border-pm-border bg-pm-panel shadow-xl overflow-hidden"
          style={{ minWidth: '120px' }}
        >
          {METHODS.map((m) => {
            const s = METHOD_STYLE[m];
            const isSelected = m === value;
            return (
              <button
                key={m}
                type="button"
                onClick={() => { onChange(m); setOpen(false); }}
                style={{
                  color: s.text,
                  backgroundColor: isSelected ? s.selectedBg : '#252525',
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-left hover:bg-pm-hover transition-colors"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: s.dot }}
                />
                {m}
                {isSelected && (
                  <svg className="ml-auto" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
