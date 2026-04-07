import { executeCurl } from '../infrastructure/curlExecutor.js';
import type { HttpRequest, HttpResponse } from '../domain/types.js';

export async function executeRequestUseCase(request: HttpRequest): Promise<HttpResponse> {
  if (!request.url || request.url.trim() === '') {
    throw new Error('URL is required');
  }

  const urlTrimmed = request.url.trim();
  if (!urlTrimmed.startsWith('http://') && !urlTrimmed.startsWith('https://')) {
    throw new Error('URL must start with http:// or https://');
  }

  const normalizedRequest: HttpRequest = {
    ...request,
    url: urlTrimmed,
    params: request.params ?? [],
    headers: request.headers ?? [],
    body: request.body ?? {
      type: 'none',
      rawContent: '',
      rawContentType: 'application/json',
      formData: [],
      urlencoded: [],
    },
    auth: request.auth ?? { type: 'none' },
  };

  return executeCurl(normalizedRequest);
}
