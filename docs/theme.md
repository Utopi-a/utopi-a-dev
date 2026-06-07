# テーマ — ブラッシュ・ノワール

サイトの配色は **ブラッシュ・ノワール** をベースに、ライト / ダークを切り替えられます。

## 設計

| 役割 | 内容 |
| --- | --- |
| ベース（60%） | 冷たい薄ライラック（ダーク時は深いノワール） |
| 構造（30%） | 藤系のカード・ボーダー |
| CTA（10%） | ワイン系（`primary`） |
| 本文 | 暖色寄りグレー（紫がかった文字にしない） |

定義: `src/lib/theme/colors.css`（`:root` と `.dark` の CSS 変数）

## 切り替え

- `next-themes` で `html` に `.dark` クラスを付与
- 初期値は OS 設定（`system`）。ヘッダーと Lab Studio のトグルでライト / ダークを手動切替
- 実装: `src/lib/theme/theme-provider.tsx`, `src/lib/theme/theme-toggle.tsx`

## トークン

shadcn / Tailwind と同じ変数名（`--background`, `--primary` など）を使います。装飾用に `--brand-gradient-*` と `--brand-glow` もあります。
