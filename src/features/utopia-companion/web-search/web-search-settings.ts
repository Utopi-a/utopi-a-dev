// ネット検索の API キーは、使う人が自分のものを入れる。サイトとしてのキーは持たない
// （有料にもなりうるキーを公開のサイトに置くと、誰でも使えてしまうため）。
// キーはその人のブラウザの localStorage にだけ置き、サイトのサーバーには保存しない。

const STORAGE_KEY = "utopia-companion.web-search.v1";

export const WEB_SEARCH_PROVIDERS = [
  { id: "tavily", label: "Tavily", keyUrl: "https://app.tavily.com/home" },
  { id: "exa", label: "Exa", keyUrl: "https://dashboard.exa.ai/api-keys" },
] as const;

export type WebSearchProvider = (typeof WEB_SEARCH_PROVIDERS)[number]["id"];

export type WebSearchSettings = { provider: WebSearchProvider; apiKey: string };

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readWebSearchSettings({
  storage,
}: {
  storage: StorageLike;
}): WebSearchSettings | null {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null");
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const { provider, apiKey } = parsed as Record<string, unknown>;
    if (
      !WEB_SEARCH_PROVIDERS.some(({ id }) => id === provider) ||
      typeof apiKey !== "string" ||
      !apiKey
    ) {
      return null;
    }
    return { provider: provider as WebSearchProvider, apiKey };
  } catch {
    return null;
  }
}

export function writeWebSearchSettings({
  storage,
  settings,
}: {
  storage: StorageLike;
  settings: WebSearchSettings;
}) {
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, apiKey: settings.apiKey.trim() }));
}

export function clearWebSearchSettings({ storage }: { storage: StorageLike }) {
  storage.removeItem(STORAGE_KEY);
}
