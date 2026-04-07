import type { IncomingMessage, ServerResponse } from 'http';

// ─── Types (mirrors src/server/domain/types.ts) ───────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
type BodyType = 'none' | 'raw' | 'form-data' | 'urlencoded';
type AuthType = 'none' | 'bearer' | 'basic' | 'apikey';

interface KeyValuePair { id: string; key: string; value: string; enabled: boolean; }

interface HttpRequest {
  method: HttpMethod;
  url: string;
  params: KeyValuePair[];
  headers: KeyValuePair[];
  body: {
    type: BodyType;
    rawContent: string;
    rawContentType: string;
    formData: KeyValuePair[];
    urlencoded: KeyValuePair[];
  };
  auth: {
    type: AuthType;
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyName?: string;
    apiKeyLocation?: 'header' | 'query';
  };
}

interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
  size: number;
  curlCommand: string;
}

// ─── URL builder ─────────────────────────────────────────────────────────────

function buildUrl(request: HttpRequest): string {
  let url = request.url;
  const params = request.params.filter((p) => p.enabled && p.key.trim());

  if (request.auth.type === 'apikey' && request.auth.apiKeyLocation === 'query' && request.auth.apiKeyName && request.auth.apiKey) {
    params.push({ id: '', key: request.auth.apiKeyName, value: request.auth.apiKey, enabled: true });
  }

  if (params.length > 0) {
    const qs = params.map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
    url += (url.includes('?') ? '&' : '?') + qs;
  }
  return url;
}

// ─── Curl command display builder ────────────────────────────────────────────

function buildCurlCommand(request: HttpRequest): string {
  const parts: string[] = ['curl'];
  parts.push(`-X ${request.method}`);

  if (request.auth.type === 'bearer' && request.auth.token)
    parts.push(`-H "Authorization: Bearer ${request.auth.token}"`);
  else if (request.auth.type === 'basic' && request.auth.username)
    parts.push(`--user "${request.auth.username}:${request.auth.password ?? ''}"`);
  else if (request.auth.type === 'apikey' && request.auth.apiKeyLocation === 'header' && request.auth.apiKeyName && request.auth.apiKey)
    parts.push(`-H "${request.auth.apiKeyName}: ${request.auth.apiKey}"`);

  for (const h of request.headers)
    if (h.enabled && h.key.trim()) parts.push(`-H "${h.key}: ${h.value}"`);

  if (request.body.type === 'raw' && request.body.rawContent) {
    parts.push(`-H "Content-Type: ${request.body.rawContentType}"`);
    parts.push(`--data-raw '${request.body.rawContent.replace(/'/g, "'\\''")}'`);
  } else if (request.body.type === 'form-data') {
    for (const f of request.body.formData)
      if (f.enabled && f.key.trim()) parts.push(`--form "${f.key}=${f.value}"`);
  } else if (request.body.type === 'urlencoded') {
    for (const f of request.body.urlencoded)
      if (f.enabled && f.key.trim()) parts.push(`--data-urlencode "${f.key}=${f.value}"`);
  }

  parts.push(`'${buildUrl(request)}'`);
  return parts.join(' \\\n  ');
}

// ─── HTTP executor (native fetch — no curl binary needed) ────────────────────

async function executeHttpRequest(request: HttpRequest): Promise<HttpResponse> {
  const url = buildUrl(request);
  const startTime = Date.now();

  // Build headers
  const headers: Record<string, string> = {};

  if (request.auth.type === 'bearer' && request.auth.token) {
    headers['Authorization'] = `Bearer ${request.auth.token}`;
  } else if (request.auth.type === 'basic' && request.auth.username) {
    const creds = Buffer.from(`${request.auth.username}:${request.auth.password ?? ''}`).toString('base64');
    headers['Authorization'] = `Basic ${creds}`;
  } else if (request.auth.type === 'apikey' && request.auth.apiKeyLocation === 'header' && request.auth.apiKeyName && request.auth.apiKey) {
    headers[request.auth.apiKeyName] = request.auth.apiKey;
  }

  for (const h of request.headers) {
    if (h.enabled && h.key.trim()) headers[h.key] = h.value;
  }

  // Build body
  let fetchBody: BodyInit | undefined;
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  if (hasBody) {
    if (request.body.type === 'raw' && request.body.rawContent) {
      headers['Content-Type'] = request.body.rawContentType;
      fetchBody = request.body.rawContent;
    } else if (request.body.type === 'form-data') {
      const fd = new FormData();
      for (const f of request.body.formData)
        if (f.enabled && f.key.trim()) fd.append(f.key, f.value);
      fetchBody = fd;
    } else if (request.body.type === 'urlencoded') {
      const ps = new URLSearchParams();
      for (const f of request.body.urlencoded)
        if (f.enabled && f.key.trim()) ps.append(f.key, f.value);
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      fetchBody = ps.toString();
    }
  }

  // Execute
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 28000);

  const res = await fetch(url, {
    method: request.method,
    headers,
    body: fetchBody,
    signal: controller.signal,
    redirect: 'follow',
  });

  clearTimeout(timer);

  const duration = Date.now() - startTime;
  const bodyText = await res.text();
  const responseHeaders: Record<string, string> = {};
  res.headers.forEach((v, k) => { responseHeaders[k] = v; });
  const size = new TextEncoder().encode(bodyText).length;

  return {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
    body: bodyText,
    duration,
    size,
    curlCommand: buildCurlCommand(request),
  };
}

// ─── Vercel handler ──────────────────────────────────────────────────────────

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.statusCode = 200; res.end(); return; }
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const request = req.body as HttpRequest;

    if (!request?.url?.trim()) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'URL is required' }));
      return;
    }

    const response = await executeHttpRequest(request);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(response));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const isAbort = message.includes('abort') || message.includes('timed out');
    res.statusCode = isAbort ? 504 : 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: isAbort ? 'Request timed out' : message }));
  }
}
