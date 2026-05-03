import { useState, useEffect, useRef } from 'react';
import { parseCurl } from '../utils/curlParser';
import type { HttpRequest } from '../types/index';

interface Props {
  initialValue?: string;
  onImport: (request: HttpRequest) => void;
  onClose: () => void;
}

type Tab = 'paste' | 'file';

export function ImportCurlModal({ initialValue = '', onImport, onClose }: Props) {
  const [tab, setTab] = useState<Tab>(initialValue ? 'paste' : 'paste');
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tab === 'paste') {
      setTimeout(() => textareaRef.current?.focus(), 30);
    }
  }, [tab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ── File reading ─────────────────────────────────────────────────────────

  const loadFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setValue(text ?? '');
      setFileName(file.name);
      setTab('paste'); // switch to paste tab so user can preview & edit
    };
    reader.onerror = () => setError('Failed to read file.');
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    // reset so same file can be re-selected
    e.target.value = '';
  };

  // ── Drag-and-drop onto the file zone ─────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  // ── Import ────────────────────────────────────────────────────────────────

  const handleImport = () => {
    setError(null);
    const result = parseCurl(value.trim());
    if (!result.ok) { setError(result.error); return; }
    onImport(result.request);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleImport();
    }
  };

  const isMac = navigator.platform.includes('Mac');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl sm:mx-4 bg-pm-panel sm:border border-pm-border sm:rounded shadow-2xl flex flex-col h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-pm-border">
          <div>
            <h2 className="text-pm-text font-semibold text-sm">Import cURL</h2>
            <p className="text-pm-muted text-xs mt-0.5">
              Paste a curl command or load from a file (.txt, .sh, .curl)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-pm-muted hover:text-pm-text transition-colors ml-4 w-7 h-7 flex items-center justify-center rounded hover:bg-pm-raised text-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ── Source tabs ─────────────────────────────────────────── */}
        <div className="flex border-b border-pm-border px-1">
          {(['paste', 'file'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setError(null); }}
              className={`
                px-4 py-2.5 text-xs font-medium transition-colors capitalize select-none
                ${tab === t
                  ? 'text-pm-text border-b-2 border-orange -mb-px'
                  : 'text-pm-sub hover:text-pm-text border-b-2 border-transparent -mb-px'
                }
              `}
            >
              {t === 'paste' ? 'Paste text' : 'Load from file'}
            </button>
          ))}
        </div>

        {/* ── Content ─────────────────────────────────────────────── */}
        <div className="p-5">

          {/* Paste tab */}
          {tab === 'paste' && (
            <>
              {fileName && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded bg-orange/10 border border-orange/25">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 1h5l4 4v10H4V1z"/><polyline points="9,1 9,5 13,5"/>
                  </svg>
                  <span className="text-xs text-orange font-medium">{fileName}</span>
                  <button
                    onClick={() => { setFileName(null); setValue(''); }}
                    className="ml-auto text-pm-muted hover:text-pm-text text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(null); }}
                onKeyDown={handleKeyDown}
                placeholder={`curl -X POST 'https://api.example.com/data' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"key": "value"}'`}
                rows={10}
                spellCheck={false}
                className={`
                  w-full rounded px-4 py-3 text-xs text-pm-text placeholder-pm-muted font-mono
                  leading-relaxed resize-none outline-none transition-colors bg-pm-bg border-[1.5px]
                  ${error ? 'border-red-900 focus:border-red-500' : 'border-pm-border focus:border-orange hover:border-pm-active'}
                `}
              />
            </>
          )}

          {/* File tab */}
          {tab === 'file' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ minHeight: '160px' }}
              className={`
                flex flex-col items-center justify-center gap-4 rounded cursor-pointer select-none
                transition-colors bg-pm-bg border-[1.5px] border-dashed hover:border-pm-active
                ${dragging ? 'border-orange bg-orange/10' : 'border-pm-border'}
              `}
            >
              <div className="flex flex-col items-center justify-center gap-4 py-8 sm:py-14">
                {/* Upload icon */}
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-orange/10 text-orange">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-pm-text text-sm font-medium">
                    {dragging ? 'Drop file here' : 'Click to browse or drag & drop'}
                  </p>
                  <p className="text-pm-muted text-xs mt-1">.txt · .sh · .curl · any text file</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="px-4 py-1.5 rounded border border-pm-border text-pm-sub hover:text-pm-text hover:border-pm-active text-xs transition-colors"
                >
                  Choose File
                </button>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.sh,.curl,.bash,text/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Error */}
          {error && (
            <p className="mt-2 text-xs text-red-400 flex items-center gap-1.5">
              <span>⚠</span> {error}
            </p>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-pm-border">
          <span className="text-xs text-pm-muted">
            {tab === 'paste' ? `${isMac ? '⌘' : 'Ctrl'}+Enter to import` : 'File contents will be previewed before import'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-pm-sub hover:text-pm-text border border-pm-border hover:border-pm-active rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!value.trim()}
              className="px-5 py-1.5 rounded bg-orange hover:bg-orange-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
            >
              Import
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
