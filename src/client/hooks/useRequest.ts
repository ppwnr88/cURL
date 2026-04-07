import { useState, useCallback } from 'react';
import type { HttpRequest, HttpResponse } from '../types/index';

interface UseRequestReturn {
  response: HttpResponse | null;
  loading: boolean;
  error: string | null;
  send: (request: HttpRequest) => Promise<void>;
}

export function useRequest(): UseRequestReturn {
  const [response, setResponse] = useState<HttpResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (request: HttpRequest): Promise<void> => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const apiUrl = (import.meta.env.VITE_API_URL as string) || '';
      const res = await fetch(`${apiUrl}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data: unknown = await res.json();

      if (!res.ok) {
        const errData = data as { error?: string };
        setError(errData.error ?? `Server error: ${res.status}`);
        return;
      }

      setResponse(data as HttpResponse);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error — is the server running?';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { response, loading, error, send };
}
