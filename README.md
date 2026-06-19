# Pocket-Pace

周期ごとの使用限度額と「あといくら使えるか」を管理するアプリです。バックエンドは `api/` にある Cloudflare Workers API です。

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

ローカルでは `.dev.vars.example` を `.dev.vars` にコピーし、Auth0 の値を設定してください。`DEV_AUTH_BYPASS=true` は Wrangler のローカル環境だけで固定ユーザーを利用するための設定です。本番・previewでは使用しないでください。

リモートへデプロイする前に `wrangler d1 create` でD1を作成し、`api/wrangler.jsonc` の `database_id` を実値へ置き換えてください。

API仕様と業務ルールは [docs/api-design.md](docs/api-design.md) と [docs/business-rules.md](docs/business-rules.md) を参照してください。

Cloudflareへのデプロイと運用手順は [docs/deployment.md](docs/deployment.md) を参照してください。
