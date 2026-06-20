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

認証はAuth0などの外部サービスを使いません。ログイン画面で入力したメールアドレスをローカルユーザーIDとして、AstroのHTTP-only Cookieに保存します。開発環境では Wrangler が管理する local D1 を使い、preview / production ではそれぞれの remote D1 を使います。

フロントエンド側の `.env.example` には以下を設定します。

- `PUBLIC_API_BASE_URL`
- `PUBLIC_APP_BASE_URL`
- `PUBLIC_LOCAL_LOGIN`（省略時も有効）

フロントエンドのログイン画面では、ローカルセッション用の名前とメールアドレスを入れるだけで、API の `/me/sync` に同期して利用を開始できます。

API仕様と業務ルールは [docs/api-design.md](docs/api-design.md) と [docs/business-rules.md](docs/business-rules.md) を参照してください。

preview / production へ出す場合は、`bun run db:migrate:preview` / `bun run db:migrate:production` を先に実行し、その後に `bun run deploy:preview` / `bun run deploy:production` を実行してください。詳細は [docs/deployment.md](docs/deployment.md) に記載しています。
