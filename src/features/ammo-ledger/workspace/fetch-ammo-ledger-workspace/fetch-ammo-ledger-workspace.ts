import type { AmmoLedgerWorkspacePayload } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-payload/ammo-ledger-workspace-payload";

export async function fetchAmmoLedgerWorkspace(): Promise<AmmoLedgerWorkspacePayload> {
  const response = await fetch("/api/ammo-ledger/workspace", {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  }).catch(() => {
    throw new Error("帳簿データを取得できませんでした。通信状態を確認して再試行してください。");
  });
  if (response.redirected) {
    throw new Error("ログイン状態を確認して、再度ログインしてください。");
  }
  if (!response.ok) {
    throw new Error("帳簿データを取得できませんでした。再試行してください。");
  }
  // JSON では日付が文字列になるため、帳簿の並び順・表示が使う日時を復元する。
  return JSON.parse(await response.text(), (key, value) =>
    ["createdAt", "updatedAt", "voidedAt", "classificationConfirmedAt"].includes(key) &&
    typeof value === "string"
      ? new Date(value)
      : value,
  );
}
