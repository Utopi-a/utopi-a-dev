import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ammoLedgerPwaConfig } from "@/features/ammo-ledger/pwa/ammo-ledger-pwa-config";

export default function AmmoLedgerNotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold tracking-tight">ページが見つかりません</h1>
      <p className="text-sm text-muted-foreground">
        記録や設定が取り消し・削除されたか、URL が間違っている可能性があります。
      </p>
      <Link href={ammoLedgerPwaConfig.startUrl} className={buttonVariants()}>
        ホームに戻る
      </Link>
    </div>
  );
}
