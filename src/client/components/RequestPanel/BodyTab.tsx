import { KeyValueTable } from '../KeyValueTable';
import type { BodyType, RawContentType, RequestBody } from '../../types/index';

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: 'none',      label: 'none'                  },
  { value: 'raw',       label: 'raw'                   },
  { value: 'form-data', label: 'form-data'              },
  { value: 'urlencoded', label: 'x-www-form-urlencoded' },
];

const RAW_CONTENT_TYPES: { value: RawContentType; label: string }[] = [
  { value: 'application/json', label: 'JSON'  },
  { value: 'text/plain',       label: 'Text'  },
  { value: 'application/xml',  label: 'XML'   },
  { value: 'text/html',        label: 'HTML'  },
];

interface Props {
  body: RequestBody;
  onChange: (body: RequestBody) => void;
}

export function BodyTab({ body, onChange }: Props) {
  return (
    <div>
      {/* ── Type selector ───────────────────────────────── */}
      <div className="flex items-center gap-1 px-4 py-2.5 border-b border-pm-line flex-wrap">
        {BODY_TYPES.map((bt) => {
          const active = body.type === bt.value;
          return (
            <label key={bt.value} className="flex items-center gap-1.5 cursor-pointer mr-2">
              <input
                type="radio"
                name="body-type"
                value={bt.value}
                checked={active}
                onChange={() => onChange({ ...body, type: bt.value })}
                className="w-3.5 h-3.5 cursor-pointer"
              />
              <span className={`text-xs transition-colors ${active ? 'text-pm-text' : 'text-pm-sub hover:text-pm-text'}`}>
                {bt.label}
              </span>
            </label>
          );
        })}

        {/* Content-type dropdown for raw */}
        {body.type === 'raw' && (
          <div className="relative ml-1">
            <select
              value={body.rawContentType}
              onChange={(e) => onChange({ ...body, rawContentType: e.target.value as RawContentType })}
              className="bg-pm-raised border border-pm-border rounded pl-2.5 pr-6 py-0.5 text-xs text-pm-sub hover:text-pm-text hover:border-pm-active focus:border-orange outline-none transition-colors cursor-pointer"
            >
              {RAW_CONTENT_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-pm-muted text-[10px]">▾</span>
          </div>
        )}
      </div>

      {/* ── Body content ────────────────────────────────── */}
      <div className="p-3">
        {body.type === 'none' && (
          <p className="text-xs text-pm-muted italic py-4 text-center">
            This request does not have a body.
          </p>
        )}

        {body.type === 'raw' && (
          <textarea
            value={body.rawContent}
            onChange={(e) => onChange({ ...body, rawContent: e.target.value })}
            placeholder={body.rawContentType === 'application/json' ? '{\n  "key": "value"\n}' : 'Enter request body…'}
            spellCheck={false}
            className="
              w-full h-36 bg-pm-raised border border-pm-border rounded
              px-3 py-2.5 text-xs font-mono text-pm-text placeholder-pm-muted
              outline-none focus:border-orange hover:border-pm-active
              transition-colors resize-y leading-relaxed
            "
          />
        )}

        {body.type === 'form-data' && (
          <KeyValueTable
            pairs={body.formData}
            onChange={(formData) => onChange({ ...body, formData })}
            keyPlaceholder="field name"
            valuePlaceholder="value"
          />
        )}

        {body.type === 'urlencoded' && (
          <KeyValueTable
            pairs={body.urlencoded}
            onChange={(urlencoded) => onChange({ ...body, urlencoded })}
            keyPlaceholder="key"
            valuePlaceholder="value"
          />
        )}
      </div>
    </div>
  );
}
