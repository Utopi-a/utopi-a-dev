import { PageHeader } from "@/features/portfolio/page-header/page-header";

export function BlogPlaceholder() {
  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      <PageHeader title="ブログ" />
      <p className="text-muted-foreground">まだ公開記事はありません</p>
    </div>
  );
}
