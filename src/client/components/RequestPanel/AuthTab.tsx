import type { AuthConfig, AuthType, ApiKeyLocation } from '../../types/index';

const AUTH_TYPES: { value: AuthType; label: string }[] = [
  { value: 'none',    label: 'No Auth'      },
  { value: 'bearer',  label: 'Bearer Token' },
  { value: 'basic',   label: 'Basic Auth'   },
  { value: 'apikey',  label: 'API Key'      },
];

interface Props {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}

const inputCls = `
  w-full bg-pm-raised border border-pm-border rounded
  px-3 py-2 text-xs font-mono text-pm-text placeholder-pm-muted
  outline-none focus:border-orange hover:border-pm-active transition-colors
`;

const labelCls = 'block text-[11px] font-medium text-pm-muted uppercase tracking-wider mb-1.5';

export function AuthTab({ auth, onChange }: Props) {
  return (
    <div className="p-4">
      {/* Type selector */}
      <div className="mb-5 flex items-center gap-3">
        <span className={labelCls} style={{ marginBottom: 0 }}>Type</span>
        <div className="relative">
          <select
            value={auth.type}
            onChange={(e) => onChange({ ...auth, type: e.target.value as AuthType })}
            className="bg-pm-raised border border-pm-border rounded pl-3 pr-8 py-1.5 text-xs text-pm-text hover:border-pm-active focus:border-orange outline-none transition-colors cursor-pointer"
          >
            {AUTH_TYPES.map((at) => (
              <option key={at.value} value={at.value}>{at.label}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-pm-muted text-[10px]">▾</span>
        </div>
      </div>

      {auth.type === 'none' && (
        <p className="text-xs text-pm-muted italic">No authentication will be sent with this request.</p>
      )}

      {auth.type === 'bearer' && (
        <div>
          <label className={labelCls}>Token</label>
          <input
            type="text"
            value={auth.token ?? ''}
            onChange={(e) => onChange({ ...auth, token: e.target.value })}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
            className={inputCls}
            autoComplete="off"
          />
          <p className="text-[11px] text-pm-muted mt-2">
            Sends as: <code className="font-mono text-pm-sub">Authorization: Bearer &lt;token&gt;</code>
          </p>
        </div>
      )}

      {auth.type === 'basic' && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={labelCls}>Username</label>
            <input type="text" value={auth.username ?? ''} onChange={(e) => onChange({ ...auth, username: e.target.value })} placeholder="username" className={inputCls} autoComplete="off" />
          </div>
          <div className="flex-1">
            <label className={labelCls}>Password</label>
            <input type="password" value={auth.password ?? ''} onChange={(e) => onChange({ ...auth, password: e.target.value })} placeholder="password" className={inputCls} autoComplete="off" />
          </div>
        </div>
      )}

      {auth.type === 'apikey' && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelCls}>Key Name</label>
              <input type="text" value={auth.apiKeyName ?? ''} onChange={(e) => onChange({ ...auth, apiKeyName: e.target.value })} placeholder="X-API-Key" className={inputCls} autoComplete="off" />
            </div>
            <div className="flex-1">
              <label className={labelCls}>Value</label>
              <input type="text" value={auth.apiKey ?? ''} onChange={(e) => onChange({ ...auth, apiKey: e.target.value })} placeholder="your-api-key" className={inputCls} autoComplete="off" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Add to</label>
            <div className="flex gap-4">
              {(['header', 'query'] as ApiKeyLocation[]).map((loc) => (
                <label key={loc} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="apikey-location"
                    value={loc}
                    checked={(auth.apiKeyLocation ?? 'header') === loc}
                    onChange={() => onChange({ ...auth, apiKeyLocation: loc })}
                    className="w-3.5 h-3.5"
                  />
                  <span className="text-xs text-pm-sub capitalize">{loc}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
