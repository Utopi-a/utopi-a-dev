export type AboutListSection = {
  type: "list";
  id: string;
  title: string;
  items: string[];
};

export type AboutSkillsSection = {
  type: "skills";
  id: string;
  title: string;
  items: {
    name: string;
    description: string;
    related?: string[];
  }[];
};

export type AboutSection = AboutListSection | AboutSkillsSection;

export const aboutSections: AboutSection[] = [
  {
    type: "list",
    id: "career",
    title: "経歴",
    items: [
      "私立武蔵高等学校中学校（2015/04～2021/03）",
      "筑波大学 生命環境学群生物学類（2021/04～2025/03）",
      "筑波大学 人間総合科学学術院 人間総合科学研究群 フロンティア医科学学位プログラム（2025/04～）",
      "株式会社LifePrompt インターン（2024/02～）",
      "筑波大学 医学医療系 バイオインフォマティクス研究室（2024/04～）",
    ],
  },
  {
    type: "list",
    id: "certifications",
    title: "資格等",
    items: [
      "応用情報技術者試験 合格",
      "普通自動車免許第一種",
      "バイオインフォマティクス技術者認定試験 合格",
      "日商簿記検定試験 ３級",
      "ビジネス会計検定 ３級",
      "小型船舶操縦士 ２級",
      "アマチュア無線技士 ４級",
      "第一種銃猟免許",
      "全日本剣道連盟 剣道初段",
    ],
  },
  {
    type: "skills",
    id: "skills",
    title: "できること",
    items: [
      {
        name: "TypeScript",
        description: "インターンで使用しています。関連して以下の技術あたりに触れています。",
        related: ["Next.js", "React", "Mantine", "tRPC", "prisma", "supabase"],
      },
      {
        name: "Python",
        description: "研究室での開発に使用しています。競技プログラミングも Python でやっています。",
      },
      {
        name: "Git",
        description: "普通のチーム開発で使う程度はできます。",
      },
      {
        name: "C++",
        description: "APG4b の 2 章まで触れた程度のレベルです。もう忘れた。",
      },
    ],
  },
  {
    type: "list",
    id: "interests",
    title: "すきなもの",
    items: [
      "生物学がわりと好きです。ゲノムなんかに興味があります。高校生の時には生物学オリンピックに出場後、現在も学生スタッフの SCIBO として参加しています。",
      "2024年1月の ABC337 から AtCoder で競技プログラミングをやっています。まだ茶色ですが、少しずつでもレートを上げられるといいな、と思っています。",
      "趣味としてクレー射撃を本格的に行っています。スキート射撃で国体出場を目指しています。",
      "その他、車に乗ったりいじったりするのも好きです。クラッチ切れなくなったので GH8 に乗り換えました。",
    ],
  },
];
