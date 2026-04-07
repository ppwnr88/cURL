import { Router, type Request, type Response } from 'express';
import { executeRequestUseCase } from '../../application/executeRequest.usecase.js';
import type { HttpRequest } from '../../domain/types.js';

const router = Router();

router.post('/execute', async (req: Request, res: Response): Promise<void> => {
  const httpRequest = req.body as HttpRequest;

  if (!httpRequest || typeof httpRequest !== 'object') {
    res.status(400).json({ error: 'Request body must be a valid JSON object' });
    return;
  }

  try {
    const result = await executeRequestUseCase(httpRequest);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';

    if (
      message === 'URL is required' ||
      message.startsWith('URL must start with')
    ) {
      res.status(400).json({ error: message });
      return;
    }

    // curl process errors (network unreachable, timeout, etc.)
    res.status(502).json({ error: message });
  }
});

export default router;
