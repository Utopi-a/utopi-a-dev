import Link from "next/link";
import type { ReactNode } from "react";
import { buildPathWithReturnTo } from "@/features/ammo-ledger/navigation/resolve-return-to-path/resolve-return-to-path";

export type MissingMaster = "gun" | "ammo-type" | "permit";

const missingMasterSettings: Record<MissingMaster, { name: string; href: string }> = {
  gun: { name: "銃", href: "/lab/ammo-ledger/settings/guns" },
  "ammo-type": { name: "弾種", href: "/lab/ammo-ledger/settings/ammo-types" },
  permit: { name: "譲受許可", href: "/lab/ammo-ledger/settings/permits" },
};

type MissingMastersNoticeProps = {
  /** 「〜には」に続く操作。例: 消費を記録する */
  action: string;
  missing: MissingMaster[];
  /** 登録後に戻る、今の画面のパス */
  returnTo: string;
  children?: ReactNode;
};

export function MissingMastersNotice({
  action,
  missing,
  returnTo,
  children,
}: MissingMastersNoticeProps) {
  const names = missing.map((kind) => missingMasterSettings[kind].name).join("と");

  return (
    <div className="space-y-3">
      <p className="text-sm">
        {action}には、{names}の登録が必要です。
      </p>
      <ul className="space-y-2">
        {missing.map((kind) => (
          <li key={kind}>
            <Link
              href={buildPathWithReturnTo({ path: missingMasterSettings[kind].href, returnTo })}
              className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary/5 px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/10"
            >
              <span>{missingMasterSettings[kind].name}を登録する</span>
              <span aria-hidden>→</span>
            </Link>
          </li>
        ))}
      </ul>
      {children ? <p className="text-sm text-muted-foreground">{children}</p> : null}
    </div>
  );
}
