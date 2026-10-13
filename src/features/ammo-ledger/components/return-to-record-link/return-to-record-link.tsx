import Link from "next/link";

type ReturnToRecordLinkProps = {
  /** resolveReturnToPath で検証済みのパス */
  href: string;
};

export function ReturnToRecordLink({ href }: ReturnToRecordLinkProps) {
  const label = href.startsWith("/lab/ammo-ledger/inventory")
    ? "残弾の確認に戻る"
    : "記録の入力に戻る";

  return (
    <Link
      href={href}
      className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary/5 px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/10"
    >
      <span>{label}</span>
      <span aria-hidden>→</span>
    </Link>
  );
}
