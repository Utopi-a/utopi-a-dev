import { skillGroups } from "@/features/portfolio/about-content";
import { labEntries } from "@/features/portfolio/lab-content";
import { siteProfile, socialLinks } from "@/features/portfolio/site-config";
import { siteMetadataConfig } from "@/features/portfolio/site-metadata";
import { workItems } from "@/features/portfolio/works";
import { defineTool } from "@/features/utopia-companion/companion-tool";

// サイト内の案内の道具。サイトに表示している内容（ページ・Lab・Works・プロフィール）だけを、
// 同じデータから読んで答える。外への通信はしない

const SITE_WORDS =
  /サイト|ページ|ブログ|blog|作品|ワークス|works?|ラボ|lab|about|プロフィール|自己紹介|案内|何がある|なにがある|できること|作った|つくった|スキル|技術|ゆーとぴあ|utopi/i;

type SitePage = { path: string; title: string; summary: string; details?: () => string };

function sitePages(): SitePage[] {
  const navigation: SitePage[] = [
    { path: "/", title: "トップ", summary: siteMetadataConfig.description },
    {
      path: "/about",
      title: "About",
      summary: `${siteProfile.name}のプロフィールと使っている技術`,
      details: () =>
        [
          ...skillGroups.map(({ name, tags }) => `${name}: ${tags.join("、")}`),
          `リンク: ${socialLinks.map(({ label, href }) => `${label}（${href}）`).join("、")}`,
        ].join("\n"),
    },
    { path: "/blog", title: "Blog", summary: "ブログ（記事はまだない。準備中）" },
    {
      path: "/work",
      title: "Works",
      summary: "制作物の一覧",
      details: () =>
        workItems
          .map(({ title, description, href }) => `${title}（${href}）: ${description}`)
          .join("\n"),
    },
    {
      path: "/lab",
      title: "Lab",
      summary: "実験的なミニアプリの一覧",
      details: () =>
        labEntries
          .map(
            ({ title, description, status, href }) =>
              `${title}${href ? `（${href}）` : ""}${status === "planned" ? "［準備中］" : ""}: ${description}`,
          )
          .join("\n"),
    },
  ];
  const labPages = labEntries.flatMap(({ title, description, href }) =>
    href ? [{ path: href, title, summary: description }] : [],
  );
  return [...navigation, ...labPages];
}

export const SITE_TOOLS = [
  defineTool({
    name: "list_site_pages",
    description:
      "このサイト（utopi-a.dev）のページの一覧を、パス・名前・内容の一言で返す。サイトの案内や「何があるの？」に使う。",
    parameters: {},
    describe: () => "サイトの中を見てる…",
    run: async () =>
      sitePages()
        .map(({ path, title, summary }) => `${path} ${title}: ${summary}`)
        .join("\n"),
    isRelevant: (userText) => SITE_WORDS.test(userText),
  }),
  defineTool({
    name: "read_site_page",
    description:
      "このサイトのページの内容を詳しく返す。パスは list_site_pages で分かる（例: /work、/lab、/about）。",
    parameters: { path: "読むページのパス（/ から始まる）" },
    describe: ({ path }) => `${path ?? ""} のページを読んでる…`,
    run: async ({ path }) => {
      const pages = sitePages();
      const page = pages.find((item) => item.path === path.trim());
      if (!page) {
        throw new Error(
          `${path} というページはない。あるのは ${pages.map((item) => item.path).join("、")}`,
        );
      }
      return [`${page.title}（${page.path}）: ${page.summary}`, page.details?.() ?? ""]
        .filter(Boolean)
        .join("\n");
    },
    isRelevant: (userText) => SITE_WORDS.test(userText),
  }),
];
