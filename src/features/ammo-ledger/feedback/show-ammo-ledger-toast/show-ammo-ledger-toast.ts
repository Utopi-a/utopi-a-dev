import { toast } from "sonner";

type AmmoLedgerToastAction = "created" | "updated" | "deleted" | "saved" | "voided";

const messages: Record<AmmoLedgerToastAction, (subject: string) => string> = {
  created: (subject) => `${subject}を追加しました`,
  updated: (subject) => `${subject}を更新しました`,
  deleted: (subject) => `${subject}を削除しました`,
  saved: (subject) => `${subject}を保存しました`,
  voided: () => "帳簿行を取消しました",
};

export function showAmmoLedgerToast({
  action,
  subject = "変更",
}: {
  action: AmmoLedgerToastAction;
  subject?: string;
}) {
  toast.success(messages[action](subject));
}
