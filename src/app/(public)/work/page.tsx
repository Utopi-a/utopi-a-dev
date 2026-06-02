import { PublicPageShell } from "@/components/layout/public-page-shell";

export default function WorkPage() {
  return (
    <PublicPageShell>
      <header className="mb-8 space-y-2 border-b border-border/60 pb-6">
        <p className="text-sm font-medium tracking-widest text-primary uppercase">Works</p>
        <h1 className="text-3xl font-semibold tracking-tight">制作物一覧</h1>
      </header>
      <article className="rounded-xl border border-border/80 bg-card/80 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">生物学類21生向け卒業要件チェッカー</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          筑波大学 生命環境学群 生物学類 2021年度入学生向けの卒業要件チェッカーです。twins
          からダウンロードした成績表の csv
          を読み込むことで、取得済み単位数が表示され、卒業に必要な科目項目を把握することができます。
        </p>
      </article>
    </PublicPageShell>
  );
}
