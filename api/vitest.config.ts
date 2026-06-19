import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';

const migrations = await readD1Migrations('./migrations');

export default defineConfig({
  plugins: [cloudflareTest({
    wrangler: { configPath: './wrangler.jsonc' },
    miniflare: {
      bindings: {
        AUTH0_DOMAIN: 'test.auth0.com', AUTH0_AUDIENCE: 'https://test-api',
        DEV_AUTH_BYPASS: 'true', DEV_AUTH_SUB: 'test-user', DEV_AUTH_EMAIL: 'test@example.com',
        TEST_MIGRATIONS: migrations,
      },
    },
  })],
  test: { globals: true, restoreMocks: true },
});
