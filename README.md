# Pocket-Pace

周期ごとの使用限度額と「あといくら使えるか」を管理するアプリです。バックエンドは `api/` にある Cloudflare Workers API、フロントエンドは `frontend/` にある Astro アプリです。

## 開発環境

```sh
devbox install
devbox run install
devbox run check
devbox run test
```

ローカル D1 を初期化して API を起動します。

```sh
cd api
bun run db:migrate:local
bun run dev
```

Astro フロントエンドを起動する場合は別ターミナルで以下を実行します。

```sh
cd frontend
bun run dev
```

認証は `AUTH_MODE` で切り替える。ローカルではメールアドレス入力による簡易ログイン、preview / production では OIDC プロバイダ経由のログインを想定する。Astro は署名付き HTTP-only Cookie を発行し、API へは Bearer トークンとして中継する。開発環境では Wrangler が管理する local D1 を使い、preview / production ではそれぞれの remote D1 を使います。

フロントエンド側の `.env.example` には以下を設定します。

- `PUBLIC_API_BASE_URL`
- `PUBLIC_APP_BASE_URL`
- `PUBLIC_AUTH_MODE`
- `AUTH_MODE`
- `AUTH_SESSION_SECRET`
- `OIDC_ISSUER`
- `OIDC_CLIENT_ID`
- `OIDC_CLIENT_SECRET`
- `OIDC_AUTHORIZATION_ENDPOINT`
- `OIDC_TOKEN_ENDPOINT`
- `OIDC_USERINFO_ENDPOINT`

ローカルログイン画面では名前とメールアドレスを入れるだけで利用を開始できる。`AUTH_MODE=oidc` の場合は `/api/auth/start` から外部プロバイダへ遷移し、コールバック後に `/me/sync` へユーザーを同期する。

API仕様と業務ルールは [docs/api-design.md](docs/api-design.md) と [docs/business-rules.md](docs/business-rules.md) を参照してください。

preview / production へ出す場合は、`bun run db:migrate:preview` / `bun run db:migrate:production` を先に実行し、その後に `bun run deploy:preview` / `bun run deploy:production` を実行してください。詳細は [docs/deployment.md](docs/deployment.md) に記載しています。
frontend は Vercel にデプロイし、API は Cloudflare Workers にデプロイします。
