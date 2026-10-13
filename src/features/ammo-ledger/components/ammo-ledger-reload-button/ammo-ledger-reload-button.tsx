"use client";

import { Button } from "@/components/ui/button";

/** 今のURLのまま画面を取り直す。オフライン案内はページを Server Component のまま保つため、ボタンだけを分ける。 */
export function AmmoLedgerReloadButton() {
  return (
    <Button type="button" size="lg" onClick={() => window.location.reload()}>
      再読み込み
    </Button>
  );
}
