import { requireSession } from "@/features/auth/require-session/require-session";

export default async function LabBlogManagePage() {
  await requireSession();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">ブログ管理</h1>
      <p className="text-sm text-muted-foreground">記事の作成・編集は次のフェーズで実装します。</p>
    </div>
  );
}
