export type WorkItem = {
  id: string;
  title: string;
  description: string;
  href: string;
};

export const workItems: WorkItem[] = [
  {
    id: "credit-checker-biol",
    title: "生物学類21生向け卒業要件チェッカー",
    description:
      "筑波大学 生命環境学群 生物学類 2021 年度入学生向けの卒業要件チェッカーです。twins からダウンロードした成績表の CSV を読み込むことで、取得済み単位数が表示され、卒業に必要な科目項目を把握することができます。",
    href: "https://credit-checker-biol.vercel.app/",
  },
];
