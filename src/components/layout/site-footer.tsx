export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/60 bg-card/30">
      <div className="mx-auto max-w-5xl px-4 py-10 text-center text-sm text-muted-foreground sm:px-6 sm:py-12">
        <p>© {year} ゆーとぴあ</p>
      </div>
    </footer>
  );
}
