# サイトパフォーマンス改善プラン

## 背景

Lighthouse（`https://www.utopi-a.dev/`）結果:

| 指標 | 値 | 判定 |
|------|-----|------|
| Performance | 0.82 | 改善余地あり |
| LCP | 3.1s | 悪い |
| FCP | 0.5s | 良好 |
| TBT | 0ms | 良好 |
| CLS | 0 | 良好 |
| 転送量 | 3,386 KiB | フォント 89% |

**主因:** ルート layout で 3 フォント × 複数 weight → 242 本のフォント preload が LCP 画像の帯域を奪っている。

**方針:** 一括取得 + SWR キャッシュは維持。初回コストと全ページ共通コストを削る。

---

## Phase 0: 計測ベースライン

| ページ | 計測項目 |
|--------|----------|
| `/` | フォントリクエスト数、LCP 内訳、`_rsc` prefetch 件数 |
| `/lab/ammo-ledger` | TBT、JS バンドル、workspace 取得 |
| `/about` | ハイドレーションコスト |

---

## Sprint 1: フォント（ホーム LCP 最大レバー）

### タスク

1. ルート `layout.tsx` からフォントを除去
2. `(site-chrome)/layout.tsx` に portfolio フォント（Zen Kaku 400/700 + DM Sans 400/700）
3. `(ammo-app)/lab/ammo-ledger/layout.tsx` に lab フォント（Zen Kaku + Geist Mono）
4. `geistMono` を公開ページから完全除外
5. ammo-ledger を `(studio)` 配下から分離（LabStudioShell も除外）

### 変更ファイル

- `src/lib/theme/zen-kaku-font.ts`（新規）
- `src/lib/theme/portfolio-fonts.ts`（新規）
- `src/lib/theme/lab-fonts.ts`（新規）
- `src/lib/theme/fonts.ts`（削除）
- `src/app/layout.tsx`
- `src/app/(public)/(site-chrome)/layout.tsx`（新規）
- `src/app/(public)/(ammo-app)/lab/ammo-ledger/`（移動）

### 成功基準

- ホームのフォントリクエスト < 20
- LCP ~1.5–2.0s（本番 Lighthouse）

---

## Sprint 2: LCP 画像 + 帯域競合除去

### タスク

1. プロフィール画像に `fetchPriority="high"` と `sizes` を明示
2. `ExploreLinkCard` / `SiteNav` の Link に `prefetch={false}`

### 変更ファイル

- `src/features/portfolio/home-view/home-view.tsx`
- `src/features/portfolio/explore-link-card/explore-link-card.tsx`
- `src/components/layout/site-header/site-nav.tsx`

### 成功基準

- 初回ロード時の `_rsc` prefetch 洪水が止まる
- LCP 要素に `fetchpriority="high"` が付く

---

## Sprint 3: CSS 初期ペイロード

### タスク

1. ammo-ledger 専用 CSS（catalog-scroll 等）を `ammo-ledger.css` に分離
2. ammo-ledger layout でのみ import

### 変更ファイル

- `src/features/ammo-ledger/ammo-ledger.css`（新規）
- `src/app/globals.css`
- `src/app/(public)/(ammo-app)/lab/ammo-ledger/layout.tsx`

### 成功基準

- 公開ページの未使用 CSS 削減（Lighthouse unused CSS 警告の改善）

---

## Sprint 4: 公開ページハイドレーション削減

### タスク

1. `PublicChromeShell`（client pathname 判定）を廃止
2. route group で header/footer を server layout に直置き
3. `ThemeProvider` を `(public)/layout.tsx` にスコープ（root から除去）
4. `Toaster` を ammo-ledger layout のみへ移動

### 変更ファイル

- `src/app/(public)/layout.tsx`
- `src/app/(public)/(site-chrome)/layout.tsx`
- `src/components/layout/public-chrome-shell/`（削除）
- `src/app/(public)/(ammo-app)/lab/ammo-ledger/layout.tsx`

### 成功基準

- ammo-ledger で `SiteNav` / `PublicChromeShell` がマウントされない
- ホーム初回 JS ハイドレーションコスト低下

---

## Sprint 5: ammo-ledger 専用

### タスク

1. `AmmoLedgerShell` 各ビューを `next/dynamic` で分割
2. `AmmoLedgerWorkspacePrefetch` を shell ルートのみにスコープ
3. `OptimisticNav` context value を `useMemo` / `useCallback` 化
4. 主要ビューに `React.memo` 適用

### 変更ファイル

- `src/features/ammo-ledger/components/ammo-ledger-shell/ammo-ledger-shell.tsx`
- `src/features/ammo-ledger/workspace/ammo-ledger-workspace-prefetch/`
- `src/features/ammo-ledger/components/ammo-ledger-optimistic-nav/`

### 成功基準

- ammo-ledger 初回 JS ペイロード削減
- shell ルート間ナビの体感改善

---

## 検証手順

```bash
pnpm typecheck
pnpm build:local  # または pnpm build
pnpm start:local
# Lighthouse: /, /about, /lab/ammo-ledger
```
