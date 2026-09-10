import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { buildCounterpartyPickerData } from "@/features/ammo-ledger/catalog/build-counterparty-picker-data/build-counterparty-picker-data";
import { buildRangePickerData } from "@/features/ammo-ledger/catalog/build-range-picker-data/build-range-picker-data";

export async function GET(request: Request) {
  const user = await requireAmmoUser({ rateLimit: "read" });
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  if (kind !== "range" && kind !== "gun_shop") {
    return Response.json({ error: "選択対象が不正です" }, { status: 400 });
  }
  const data =
    kind === "range"
      ? await buildRangePickerData({ userId: user.id })
      : await buildCounterpartyPickerData({
          userId: user.id,
          includeRangeCatalog: params.get("includeRangeCatalog") === "1",
        });
  return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
