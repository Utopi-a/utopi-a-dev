export type LabEntry = {
  id: string;
  title: string;
  description: string;
  status: "active" | "planned";
};

export const labEntries: LabEntry[] = [
  {
    id: "theme",
    title: "ブラッシュ・ノワール",
    description: "サイト全体の配色は固定テーマ。ダークモード切替はありません。",
    status: "active",
  },
  {
    id: "blog-engine",
    title: "ブログ基盤",
    description: "記事の下書き・公開フローをこのリポジトリ内で整備予定。",
    status: "planned",
  },
  {
    id: "billing",
    title: "課金まわり",
    description: "Stripe 連携など、認証済みエリア向けの機能検証。",
    status: "planned",
  },
];
