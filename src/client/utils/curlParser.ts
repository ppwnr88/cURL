import type {
  HttpRequest,
  HttpMethod,
  KeyValuePair,
  RawContentType,
} from '../types/index';

// ─── Tokenizer ────────────────────────────────────────────────────────────────

/**
 * Tokenize a curl command string into an array of tokens.
 * Handles:
 *  - single-quoted strings (no escape processing inside)
 *  - double-quoted strings (with backslash-escape processing)
 *  - backslash escapes outside quotes
 *  - line continuation (trailing backslash before newline)
 */
export function tokenize(input: string): string[] {
  // Normalise line continuations: \ followed by newline → space
  const src = input.replace(/\\\n/g, ' ').replace(/\\\r\n/g, ' ');

  const tokens: string[] = [];
  let i = 0;

  while (i < src.length) {
    // Skip whitespace
    if (/\s/.test(src[i])) {
      i++;
      continue;
    }

    // Single-quoted string — no escaping inside
    if (src[i] === "'") {
      i++; // skip opening quote
      let token = '';
      while (i < src.length && src[i] !== "'") {
        token += src[i++];
      }
      i++; // skip closing quote
      tokens.push(token);
      continue;
    }

    // Double-quoted string — backslash escapes work inside
    if (src[i] === '"') {
      i++; // skip opening quote
      let token = '';
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\' && i + 1 < src.length) {
          i++;
          const esc = src[i];
          if (esc === 'n') token += '\n';
          else if (esc === 't') token += '\t';
          else if (esc === 'r') token += '\r';
          else token += esc;
        } else {
          token += src[i];
        }
        i++;
      }
      i++; // skip closing quote
      tokens.push(token);
      continue;
    }

    // Unquoted token (may include backslash escapes)
    let token = '';
    while (i < src.length && !/\s/.test(src[i])) {
      if (src[i] === '\\' && i + 1 < src.length) {
        i++;
        token += src[i];
      } else if (src[i] === "'" || src[i] === '"') {
        // Embedded quoted section — recurse inline
        const quote = src[i];
        i++;
        while (i < src.length && src[i] !== quote) {
          if (quote === '"' && src[i] === '\\' && i + 1 < src.length) {
            i++;
            token += src[i];
          } else {
            token += src[i];
          }
          i++;
        }
        i++; // closing quote
      } else {
        token += src[i];
      }
      i++;
    }
    if (token.length > 0) tokens.push(token);
  }

  return tokens;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newKV(key: string, value: string): KeyValuePair {
  return { id: crypto.randomUUID(), key, value, enabled: true };
}

function emptyKV(): KeyValuePair {
  return { id: crypto.randomUUID(), key: '', value: '', enabled: true };
}

/** Flags that take one argument */
const ONE_ARG_FLAGS = new Set([
  '-X', '--request',
  '-H', '--header',
  '-d', '--data', '--data-raw', '--data-ascii', '--data-binary', '--data-urlencode',
  '-F', '--form', '--form-string',
  '-u', '--user',
  '-A', '--user-agent',
  '-e', '--referer',
  '--url',
  '-m', '--max-time',
  '--connect-timeout',
  '-o', '--output',
  '--json',
  '--compressed',
  '--cacert', '--cert', '--key',
  '--proxy', '-x',
  '--dns-servers',
  '-b', '--cookie',
  '--cookie-jar', '-c',
]);

/** Flags that take no argument (boolean flags to ignore) */
const ZERO_ARG_FLAGS = new Set([
  '-G', '--get',
  '-I', '--head',
  '-L', '--location',
  '-s', '--silent',
  '-S', '--show-error',
  '-v', '--verbose',
  '-k', '--insecure',
  '--http1.0', '--http1.1', '--http2', '--http3',
  '-i', '--include',
  '--no-keepalive',
  '--fail', '-f',
  '--ipv4', '-4',
  '--ipv6', '-6',
  '--tlsv1', '--tlsv1.1', '--tlsv1.2', '--tlsv1.3',
  '--no-alpn',
  '--compressed',
  '--digest',
  '--basic',
  '--ntlm',
  '--path-as-is',
  '--tr-encoding',
  '--disable-epsv',
  '--ftp-pasv',
  '--head',
]);

// Flags whose argument can be glued: -XPOST or -H"foo" etc.
const GLUE_FLAGS = new Set(['-X', '-H', '-d', '-F', '-u', '-A', '-e', '-b', '-m', '-x']);

// ─── Parser ──────────────────────────────────────────────────────────────────

export interface ParseError {
  message: string;
}

export type ParseResult =
  | { ok: true; request: HttpRequest }
  | { ok: false; error: string };

export function parseCurl(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'Empty input' };

  let tokens = tokenize(trimmed);

  // Must start with curl (possibly a path like /usr/bin/curl)
  if (tokens.length === 0) return { ok: false, error: 'Empty input' };
  if (!/(?:^|[/\\])curl$/.test(tokens[0])) {
    return { ok: false, error: 'Input must start with "curl"' };
  }
  tokens = tokens.slice(1);

  // ── Collect raw flag values ─────────────────────────────────────────────
  let explicitMethod: string | null = null;
  let urlToken: string | null = null;
  const rawHeaders: string[] = [];
  const rawData: string[] = [];         // --data / -d / --data-raw / --data-ascii
  const rawDataBinary: string[] = [];   // --data-binary
  const urlencodedArgs: string[] = [];  // --data-urlencode
  const formArgs: string[] = [];        // -F / --form
  let jsonBody: string | null = null;   // --json
  let userAuth: string | null = null;   // -u / --user
  let userAgent: string | null = null;
  let isHeadFlag = false;
  let isGetFlag = false;

  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];

    // Handle --flag=value style
    const eqMatch = tok.match(/^(--[\w-]+)=(.*)$/s);
    if (eqMatch) {
      const flag = eqMatch[1];
      const val = eqMatch[2];
      consumeFlag(flag, val);
      i++;
      continue;
    }

    // Handle glued short flags like -XPOST or -H"..."
    if (tok.length > 2 && tok[0] === '-' && tok[1] !== '-') {
      const shortFlag = tok.slice(0, 2);
      if (GLUE_FLAGS.has(shortFlag)) {
        const val = tok.slice(2);
        consumeFlag(shortFlag, val);
        i++;
        continue;
      }
    }

    if (tok === '--') {
      // Everything after -- is a URL
      if (i + 1 < tokens.length) urlToken = tokens[i + 1];
      break;
    }

    if (tok.startsWith('-')) {
      if (tok === '-I' || tok === '--head') {
        isHeadFlag = true;
        i++;
        continue;
      }
      if (tok === '-G' || tok === '--get') {
        isGetFlag = true;
        i++;
        continue;
      }
      if (ZERO_ARG_FLAGS.has(tok)) {
        i++;
        continue;
      }
      if (ONE_ARG_FLAGS.has(tok)) {
        const val = tokens[i + 1] ?? '';
        consumeFlag(tok, val);
        i += 2;
        continue;
      }
      // Unknown flag — try to skip it (peek if next looks like a flag too)
      if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
        i += 2; // skip flag + its likely argument
      } else {
        i++;
      }
      continue;
    }

    // Non-flag token → URL
    if (urlToken === null) {
      urlToken = tok;
    }
    i++;
  }

  function consumeFlag(flag: string, val: string) {
    switch (flag) {
      case '-X': case '--request': explicitMethod = val.toUpperCase(); break;
      case '-H': case '--header': rawHeaders.push(val); break;
      case '-d': case '--data': case '--data-ascii': rawData.push(val); break;
      case '--data-raw': rawData.push(val); break;
      case '--data-binary': rawDataBinary.push(val); break;
      case '--data-urlencode': urlencodedArgs.push(val); break;
      case '-F': case '--form': case '--form-string': formArgs.push(val); break;
      case '--json': jsonBody = val; break;
      case '-u': case '--user': userAuth = val; break;
      case '-A': case '--user-agent': userAgent = val; break;
      case '--url': urlToken = val; break;
    }
  }

  if (!urlToken) return { ok: false, error: 'No URL found in curl command' };

  // ── Parse URL (strip query params → params table) ───────────────────────
  let parsedUrl = urlToken;
  const params: KeyValuePair[] = [];

  try {
    // Handle URLs without protocol for URL parsing
    const urlForParsing = parsedUrl.startsWith('http') ? parsedUrl : `https://${parsedUrl}`;
    const u = new URL(urlForParsing);
    u.searchParams.forEach((v, k) => {
      params.push(newKV(k, v));
    });
    // Rebuild URL without query string
    parsedUrl = u.origin + u.pathname;
    if (!urlToken.startsWith('http')) {
      // Don't change scheme if none was given
      parsedUrl = u.host + u.pathname;
    }
  } catch {
    // If URL parsing fails, keep as-is and split manually
    const qIdx = parsedUrl.indexOf('?');
    if (qIdx !== -1) {
      const qs = parsedUrl.slice(qIdx + 1);
      parsedUrl = parsedUrl.slice(0, qIdx);
      qs.split('&').forEach((pair) => {
        const eqIdx = pair.indexOf('=');
        if (eqIdx === -1) {
          params.push(newKV(pair, ''));
        } else {
          params.push(newKV(
            decodeURIComponent(pair.slice(0, eqIdx)),
            decodeURIComponent(pair.slice(eqIdx + 1)),
          ));
        }
      });
    }
  }

  params.push(emptyKV()); // trailing empty row

  // ── Parse headers ────────────────────────────────────────────────────────
  const headers: KeyValuePair[] = [];
  let contentTypeHeader: string | null = null;

  // Check for user-agent flag
  if (userAgent) {
    rawHeaders.push(`User-Agent: ${userAgent}`);
  }

  for (const raw of rawHeaders) {
    const colonIdx = raw.indexOf(':');
    if (colonIdx === -1) continue;
    const key = raw.slice(0, colonIdx).trim();
    const value = raw.slice(colonIdx + 1).trim();
    if (key.toLowerCase() === 'content-type') {
      contentTypeHeader = value;
      // Still add to headers table
    }
    headers.push(newKV(key, value));
  }
  headers.push(emptyKV());

  // ── Auth detection ───────────────────────────────────────────────────────
  // Check for Authorization header → detect bearer/apikey
  let auth: HttpRequest['auth'] = { type: 'none' };

  const resolvedUserAuth = userAuth as unknown as string;
  if (resolvedUserAuth) {
    const colonIdx = resolvedUserAuth.indexOf(':');
    const username = colonIdx === -1 ? resolvedUserAuth : resolvedUserAuth.slice(0, colonIdx);
    const password = colonIdx === -1 ? '' : resolvedUserAuth.slice(colonIdx + 1);
    auth = { type: 'basic', username, password };
  } else {
    // Scan headers for Authorization
    const authHeader = rawHeaders.find((h) => h.toLowerCase().startsWith('authorization:'));
    if (authHeader) {
      const value = authHeader.slice(authHeader.indexOf(':') + 1).trim();
      if (value.toLowerCase().startsWith('bearer ')) {
        auth = { type: 'bearer', token: value.slice(7).trim() };
        // Remove from headers table (it's now in auth)
        const idx = headers.findIndex(
          (h) => h.key.toLowerCase() === 'authorization'
        );
        if (idx !== -1) headers.splice(idx, 1);
      }
    }
  }

  // ── Body parsing ─────────────────────────────────────────────────────────
  let bodyType: HttpRequest['body']['type'] = 'none';
  let rawContent = '';
  let rawContentType: RawContentType = 'application/json';
  const formData: KeyValuePair[] = [];
  const urlencoded: KeyValuePair[] = [];

  if (jsonBody !== null) {
    bodyType = 'raw';
    rawContent = jsonBody;
    rawContentType = 'application/json';
  } else if (formArgs.length > 0) {
    bodyType = 'form-data';
    for (const f of formArgs) {
      const eqIdx = f.indexOf('=');
      if (eqIdx === -1) {
        formData.push(newKV(f, ''));
      } else {
        formData.push(newKV(f.slice(0, eqIdx), f.slice(eqIdx + 1)));
      }
    }
    formData.push(emptyKV());
  } else if (urlencodedArgs.length > 0) {
    bodyType = 'urlencoded';
    for (const arg of urlencodedArgs) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx === -1) {
        urlencoded.push(newKV(arg, ''));
      } else {
        urlencoded.push(newKV(arg.slice(0, eqIdx), arg.slice(eqIdx + 1)));
      }
    }
    urlencoded.push(emptyKV());
  } else if (rawData.length > 0 || rawDataBinary.length > 0) {
    const combined = [...rawData, ...rawDataBinary].join('');
    bodyType = 'raw';
    rawContent = combined;

    // Determine content type
    if (contentTypeHeader) {
      const ct = contentTypeHeader.toLowerCase();
      if (ct.includes('application/json') || ct.includes('json')) {
        rawContentType = 'application/json';
      } else if (ct.includes('application/xml') || ct.includes('text/xml')) {
        rawContentType = 'application/xml';
      } else if (ct.includes('text/html')) {
        rawContentType = 'text/html';
      } else {
        rawContentType = 'text/plain';
      }
    } else {
      // Auto-detect from content
      const trimmedBody = combined.trim();
      if (
        (trimmedBody.startsWith('{') && trimmedBody.endsWith('}')) ||
        (trimmedBody.startsWith('[') && trimmedBody.endsWith(']'))
      ) {
        rawContentType = 'application/json';
        // Try to pretty-print JSON
        try {
          rawContent = JSON.stringify(JSON.parse(combined), null, 2);
        } catch {
          // keep as-is
        }
      } else if (trimmedBody.startsWith('<')) {
        rawContentType = 'application/xml';
      } else {
        rawContentType = 'text/plain';
      }
    }

    // Remove Content-Type from headers table if it's now encoded in body type
    // (keep it visible since user may want to edit it)
  }

  if (formData.length === 0) formData.push(emptyKV());
  if (urlencoded.length === 0) urlencoded.push(emptyKV());

  // ── Determine method ─────────────────────────────────────────────────────
  let method: HttpMethod;

  if (isHeadFlag) {
    method = 'HEAD';
  } else if (isGetFlag) {
    method = 'GET';
  } else if (explicitMethod) {
    const upper = explicitMethod.toUpperCase() as HttpMethod;
    const valid: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    method = valid.includes(upper) ? upper : 'GET';
  } else if (bodyType !== 'none') {
    method = 'POST'; // infer POST when body data present
  } else {
    method = 'GET';
  }

  const request: HttpRequest = {
    method,
    url: parsedUrl,
    params,
    headers,
    body: {
      type: bodyType,
      rawContent,
      rawContentType,
      formData,
      urlencoded,
    },
    auth,
  };

  return { ok: true, request };
}
