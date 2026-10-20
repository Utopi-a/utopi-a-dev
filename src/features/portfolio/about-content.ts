export type CareerEntry = {
  id: string;
  period: string;
  title: string;
};

export type SkillGroup = {
  name: string;
  tags: string[];
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

/** どの技術も AI エージェントと組んで使う前提なので、先頭にエージェント自体を置く */
export const skillGroups: SkillGroup[] = [
  {
    name: "AI エージェント",
    tags: ["Claude Code", "Codex", "Cursor", "MCP", "Agent Skills"],
  },
  {
    name: "言語",
    tags: ["TypeScript", "Python"],
  },
  {
    name: "フロントエンド",
    tags: [
      "Next.js",
      "React",
      "Tailwind CSS",
      "shadcn/ui",
      "Radix UI",
      "SWR",
      "PWA（Serwist）",
      "WebGPU",
      "Transformers.js",
    ],
  },
  {
    name: "バックエンド・データ",
    tags: ["Hono", "tRPC", "Zod", "PostgreSQL", "Drizzle ORM", "Prisma", "Better Auth"],
  },
  {
    name: "テスト・品質",
    tags: ["Vitest", "Testing Library", "Playwright", "Biome", "Lefthook"],
  },
  {
    name: "インフラ・運用",
    tags: ["Git", "GitHub Actions", "Vercel", "Neon", "Doppler"],
  },
];
