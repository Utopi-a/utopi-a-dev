# utopi-a.dev

個人用の full-stack 実験場です。ポートフォリオ、ブログ、試作、小さな有料サービスなどを載せる想定です。

**ディレクトリ構造・基盤の詳細** → [docs/project-guide.md](./docs/project-guide.md)

## 技術スタック

- Next.js 16（App Router）+ TypeScript + React 19
- Tailwind CSS v4 + shadcn/ui
- Drizzle ORM + PostgreSQL
- Better Auth（GitHub OAuth）
- Hono（Route Handler 上の RPC API）
- Biome + Lefthook + Vitest
- [Doppler](https://www.doppler.com/)（環境変数の共有・同期）

## 開発の始め方

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数（Doppler）

シークレットの正は **Doppler** です。`.env.local` は使わず、`doppler run` でプロセスに注入します。

#### 初回セットアップ（自分のマシン）

```bash
# CLI が未導入の場合（macOS）
brew install dopplerhq/cli/doppler

doppler login
pnpm env:setup   # リポジトリの doppler.yaml に従って紐付け
```

#### チームで同じシークレットを使う

1. Doppler の Workplace にメンバーを招待（Dashboard → Team）
2. リポジトリを clone し、`doppler login` → `pnpm env:setup` を実行
3. Dashboard の `utopi-a-dev` → **dev** config で値を確認・編集（権限のあるメンバーが設定済みならそのまま利用可能）

Workplace にプロジェクトがまだない場合:

```bash
doppler import   # doppler-template.yaml から utopi-a-dev を作成
pnpm env:setup
```

#### シークレットの編集

```bash
pnpm env:open    # Doppler Dashboard を開く
```

CLI から設定する例:

```bash
doppler secrets set DATABASE_URL="postgresql://..."
```

`.env.example` は **変数名の一覧** 用です。実際の値は Doppler にのみ保存してください。

認証まわり（`dev` / `stg` / `prd` それぞれに設定）:

| 変数 | dev の目安 | stg / prd の目安 |
| --- | --- | --- |
| `AUTH_ALLOW_SIGNUP` | `true`（ローカルで登録試験） | `false`（招待・OAuth のみ等） |
| `OWNER_EMAILS` | 自分のメール（任意） | 本番オーナーのメール（カンマ区切り） |

| Config | 用途 |
| --- | --- |
| `dev` | ローカル開発（`pnpm dev` が参照） |
| `stg` | ステージング / Vercel Preview |
| `prd` | 本番 / Vercel Production |

### 3. データベースと開発サーバー

```bash
# dev config に DATABASE_URL などを設定したあと
pnpm db:migrate
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

Doppler を使わず Next だけ起動する場合（UI の確認など、シークレット不要なとき）:

```bash
pnpm exec next dev --turbopack
```

## npm スクリプト

| コマンド | 説明 |
| --- | --- |
| `pnpm dev` | 開発サーバー（Turbopack、Doppler 経由で env 注入） |
| `pnpm build` | 本番ビルド |
| `pnpm start` | 本番サーバー起動 |
| `pnpm check` | Biome による format + lint |
| `pnpm test:run` | Vitest（単発実行） |
| `pnpm typecheck` | TypeScript の型チェック |
| `pnpm db:generate` | Drizzle マイグレーション生成 |
| `pnpm db:migrate` | マイグレーション適用 |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm env:setup` | `doppler setup --no-interactive` |
| `pnpm env:open` | Doppler Dashboard を開く |

## デプロイ（Vercel）

1. [Doppler と Vercel の連携](https://docs.doppler.com/docs/vercel)を Dashboard で設定する
2. `utopi-a-dev` の **stg** を Vercel Preview、**prd** を Production に同期する
3. 以降、Doppler 上でシークレットを更新すると Vercel に反映される

## CI（GitHub Actions）

1. Doppler で Environment **GitHub** を作成する（Options → Create Environment）
2. [GitHub 連携](https://docs.doppler.com/docs/github-actions)で `utopi-a-dev` の config を Repository secrets に同期する
3. Workflow 内で `doppler run -- pnpm test:run` などを実行する（`DOPPLER_TOKEN` は連携で注入される）

## ルート一覧

**公開**

- `/` — トップ（プロフィール風ヒーロー）
- `/about` — プロフィール
- `/work` — 制作物
- `/blog` — ブログ（公開記事一覧）
- `/lab` — 実験・試作
- `/login` — ログイン・新規登録（GitHub SSO 含む）
- `/forgot-password` — パスワードリセット依頼
- `/reset-password` — 新パスワード設定（メールのトークン）

**Lab / Studio（ログイン後、`proxy` でガード）**

未ログイン時は `/login?next=<元のパス>` へリダイレクトされます。入口は公開の `/lab`（ヘッダーに Studio リンクは出しません）。

- `/lab` — 実験一覧 + Studio パネル（ログイン / ログアウト）
- `/lab/studio` — ダッシュボード
- `/lab/blog/manage` — ブログ管理
- `/lab/settings` — アカウント

**SSO（環境変数が揃ったプロバイダだけボタン表示）**

GitHub / Google / Discord / X (Twitter)。コールバック URL は `{BETTER_AUTH_URL}/api/auth/callback/{provider}`。

**メール（Resend）**

`RESEND_API_KEY` + `RESEND_FROM_EMAIL` でパスワードリセット・メール確認を送信。未設定時は dev でターミナルにリンク出力。

**API**

- `/api/auth/*` — Better Auth
- `/api/rpc/health` — Hono ヘルスチェック
- `/api/webhooks/stripe` — Stripe Webhook（スタブ）
