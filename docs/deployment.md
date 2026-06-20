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

## ローカル認証

ログイン画面で入力したメールアドレスをローカルユーザー ID として利用する。Astro は HTTP-only Cookie にセッションを保存し、サーバー間通信でのみ API へユーザー ID を渡す。パスワード、Auth0、アクセストークン、外部 Secrets は不要である。
