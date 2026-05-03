import { useState, useRef, useEffect } from 'react';
import type { HttpMethod } from '../types/index';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const METHOD_STYLE: Record<HttpMethod, { text: string; selectedBg: string; dot: string }> = {
  GET:     { text: '#35D07F', selectedBg: '#10261B', dot: '#35D07F' },
  POST:    { text: '#FFD166', selectedBg: '#2C2411', dot: '#FFD166' },
  PUT:     { text: '#5AC8FA', selectedBg: '#102331', dot: '#5AC8FA' },
  PATCH:   { text: '#BF8BFF', selectedBg: '#251936', dot: '#BF8BFF' },
  DELETE:  { text: '#FF5F57', selectedBg: '#311817', dot: '#FF5F57' },
  HEAD:    { text: '#FF9F0A', selectedBg: '#2D210D', dot: '#FF9F0A' },
  OPTIONS: { text: '#64D2FF', selectedBg: '#102331', dot: '#64D2FF' },
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
        style={{ color: current.text }}
        className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded font-bold text-xs min-w-[86px] justify-between transition-colors bg-pm-bg border-[1.5px] border-pm-border hover:border-pm-active"
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
                  backgroundColor: isSelected ? s.selectedBg : '#111318',
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
