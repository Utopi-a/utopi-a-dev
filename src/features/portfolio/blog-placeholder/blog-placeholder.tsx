import { PageHeader } from "@/features/portfolio/page-header/page-header";

export function BlogPlaceholder() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow="Blog" title="ブログ" />
      <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">まだ公開記事はありません</p>
      </div>
    </div>
  );
}
