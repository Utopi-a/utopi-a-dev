import { PublicPageShell } from "@/components/layout/public-page-shell";

export default function LabPage() {
  return (
    <PublicPageShell>
      <header className="space-y-2 border-b border-border/60 pb-6">
        <p className="text-sm font-medium tracking-widest text-primary uppercase">Lab</p>
        <h1 className="text-3xl font-semibold tracking-tight">実験</h1>
        <p className="text-muted-foreground leading-relaxed">
          試作や検証用のページです。テーマはブラッシュ・ノワールに固定しています。
        </p>
      </header>
    </PublicPageShell>
  );
}
