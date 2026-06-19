import { z } from 'zod';

export interface Env {
  DB: D1Database;
  AUTH0_DOMAIN: string;
  AUTH0_AUDIENCE: string;
  DEV_AUTH_BYPASS?: string;
  DEV_AUTH_SUB?: string;
  DEV_AUTH_EMAIL?: string;
}

const configSchema = z.object({
  AUTH0_DOMAIN: z.string().min(1),
  AUTH0_AUDIENCE: z.string().min(1),
});

export function validateEnv(env: Env): void {
  if (env.DEV_AUTH_BYPASS !== 'true') configSchema.parse(env);
}
