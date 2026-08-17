type ClassificationReviewStatusProps = {
  unconfirmedCount: number;
  orphanCount: number;
};

export function ClassificationReviewStatus({
  unconfirmedCount,
  orphanCount,
}: ClassificationReviewStatusProps) {
  const total = unconfirmedCount + orphanCount;

  if (total === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-emerald-50 px-4 py-3 text-sm dark:bg-emerald-950/30">
        <p className="font-medium text-emerald-800 dark:text-emerald-300">
          すべての弾種分類が確認済みです
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-amber-50 px-4 py-3 text-sm dark:bg-amber-950/30">
      <p className="font-medium text-amber-800 dark:text-amber-300">確認が必要な項目があります</p>
      <ul className="mt-1 space-y-0.5 text-amber-700 dark:text-amber-400">
        {unconfirmedCount > 0 ? <li>未確認の弾種: {unconfirmedCount}件</li> : null}
        {orphanCount > 0 ? <li>孤立した帳簿記録: {orphanCount}件</li> : null}
      </ul>
    </div>
  );
}
