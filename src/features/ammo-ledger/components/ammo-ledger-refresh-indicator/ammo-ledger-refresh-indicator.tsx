type AmmoLedgerRefreshIndicatorProps = {
  visible: boolean;
};

export function AmmoLedgerRefreshIndicator({ visible }: AmmoLedgerRefreshIndicatorProps) {
  if (!visible) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 border-t border-border/50 py-3 text-sm text-muted-foreground"
    >
      <span className="size-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      更新中…
    </div>
  );
}
