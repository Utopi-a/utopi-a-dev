export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-card/40">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-6 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} ゆーとぴあ</p>
      </div>
    </footer>
  );
}
