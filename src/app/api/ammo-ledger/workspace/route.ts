import {
  ServerActionRateLimitError,
  serverActionRateLimitResponse,
} from "@/features/ammo-ledger/auth/server-action-rate-limit/server-action-rate-limit-error";
import { loadAmmoLedgerWorkspacePayloadForSession } from "@/features/ammo-ledger/workspace/load-ammo-ledger-workspace-payload/load-ammo-ledger-workspace-payload";

export async function GET() {
  try {
    const payload = await loadAmmoLedgerWorkspacePayloadForSession();
    return Response.json(payload, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ServerActionRateLimitError) {
      return serverActionRateLimitResponse();
    }
    throw error;
  }
}
