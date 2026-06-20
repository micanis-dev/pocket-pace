export interface Env {
  DB: D1Database;
}

export function validateEnv(env: Env): void {
  if (!env.DB) throw new Error('DB binding is required');
}
