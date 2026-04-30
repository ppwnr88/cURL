import { useState } from 'react';
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

function beautifyJson(content: string): string {
  return JSON.stringify(JSON.parse(content), null, 2);
}

function beautifyMarkup(content: string): string {
  const normalized = content
    .replace(/>\s+</g, '><')
    .replace(/</g, '\n<')
    .replace(/>/g, '>\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let indent = 0;
  return normalized
    .map((line) => {
      const isClosingTag = /^<\//.test(line);
      const isOpeningTag = /^<[^!?/][^>]*[^/]?>$/.test(line);
      const isInlineTag = /^<[^>]+>[^<]+<\/[^>]+>$/.test(line);

      if (isClosingTag) {
        indent = Math.max(indent - 1, 0);
      }

      const formatted = `${'  '.repeat(indent)}${line}`;

      if (isOpeningTag && !isInlineTag) {
        indent += 1;
      }

      return formatted;
    })
    .join('\n');
}

function beautifyRawBody(content: string, contentType: RawContentType): string {
  if (contentType === 'application/json') {
    return beautifyJson(content);
  }

  if (contentType === 'application/xml' || contentType === 'text/html') {
    return beautifyMarkup(content);
  }

  return content;
}

function getBeautifyLabel(contentType: RawContentType): string {
  if (contentType === 'application/json') return 'Beautify JSON';
  if (contentType === 'application/xml') return 'Beautify XML';
  if (contentType === 'text/html') return 'Beautify HTML';
  return 'Beautify';
}

export function BodyTab({ body, onChange }: Props) {
  const [beautifyError, setBeautifyError] = useState<string | null>(null);
  const canBeautify =
    body.type === 'raw' &&
    body.rawContent.trim() !== '' &&
    body.rawContentType !== 'text/plain';

  const handleBeautify = () => {
    if (!canBeautify) return;

    try {
      const rawContent = beautifyRawBody(body.rawContent, body.rawContentType);
      onChange({ ...body, rawContent });
      setBeautifyError(null);
    } catch {
      setBeautifyError(`Invalid ${body.rawContentType === 'application/json' ? 'JSON' : 'body'} - cannot beautify.`);
    }
  };

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
          <div className="ml-1 flex items-center gap-2">
            <div className="relative">
              <select
                value={body.rawContentType}
                onChange={(e) => {
                  onChange({ ...body, rawContentType: e.target.value as RawContentType });
                  setBeautifyError(null);
                }}
                className="bg-pm-raised border border-pm-border rounded pl-2.5 pr-6 py-0.5 text-xs text-pm-sub hover:text-pm-text hover:border-pm-active focus:border-orange outline-none transition-colors cursor-pointer"
              >
                {RAW_CONTENT_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>{ct.label}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-pm-muted text-[10px]">▾</span>
            </div>

            <button
              type="button"
              onClick={handleBeautify}
              disabled={!canBeautify}
              title={body.rawContentType === 'text/plain' ? 'Beautify supports JSON, XML, and HTML bodies' : getBeautifyLabel(body.rawContentType)}
              className="
                rounded border border-pm-border px-2.5 py-0.5 text-xs text-pm-sub
                transition-colors hover:border-pm-active hover:text-pm-text
                disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-pm-border disabled:hover:text-pm-sub
              "
            >
              Beautify
            </button>
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
          <>
            <textarea
              value={body.rawContent}
              onChange={(e) => {
                onChange({ ...body, rawContent: e.target.value });
                setBeautifyError(null);
              }}
              placeholder={body.rawContentType === 'application/json' ? '{\n  "key": "value"\n}' : 'Enter request body…'}
              spellCheck={false}
              className="
                w-full h-36 bg-pm-raised border border-pm-border rounded
                px-3 py-2.5 text-xs font-mono text-pm-text placeholder-pm-muted
                outline-none focus:border-orange hover:border-pm-active
                transition-colors resize-y leading-relaxed
              "
            />
            {beautifyError && (
              <p className="mt-2 text-xs text-red-400">
                {beautifyError}
              </p>
            )}
          </>
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
