/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_API_BASE_URL?: string;
  readonly PUBLIC_APP_BASE_URL?: string;
  readonly PUBLIC_AUTH0_DOMAIN?: string;
  readonly PUBLIC_AUTH0_CLIENT_ID?: string;
  readonly PUBLIC_AUTH0_AUDIENCE?: string;
  readonly PUBLIC_ALLOW_DEMO_LOGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
