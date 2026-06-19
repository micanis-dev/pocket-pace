import type { D1Migration } from '@cloudflare/vitest-pool-workers';

declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      AUTH0_DOMAIN: string;
      AUTH0_AUDIENCE: string;
      DEV_AUTH_BYPASS: string;
      DEV_AUTH_SUB: string;
      DEV_AUTH_EMAIL: string;
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

export {};
