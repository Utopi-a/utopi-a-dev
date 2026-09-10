import { loadAmmoLedgerWorkspacePayloadForSession } from "@/features/ammo-ledger/workspace/load-ammo-ledger-workspace-payload/load-ammo-ledger-workspace-payload";

export async function GET() {
  const payload = await loadAmmoLedgerWorkspacePayloadForSession();
  return Response.json(payload, { headers: { "Cache-Control": "private, no-store" } });
}
