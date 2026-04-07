interface Props {
  headers: Record<string, string>;
}

export function ResponseHeaders({ headers }: Props) {
  const entries = Object.entries(headers);

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-pm-muted italic text-xs">
        No response headers
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-pm-border sticky top-0 bg-pm-panel">
            <th className="text-left font-medium text-pm-muted uppercase tracking-wider px-4 py-2 w-2/5">Header</th>
            <th className="text-left font-medium text-pm-muted uppercase tracking-wider px-4 py-2">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value], idx) => (
            <tr
              key={key}
              className={`border-b border-pm-line hover:bg-pm-hover/40 transition-colors ${idx % 2 === 1 ? 'bg-pm-panel/30' : ''}`}
            >
              <td className="px-4 py-2 font-mono text-orange/90 align-top select-all whitespace-nowrap">{key}</td>
              <td className="px-4 py-2 font-mono text-pm-sub break-all select-all">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
