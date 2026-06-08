import Link from "next/link";
import { ammoLedgerPwaConfig } from "@/features/ammo-ledger/pwa/ammo-ledger-pwa-config";

export default function AmmoLedgerOfflinePage() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold tracking-tight">オフラインです</h1>
      <p className="text-sm text-muted-foreground">
        ネットワークに接続してから、もう一度お試しください。
      </p>
      <Link
        href={ammoLedgerPwaConfig.startUrl}
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        ホームに戻る
      </Link>
    </div>
  );
}
