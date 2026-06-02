import { PublicPageShell } from "@/components/layout/public-page-shell";

export default function BlogPage() {
  return (
    <PublicPageShell>
      <header className="space-y-2 border-b border-border/60 pb-6">
        <p className="text-sm font-medium tracking-widest text-primary uppercase">Blog</p>
        <h1 className="text-3xl font-semibold tracking-tight">ブログ</h1>
        <p className="text-muted-foreground">公開記事の一覧はここに表示します。</p>
      </header>
    </PublicPageShell>
  );
}
