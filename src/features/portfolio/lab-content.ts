export type LabEntry = {
  id: string;
  title: string;
  description: string;
  status: "active" | "planned";
  href?: string;
};

export const labEntries: LabEntry[] = [
  {
    id: "theme",
    title: "ブラッシュ・ノワール",
    description: "サイト全体の配色は固定テーマ。ダークモード切替はありません。",
    status: "active",
  },
  {
    id: "auth-studio",
    title: "認証 Studio",
    description: "Better Auth（メール / SSO）とログイン後エリア。Lab 上部の Studio から入る。",
    status: "active",
  },
  {
    id: "ammo-ledger",
    title: "実包管理帳簿",
    description: "猟銃実包の消費・譲受記録と法定帳簿出力。",
    status: "active",
    href: "/lab/ammo-ledger",
  },
  {
    id: "local-llm",
    title: "ローカル LLM チャット",
    description: "WebGPU + Transformers.js で LFM2.5-1.2B-JP をブラウザ内推論。ログイン不要。",
    status: "active",
    href: "/lab/local-llm",
  },
  {
    id: "blog-engine",
    title: "ブログ基盤",
    description: "記事の下書き・公開は /lab/blog/manage で整備予定。",
    status: "planned",
  },
  {
    id: "billing",
    title: "課金まわり",
    description: "Stripe 連携など、認証済みエリア向けの機能検証。",
    status: "planned",
  },
];
