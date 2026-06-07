type WorkspaceViewLoaderProps = {
  label?: string;
};

export function WorkspaceViewLoader({ label = "読み込み中…" }: WorkspaceViewLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-muted-foreground"
    >
      <span className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      {label}
    </div>
  );
}
