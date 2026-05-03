import React, { useRef, useEffect } from 'react';
import type { Tab } from '../types/index';

const METHOD_COLOR: Record<string, string> = {
  GET:     '#35D07F',
  POST:    '#FFD166',
  PUT:     '#5AC8FA',
  PATCH:   '#BF8BFF',
  DELETE:  '#FF5F57',
  HEAD:    '#FF9F0A',
  OPTIONS: '#64D2FF',
};

function getTabLabel(tab: Tab): string {
  const { url } = tab.request;
  if (!url.trim()) return 'New Request';
  try {
    const u = new URL(url);
    const path = u.pathname === '/' ? '' : u.pathname;
    const label = `${u.hostname}${path}`;
    return label.length > 24 ? label.slice(0, 24) + '…' : label;
  } catch {
    const clean = url.replace(/^https?:\/\//, '');
    return clean.length > 24 ? clean.slice(0, 24) + '…' : clean;
  }
}

interface Props {
  tabs: Tab[];
  activeTabId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onClose: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onSwitch, onAdd, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [activeTabId]);

  return (
    <div
      className="flex items-stretch flex-shrink-0 bg-pm-panel border-b border-pm-border"
      style={{ minHeight: '34px' }}
    >
      {/* Scrollable tab list */}
      <div
        ref={scrollRef}
        className="tab-strip flex items-stretch overflow-x-auto flex-1 min-w-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const label = getTabLabel(tab);
          const methodColor = METHOD_COLOR[tab.request.method] ?? '#ABABAB';

          return (
            <div
              key={tab.id}
              data-active={isActive}
              onClick={() => onSwitch(tab.id)}
              className={`
                group relative flex items-center gap-1.5 px-3 cursor-pointer
                border-r border-pm-line flex-shrink-0 select-none transition-colors
                ${isActive
                  ? 'bg-pm-bg text-pm-text'
                  : 'bg-pm-panel text-pm-sub hover:bg-pm-hover hover:text-pm-text'
                }
              `}
              style={{ maxWidth: 180, minWidth: 72 }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ background: '#5AC8FA' }}
                />
              )}

              {/* Method color dot */}
              <span
                className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                style={{ background: methodColor }}
              />

              {/* Loading spinner replaces dot when in-flight */}
              {tab.loading && (
                <span
                  className="absolute left-3 w-[7px] h-[7px] rounded-full border border-pm-sub animate-spin flex-shrink-0"
                  style={{ borderTopColor: 'transparent' }}
                />
              )}

              {/* Label */}
              <span className="text-[11px] truncate flex-1 leading-none py-2.5">
                {label}
              </span>

              {/* Close — always reserve space to prevent layout shift */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
                title="Close tab"
                className={`
                  flex-shrink-0 w-4 h-4 flex items-center justify-center rounded
                  text-pm-muted hover:text-pm-text hover:bg-pm-active transition-all text-xs
                  ${tabs.length === 1 ? 'invisible' : 'opacity-0 group-hover:opacity-100'}
                `}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* New tab button */}
      <button
        type="button"
        onClick={onAdd}
        title="New request tab"
        className="flex-shrink-0 flex items-center justify-center w-9 text-pm-muted hover:text-pm-text hover:bg-pm-hover transition-colors text-xl font-light border-l border-pm-line"
      >
        +
      </button>
    </div>
  );
}
