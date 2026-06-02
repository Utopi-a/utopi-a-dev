export type CareerEntry = {
  id: string;
  period: string;
  title: string;
};

export type SkillEntry = {
  name: string;
  summary: string;
  tags?: string[];
};

export const careerEntries: CareerEntry[] = [
  {
    id: "musashi",
    period: "2015 – 2021",
    title: "私立武蔵高等学校中学校",
  },
  {
    id: "tsukuba-bio",
    period: "2021 – 2025",
    title: "筑波大学 生命環境学群 生物学類",
  },
  {
    id: "tsukuba-grad",
    period: "2025 –",
    title: "筑波大学 人間総合科学学術院 フロンティア医科学学位プログラム",
  },
  {
    id: "lifeprompt",
    period: "2024 –",
    title: "株式会社 LifePrompt インターン",
  },
  {
    id: "bioinfo-lab",
    period: "2024 –",
    title: "筑波大学 医学医療系 バイオインフォマティクス研究室",
  },
];

export const certifications: string[] = [
  "応用情報技術者",
  "バイオインフォマティクス技術者認定",
  "普通自動車第一種",
  "日商簿記 3級",
  "ビジネス会計 3級",
  "小型船舶操縦士 2級",
  "アマチュア無線 4級",
  "第一種銃猟免許",
  "剣道初段",
];

export const skills: SkillEntry[] = [
  {
    name: "TypeScript",
    summary: "インターン・個人開発でメインに使用。",
    tags: ["Next.js", "React", "tRPC", "Prisma"],
  },
  {
    name: "Python",
    summary: "研究室開発と競技プログラミング。",
  },
  {
    name: "Git",
    summary: "チーム開発での日常的な利用。",
  },
];
