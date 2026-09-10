# 実包帳簿のブラウザ・DB回帰テスト

このテストは専用のローカルPostgreSQLと、同じDBに接続したアプリを使用する。各テストは
メール登録APIで架空利用者を作成し、その利用者だけのデータをseedする。終了時には当該利用者を
削除する。`E2E_DATABASE_URL` は必須で、ホストをlocalhost、DB名をtest/e2e/ammo_perfを含むものに限定する。
本番DBや個人の実データを使用しない。

アプリはmigration適用済みの専用DBで起動し、`AUTH_ALLOW_SIGNUP=true`、メール検証・送信は無効にする。

```sh
E2E_DATABASE_URL='postgresql://postgres:example@127.0.0.1:55440/ammo_perf' \
PLAYWRIGHT_BASE_URL='http://127.0.0.1:3140' \
pnpm test:ammo-e2e --reporter=list
```

専用の `playwright.ammo-ledger.config.ts` を使い、デスクトップとモバイルの両方で実行する。
アプリは自動起動しない。通常の `pnpm test:e2e` は公開ページのsmokeだけを実行するため、
このDB書込テストは含まれない。実行にはChromiumのインストールが必要。

保証する契約は、保存後の再取得待ちを伴わない画面復帰、再取得失敗からの手動復旧、
プレビュー確定後の正式帳票への切り替えとロック解除後の編集可否、保存通信失敗後の再試行、
用途クエリと履歴移動の整合性、一括登録の在庫不足時の原子性と訂正成功、workspace GETの認証・
利用者分離・no-store、実Service WorkerのCacheStorageとオフライン時の帳簿非返却。
在庫は用途別残数の合計がworkspace API・消費フォーム・残弾画面・帳簿・譲受許可申請初期値で
一致すること、翌年繰越後に旧年消費を編集しても現在庫へ加算しないことを確認する。
年初繰越は空欄で未登録、明示した0で当該用途の在庫を0に設定し、再読込後の値と
空欄に戻した場合の繰越取消をDB・API・画面で確認する。
通信遅延・失敗だけをHTTP境界で制御し、正常応答は実アプリとDBを通す。
印刷ダイアログだけは置き換え、対象年とプレビュー表示の有無、呼び出し回数を確認する。
通信障害テストはService Workerを無効化し、専用PWAテストだけは有効にする。
個人データを含まない公開オフライン案内 `/lab/ammo-ledger/~offline` だけはキャッシュを許可する。
登録時には各架空利用者に異なるローカルの転送元IPを設定し、独立テスト間で登録APIのrate limitを共有しない。

リスクはHigh（非同期保存と帳簿ロックの整合性）。保存要求がサーバーへ届く前の通信断を検証する。
保存済み応答だけが消失するケースの重複排除、実プリンター/PDFの外観、本番での遅延分布は未検証。
性能回帰は遅延中に画面復帰できるかという順序で判定し、絶対時間はテスト出力内の
`save-to-ledger.json` と添付の観測値として記録する。
ロック・印刷テストは `official-ledger-print.png` と `unlocked-ledger.png`、モバイルでは
帳票を右端までスクロールした `official-ledger-print-right-edge.png` も出力する。
ページ本体の横はみ出し、帳票内の横スクロールと右端列の可読範囲、print mediaでの制約解除も検証する。
