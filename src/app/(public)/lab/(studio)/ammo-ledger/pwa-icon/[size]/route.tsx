import { ammoLedgerPwaIconSizes } from "@/features/ammo-ledger/pwa/ammo-ledger-pwa-config";
import { createAmmoLedgerPwaIconResponse } from "@/features/ammo-ledger/pwa/create-ammo-ledger-pwa-icon-response";

export function generateStaticParams() {
  return ammoLedgerPwaIconSizes.map((size) => ({ size: String(size) }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: sizeParam } = await params;
  const size = Number(sizeParam);

  if (!ammoLedgerPwaIconSizes.includes(size as (typeof ammoLedgerPwaIconSizes)[number])) {
    return new Response("Not found", { status: 404 });
  }

  return createAmmoLedgerPwaIconResponse({ size });
}
