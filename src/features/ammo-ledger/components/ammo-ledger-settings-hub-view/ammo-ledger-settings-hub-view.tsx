import { SettingsLinkList } from "@/features/ammo-ledger/components/settings-link-list/settings-link-list";
import { settingsHubGroups } from "@/features/ammo-ledger/settings/settings-hub-groups/settings-hub-groups";

export function AmmoLedgerSettingsHubView() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">設定</h1>
        <p className="text-sm text-muted-foreground">入力を速くするためのマスタと帳簿情報です。</p>
      </div>
      <SettingsLinkList groups={settingsHubGroups} />
    </div>
  );
}
