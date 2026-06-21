export interface Env {
  DB: D1Database;
  AUTH_SESSION_SECRET?: string;
  AUTH_MODE?: string;
}

export function validateEnv(env: Env): void {
  if (!env.DB) throw new Error('DB binding is required');
  if ((env.AUTH_MODE ?? 'local') !== 'local' && !env.AUTH_SESSION_SECRET) {
    throw new Error('AUTH_SESSION_SECRET is required when AUTH_MODE is not local');
  }
}
