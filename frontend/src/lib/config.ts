const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const config = {
  apiBaseUrl: trimTrailingSlash(import.meta.env.PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8787'),
  appBaseUrl: trimTrailingSlash(import.meta.env.PUBLIC_APP_BASE_URL ?? 'http://127.0.0.1:4321'),
  auth0Domain: import.meta.env.PUBLIC_AUTH0_DOMAIN?.trim() || '',
  auth0ClientId: import.meta.env.PUBLIC_AUTH0_CLIENT_ID?.trim() || '',
  auth0Audience: import.meta.env.PUBLIC_AUTH0_AUDIENCE?.trim() || '',
  allowDemoLogin: (import.meta.env.PUBLIC_ALLOW_DEMO_LOGIN ?? 'true') === 'true',
};

export const hasAuth0Config = () =>
  Boolean(config.auth0Domain && config.auth0ClientId && config.auth0Audience);
