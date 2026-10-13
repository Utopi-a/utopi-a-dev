"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AmmoLedgerActionTile } from "@/features/ammo-ledger/components/ammo-ledger-action-tile/ammo-ledger-action-tile";
import { AmmoLedgerHomeStatus } from "@/features/ammo-ledger/components/ammo-ledger-home-status/ammo-ledger-home-status";
import { AmmoLedgerPwaInstallBanner } from "@/features/ammo-ledger/components/ammo-ledger-pwa-install/ammo-ledger-pwa-install-banner";
import { AmmoLedgerSetupGuide } from "@/features/ammo-ledger/components/ammo-ledger-setup-guide/ammo-ledger-setup-guide";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

const formEntryPaths = [
  "/lab/ammo-ledger/consume/new",
  "/lab/ammo-ledger/inflow/new",
  "/lab/ammo-ledger/bulk/new",
] as const;

export function AmmoLedgerHomeView() {
  const router = useRouter();
  // 読み込み中・失敗時も記録の入力タイルはそのまま使えるようにする。
  const { workspace, error, retry } = useAmmoLedgerWorkspace();

  useEffect(() => {
    for (const href of formEntryPaths) {
      router.prefetch(href);
    }
  }, [router]);
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">実包管理帳簿</h1>
        <p className="text-sm text-muted-foreground">
          実包の出入りを記録し、必要なときに帳簿や残弾を確認します。
        </p>
      </div>

      {workspace ? <AmmoLedgerSetupGuide workspace={workspace} /> : null}

      <section className="space-y-3">
        <h2 className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          記録を入力
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <AmmoLedgerActionTile
            href="/lab/ammo-ledger/consume/new"
            label="消費した"
            description="射撃・狩猟などで使った実包"
            cta="入力する →"
            variant="primary"
          />
          <AmmoLedgerActionTile
            href="/lab/ammo-ledger/inflow/new"
            label="譲り受けた"
            description="購入・譲受。廃棄・譲渡もここから"
            cta="入力する →"
            variant="primary"
          />
          <AmmoLedgerActionTile
            href="/lab/ammo-ledger/bulk/new"
            label="まとめて追加"
            description="消費・譲り受けを混ぜて、複数の記録を一度に入力"
            cta="入力する →"
          />
        </div>
      </section>

      <AmmoLedgerPwaInstallBanner />

      <AmmoLedgerHomeStatus workspace={workspace} error={error} onRetry={retry} />

      <section className="space-y-3">
        <h2 className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          帳簿の準備
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <AmmoLedgerActionTile
            href="/lab/ammo-ledger/applications/acquisition-permit/new"
            label="譲受許可申請書を作る"
            description="別記様式第2号を入力して印刷"
            cta="作成する →"
          />
          <AmmoLedgerActionTile
            href="/lab/ammo-ledger/settings/permits"
            label="譲受許可を登録"
            description="警察交付の許可を登録すると、帳簿に許可残数が出ます"
            cta="登録する →"
          />
          <AmmoLedgerActionTile
            href="/lab/ammo-ledger/settings/opening-balance"
            label="年初繰越を登録"
            description="1月1日時点の残弾数・許可残数（前年からの繰越・紙の帳簿からの移行）"
            cta="登録する →"
          />
        </div>
      </section>
    </div>
  );
}
