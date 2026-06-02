import { PublicPageShell } from "@/components/layout/public-page-shell";

export default function AboutPage() {
  return (
    <PublicPageShell>
      <div className="space-y-8">
        <header className="space-y-2 border-b border-border/60 pb-6">
          <p className="text-sm font-medium tracking-widest text-primary uppercase">About</p>
          <h1 className="text-3xl font-semibold tracking-tight">ゆーとぴあ</h1>
          <p className="text-muted-foreground">プロフィール（静的コンテンツは順次追加）</p>
        </header>
        <p className="text-sm leading-relaxed text-muted-foreground">
          現行の utopi-a.dev と同様、経歴・できること・すきなものなどをこのページに載せる予定です。
        </p>
      </div>
    </PublicPageShell>
  );
}
