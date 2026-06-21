# デプロイとマイグレーション

Pocket-Pace の API は Cloudflare Workers、DB は Cloudflare D1 を前提とする。
`api/wrangler.jsonc` では `local`、`preview`、`production` の 3 環境を定義する。加えて top-level の local D1 定義を残し、Vitest と Wrangler tooling の既定参照先として使う。

## ローカル実行

```sh
devbox install
devbox run install
cp frontend/.env.example frontend/.env
cd api
bun run db:migrate:local
bun run dev
```

別ターミナルでフロントを起動する。

```sh
cd frontend
bun run dev
```

ローカル D1 の実体は `api/.wrangler/` 以下に作成される。初期化したい場合は、この状態を削除してから再度 migration を適用する。

## Wrangler 構成

現行の `api/wrangler.jsonc` は次の 3 系統を持つ。

- `env.local`: local 開発用 `pocket-pace-local`
- `env.preview`: preview 用 `pocket-pace-preview`
- `env.production`: 本番用 `pocket-pace-production`
- top-level `d1_databases`: test / tooling 互換用の local D1

構成イメージ:

```jsonc
{
  "name": "pocket-pace-api",
  "main": "src/index.ts",
  "compatibility_date": "2026-06-19",
  "env": {
    "local": {
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "pocket-pace-local",
          "migrations_dir": "migrations",
          "remote": false
        }
      ]
    },
    "preview": {
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "pocket-pace-preview",
          "database_id": "PREVIEW_DATABASE_ID",
          "migrations_dir": "migrations"
        }
      ]
    },
    "production": {
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "pocket-pace-production",
          "database_id": "PRODUCTION_DATABASE_ID",
          "migrations_dir": "migrations"
        }
      ]
    }
  }
}
```

`database_id` は Cloudflare 側で作成した D1 から取得する。Binding 名は local / preview / production で常に `DB` のまま揃える。

## preview / production migration

アプリのコードが新しいカラムを使う場合、deploy 前に remote D1 へ migration を適用する。
今回の `user_settings.default_payment_method` 追加もこれに該当する。

preview:

```sh
cd api
bun run db:migrate:preview
```

production:

```sh
cd api
bun run db:migrate:production
```

## 本番 deploy 手順

順序は固定する。

1. `api/src/db/schema.ts` の変更を含むコードを確認する
2. `api/migrations/` に生成済み migration があることを確認する
3. preview の remote D1 へ migration を適用する
4. preview の Worker を deploy する
5. preview で動作確認する
6. production の remote D1 へ migration を適用する
7. production の Worker を deploy する

例:

```sh
cd api
bun run db:migrate:preview
bun run deploy:preview

bun run db:migrate:production
bun run deploy:production
```

migration 未適用のまま新コードだけを本番へ出すと、今回のように `no such column` で 500 になる。

## 品質確認

```sh
devbox run check
devbox run test
```

## 認証モード

認証は `AUTH_MODE` で切り替える。

- `local`: ローカル開発用。メールアドレス入力でログインし、署名付きCookieを発行する
- `oidc`: preview / production 用。OIDC provider の Authorization Code + PKCE でログインし、署名付きCookieを発行する

API は `Authorization: Bearer <session-token>` を優先して検証する。`AUTH_MODE=local` のときだけ `x-pocket-pace-user` ヘッダも受け付ける。

## 本番用の環境変数

frontend:

```sh
PUBLIC_API_BASE_URL=https://api.example.com
PUBLIC_APP_BASE_URL=https://YOUR_VERCEL_DOMAIN_OR_CUSTOM_DOMAIN
PUBLIC_AUTH_MODE=oidc
AUTH_MODE=oidc
AUTH_SESSION_SECRET=YOUR_LONG_RANDOM_SECRET
OIDC_ISSUER=https://YOUR_PROVIDER
OIDC_CLIENT_ID=YOUR_CLIENT_ID
OIDC_CLIENT_SECRET=YOUR_CLIENT_SECRET
OIDC_AUTHORIZATION_ENDPOINT=https://YOUR_PROVIDER/oauth2/authorize
OIDC_TOKEN_ENDPOINT=https://YOUR_PROVIDER/oauth2/token
OIDC_USERINFO_ENDPOINT=https://YOUR_PROVIDER/oauth2/userInfo
```

API:

```sh
wrangler secret put AUTH_SESSION_SECRET --env preview
wrangler secret put AUTH_SESSION_SECRET --env production
```

`api/wrangler.jsonc` では preview / production の `AUTH_MODE` を `oidc` にしてある。frontend と API の `AUTH_SESSION_SECRET` は同じ値に揃える。
frontend の `AUTH_MODE` と `PUBLIC_AUTH_MODE` は片方を `oidc` にすれば OIDC モードになる。設定の混乱を避けるため、通常は両方に同じ値を設定する。

## Vercel 配置

frontend は Vercel にデプロイする。Astro は `@astrojs/vercel/serverless` を使う。

設定する環境変数は少なくとも次のとおり。

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

Vercel 側の Build Command は `npm run build`、Output は Astro adapter に任せる。`PUBLIC_APP_BASE_URL` は Vercel の実 URL か custom domain にする。

## OIDC provider 設定

redirect URI は環境ごとに次を登録する。

- preview: `https://YOUR_PREVIEW_APP/api/auth/callback`
- production: `https://YOUR_APP/api/auth/callback`

userinfo endpoint で `sub` と `email` が返る provider を使うこと。`name` が無い場合は `preferred_username`、それも無い場合はメールアドレスを表示名として使う。
