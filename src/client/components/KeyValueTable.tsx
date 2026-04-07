import type { KeyValuePair } from '../types/index';

interface Props {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

function newRow(): KeyValuePair {
  return { id: crypto.randomUUID(), key: '', value: '', enabled: true };
}

export function KeyValueTable({ pairs, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value' }: Props) {

  const handleKeyChange = (id: string, key: string) => {
    const updated = pairs.map((p) => (p.id === id ? { ...p, key } : p));
    const last = updated[updated.length - 1];
    if (last?.id === id && key !== '') {
      const hasEmpty = updated.some((p) => p.id !== id && p.key === '' && p.value === '');
      if (!hasEmpty) { onChange([...updated, newRow()]); return; }
    }
    onChange(updated);
  };

  const handleValueChange = (id: string, value: string) => {
    const updated = pairs.map((p) => (p.id === id ? { ...p, value } : p));
    const last = updated[updated.length - 1];
    if (last?.id === id && value !== '') {
      const hasEmpty = updated.some((p) => p.id !== id && p.key === '' && p.value === '');
      if (!hasEmpty) { onChange([...updated, newRow()]); return; }
    }
    onChange(updated);
  };

  const handleToggle = (id: string) =>
    onChange(pairs.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));

  const handleDelete = (id: string) => {
    const filtered = pairs.filter((p) => p.id !== id);
    onChange(filtered.length === 0 ? [newRow()] : filtered);
  };

  return (
    <div className="w-full">
      {/* Column headers */}
      <div
        className="grid text-[11px] font-medium text-pm-muted uppercase tracking-wider border-b border-pm-line"
        style={{ gridTemplateColumns: '32px 1fr 1fr 32px' }}
      >
        <div className="px-2 py-1.5" />
        <div className="px-3 py-1.5">{keyPlaceholder}</div>
        <div className="px-3 py-1.5">{valuePlaceholder}</div>
        <div />
      </div>

      {/* Rows */}
      {pairs.map((pair) => (
        <div
          key={pair.id}
          className="grid group border-b border-pm-line last:border-0 hover:bg-pm-hover/40 transition-colors"
          style={{ gridTemplateColumns: '32px 1fr 1fr 32px' }}
        >
          {/* Checkbox */}
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={pair.enabled}
              onChange={() => handleToggle(pair.id)}
              className="w-3.5 h-3.5 cursor-pointer rounded"
            />
          </div>

          {/* Key */}
          <div className="border-r border-pm-line px-0.5 py-0.5">
            <input
              type="text"
              value={pair.key}
              placeholder={keyPlaceholder}
              onChange={(e) => handleKeyChange(pair.id, e.target.value)}
              disabled={!pair.enabled}
              className="
                w-full bg-transparent px-2.5 py-1.5 text-xs font-mono
                text-pm-text placeholder-pm-muted/60
                outline-none rounded
                focus:bg-pm-raised focus:outline-1 focus:outline-orange/50
                disabled:opacity-40 transition-colors
              "
            />
          </div>

          {/* Value */}
          <div className="px-0.5 py-0.5">
            <input
              type="text"
              value={pair.value}
              placeholder={valuePlaceholder}
              onChange={(e) => handleValueChange(pair.id, e.target.value)}
              disabled={!pair.enabled}
              className="
                w-full bg-transparent px-2.5 py-1.5 text-xs font-mono
                text-pm-text placeholder-pm-muted/60
                outline-none rounded
                focus:bg-pm-raised focus:outline-1 focus:outline-orange/50
                disabled:opacity-40 transition-colors
              "
            />
          </div>

          {/* Delete */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => handleDelete(pair.id)}
              title="Remove"
              className="opacity-0 group-hover:opacity-100 text-pm-muted hover:text-red-400 transition-all text-base leading-none"
            >
              ×
            </button>
          </div>
        </div>
      ))}

      {/* Add row */}
      <button
        type="button"
        onClick={() => onChange([...pairs, newRow()])}
        className="flex items-center gap-1.5 mt-1.5 ml-3 text-xs text-pm-muted hover:text-orange transition-colors py-1"
      >
        <span className="text-sm leading-none font-light">+</span>
        Add row
      </button>
    </div>
  );
}
