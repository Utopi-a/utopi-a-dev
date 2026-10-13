import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { buildCounterpartyPickerData } from "@/features/ammo-ledger/catalog/build-counterparty-picker-data/build-counterparty-picker-data";
import { buildRangePickerData } from "@/features/ammo-ledger/catalog/build-range-picker-data/build-range-picker-data";
import { type InputKind, inputKinds } from "@/features/ammo-ledger/schema/input-kind";

function parseRecentInputKinds({ value }: { value: string | null }): InputKind[] | undefined {
  const kinds = value
    ?.split(",")
    .filter((kind): kind is InputKind => inputKinds.some((known) => known === kind));
  return kinds && kinds.length > 0 ? kinds : undefined;
}

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
          recentInputKinds: parseRecentInputKinds({ value: params.get("recentInputKinds") }),
        });
  return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
