import { PageIntro } from "@/features/portfolio/page-intro/page-intro";

export function BlogPlaceholder() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageIntro
        label="Blog"
        title="ブログ"
        description="記事の一覧は CMS 連携後にここに表示します。現時点では準備中です。"
      />
      <p className="mt-8 rounded-xl border border-dashed border-border/80 bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
        まだ公開記事はありません
      </p>
    </div>
  );
}
