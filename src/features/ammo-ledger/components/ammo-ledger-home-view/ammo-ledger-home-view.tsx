"use client";

import { AmmoLedgerActionTile } from "@/features/ammo-ledger/components/ammo-ledger-action-tile/ammo-ledger-action-tile";

export function AmmoLedgerHomeView() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">実包管理帳簿</h1>
        <p className="text-sm text-muted-foreground">
          まず記録を入力し、必要なときに帳簿や残弾を確認します。
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          記録を入力
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <AmmoLedgerActionTile
            href="/lab/ammo-ledger/consume/new"
            label="消費した"
            description="射撃・狩猟などで使った実包"
            variant="primary"
          />
          <AmmoLedgerActionTile
            href="/lab/ammo-ledger/inflow/new"
            label="譲り受けた"
            description="購入・譲受。廃棄・譲渡もここから"
            variant="primary"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          確認
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <AmmoLedgerActionTile
            href="/lab/ammo-ledger/ledger"
            label="帳簿を見る"
            description="法定区分ごとの記録一覧・印刷"
          />
          <AmmoLedgerActionTile
            href="/lab/ammo-ledger/inventory"
            label="残弾を確認"
            description="号数・弾種ごとの帳簿残数と照合"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          帳簿の準備
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <AmmoLedgerActionTile
            href="/lab/ammo-ledger/settings/permits"
            label="譲受許可を登録"
            description="警察交付の許可を登録すると、帳簿に許可残数が出ます"
          />
          <AmmoLedgerActionTile
            href="/lab/ammo-ledger/settings/opening-balance"
            label="年初繰越を登録"
            description="紙の帳簿から移行するときの残弾数・許可残数"
          />
        </div>
      </section>
    </div>
  );
}
