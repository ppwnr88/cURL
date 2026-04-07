import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { HttpRequest, HttpResponse } from '../domain/types.js';

const execFileAsync = promisify(execFile);

const HTTP_STATUS_TEXTS: Record<number, string> = {
  100: 'Continue', 101: 'Switching Protocols', 200: 'OK', 201: 'Created',
  202: 'Accepted', 204: 'No Content', 301: 'Moved Permanently', 302: 'Found',
  304: 'Not Modified', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
  404: 'Not Found', 405: 'Method Not Allowed', 409: 'Conflict', 410: 'Gone',
  422: 'Unprocessable Entity', 429: 'Too Many Requests', 500: 'Internal Server Error',
  502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout',
};

function buildUrl(baseUrl: string, request: HttpRequest): string {
  let url = baseUrl;

  // Collect enabled query params (including apikey in query)
  const enabledParams = request.params.filter((p) => p.enabled && p.key.trim() !== '');

  if (
    request.auth.type === 'apikey' &&
    request.auth.apiKeyLocation === 'query' &&
    request.auth.apiKeyName &&
    request.auth.apiKey
  ) {
    enabledParams.push({
      id: 'auth-apikey',
      key: request.auth.apiKeyName,
      value: request.auth.apiKey,
      enabled: true,
    });
  }

  if (enabledParams.length > 0) {
    const separator = url.includes('?') ? '&' : '?';
    const queryString = enabledParams
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');
    url = `${url}${separator}${queryString}`;
  }

  return url;
}

export function buildCurlArgs(request: HttpRequest, bodyFile: string, headersFile: string): string[] {
  const args: string[] = [
    '-s',
    '-o', bodyFile,
    '-D', headersFile,
    '-w', '%{http_code}|%{time_total}|%{size_download}',
    '--max-time', '60',
  ];

  // Method
  args.push('-X', request.method);

  // Auth headers / flags
  if (request.auth.type === 'bearer' && request.auth.token) {
    args.push('-H', `Authorization: Bearer ${request.auth.token}`);
  } else if (request.auth.type === 'basic' && request.auth.username) {
    const pw = request.auth.password ?? '';
    args.push('--user', `${request.auth.username}:${pw}`);
  } else if (
    request.auth.type === 'apikey' &&
    request.auth.apiKeyLocation === 'header' &&
    request.auth.apiKeyName &&
    request.auth.apiKey
  ) {
    args.push('-H', `${request.auth.apiKeyName}: ${request.auth.apiKey}`);
  }

  // User-defined headers
  for (const header of request.headers) {
    if (header.enabled && header.key.trim() !== '') {
      args.push('-H', `${header.key}: ${header.value}`);
    }
  }

  // Body
  if (request.body.type === 'raw' && request.body.rawContent) {
    args.push('-H', `Content-Type: ${request.body.rawContentType}`);
    args.push('--data-raw', request.body.rawContent);
  } else if (request.body.type === 'form-data') {
    for (const field of request.body.formData) {
      if (field.enabled && field.key.trim() !== '') {
        args.push('--form', `${field.key}=${field.value}`);
      }
    }
  } else if (request.body.type === 'urlencoded') {
    for (const field of request.body.urlencoded) {
      if (field.enabled && field.key.trim() !== '') {
        args.push('--data-urlencode', `${field.key}=${field.value}`);
      }
    }
  }

  // URL (must be last)
  const finalUrl = buildUrl(request.url, request);
  args.push(finalUrl);

  return args;
}

export function buildReadableCurlCommand(request: HttpRequest): string {
  const parts: string[] = ['curl'];

  parts.push(`-X ${request.method}`);

  if (request.auth.type === 'bearer' && request.auth.token) {
    parts.push(`-H "Authorization: Bearer ${request.auth.token}"`);
  } else if (request.auth.type === 'basic' && request.auth.username) {
    const pw = request.auth.password ?? '';
    parts.push(`--user "${request.auth.username}:${pw}"`);
  } else if (
    request.auth.type === 'apikey' &&
    request.auth.apiKeyLocation === 'header' &&
    request.auth.apiKeyName &&
    request.auth.apiKey
  ) {
    parts.push(`-H "${request.auth.apiKeyName}: ${request.auth.apiKey}"`);
  }

  for (const header of request.headers) {
    if (header.enabled && header.key.trim() !== '') {
      parts.push(`-H "${header.key}: ${header.value}"`);
    }
  }

  if (request.body.type === 'raw' && request.body.rawContent) {
    parts.push(`-H "Content-Type: ${request.body.rawContentType}"`);
    const escaped = request.body.rawContent.replace(/'/g, "'\\''");
    parts.push(`--data-raw '${escaped}'`);
  } else if (request.body.type === 'form-data') {
    for (const field of request.body.formData) {
      if (field.enabled && field.key.trim() !== '') {
        parts.push(`--form "${field.key}=${field.value}"`);
      }
    }
  } else if (request.body.type === 'urlencoded') {
    for (const field of request.body.urlencoded) {
      if (field.enabled && field.key.trim() !== '') {
        parts.push(`--data-urlencode "${field.key}=${field.value}"`);
      }
    }
  }

  const finalUrl = buildUrl(request.url, request);
  parts.push(`'${finalUrl}'`);

  return parts.join(' \\\n  ');
}

function parseHeadersFile(content: string): { status: number; statusText: string; headers: Record<string, string> } {
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== '');

  let status = 0;
  let statusText = '';
  const headers: Record<string, string> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('HTTP/')) {
      // HTTP/1.1 200 OK  or  HTTP/2 200
      const match = line.match(/^HTTP\/[\d.]+ (\d+)\s*(.*)?$/);
      if (match) {
        status = parseInt(match[1], 10);
        statusText = match[2]?.trim() || HTTP_STATUS_TEXTS[status] || '';
      }
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const value = line.slice(colonIdx + 1).trim();
      headers[key] = value;
    }
  }

  if (!statusText) {
    statusText = HTTP_STATUS_TEXTS[status] || 'Unknown';
  }

  return { status, statusText, headers };
}

async function safeUnlink(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    // ignore cleanup errors
  }
}

export async function executeCurl(request: HttpRequest): Promise<HttpResponse> {
  const id = randomUUID();
  const bodyFile = join(tmpdir(), `curl-body-${id}.bin`);
  const headersFile = join(tmpdir(), `curl-headers-${id}.txt`);

  // Pre-create files so curl can write to them
  await writeFile(bodyFile, '');
  await writeFile(headersFile, '');

  const args = buildCurlArgs(request, bodyFile, headersFile);
  const curlCommand = buildReadableCurlCommand(request);

  try {
    const { stdout } = await execFileAsync('curl', args, {
      timeout: 65000,
      maxBuffer: 50 * 1024 * 1024, // 50 MB
    });

    // stdout = "http_code|time_total|size_download"
    const parts = stdout.trim().split('|');
    const httpCode = parseInt(parts[0] ?? '0', 10);
    const timeTotal = parseFloat(parts[1] ?? '0');
    const sizeDownload = parseInt(parts[2] ?? '0', 10);

    const headersContent = await readFile(headersFile, 'utf-8');
    const { status, statusText, headers } = parseHeadersFile(headersContent);

    // For HEAD requests or empty bodies, body may be empty
    let bodyContent = '';
    try {
      const bodyBuffer = await readFile(bodyFile);
      // Try UTF-8, fall back to latin1 for binary
      try {
        bodyContent = bodyBuffer.toString('utf-8');
        // Detect non-text content (high % of non-printable chars)
        const nonPrintable = (bodyContent.match(/[\x00-\x08\x0e-\x1f\x7f-\x9f]/g) || []).length;
        if (bodyBuffer.length > 0 && nonPrintable / bodyBuffer.length > 0.3) {
          bodyContent = `[Binary content: ${bodyBuffer.length} bytes — base64 omitted]`;
        }
      } catch {
        bodyContent = `[Binary content: ${bodyBuffer.length} bytes]`;
      }
    } catch {
      bodyContent = '';
    }

    const resolvedStatus = status || httpCode;
    const resolvedStatusText = statusText || HTTP_STATUS_TEXTS[resolvedStatus] || 'Unknown';

    return {
      status: resolvedStatus,
      statusText: resolvedStatusText,
      headers,
      body: bodyContent,
      duration: Math.round(timeTotal * 1000),
      size: sizeDownload,
      curlCommand,
    };
  } finally {
    await Promise.all([safeUnlink(bodyFile), safeUnlink(headersFile)]);
  }
}
