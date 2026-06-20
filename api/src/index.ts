import { router } from './router';
import { authenticate } from './middleware/auth';
import { errorResponse } from './shared/errors';
import { validateEnv, type Env } from './env';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = request.headers.get('cf-ray') ?? crypto.randomUUID();
    try {
      if (new URL(request.url).pathname === '/health') return await router.fetch(request, env, { sub: 'health' });
      validateEnv(env);
      const identity = authenticate(request);
      return await router.fetch(request, env, identity);
    } catch (error) {
      return errorResponse(error, requestId);
    }
  },
};
