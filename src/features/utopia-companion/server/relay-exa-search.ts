// Exa の検索を、使う人の API キーで中継する。キーは保存もログ出力もしない。
// 中継先は Exa の検索の 1 か所だけに固定し、このサイトのページからの呼び出しだけを受け付ける
// （任意の URL を取りに行く入口や、他のサイトから使える経路にしないため）。

const EXA_SEARCH_ENDPOINT = "https://api.exa.ai/search";
const MAX_QUERY_LENGTH = 300;
const MAX_KEY_LENGTH = 200;
const TIMEOUT_MS = 15_000;

function reject({ status, error }: { status: number; error: string }) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function relayExaSearch({
  request,
  fetch = globalThis.fetch,
}: {
  request: Request;
  fetch?: typeof globalThis.fetch;
}) {
  if (request.headers.get("sec-fetch-site") !== "same-origin") {
    return reject({ status: 403, error: "このサイトのページからだけ使えます" });
  }
  const apiKey = request.headers.get("x-exa-api-key")?.trim() ?? "";
  if (apiKey.length === 0 || apiKey.length > MAX_KEY_LENGTH) {
    return reject({ status: 400, error: "API キーがありません" });
  }
  let query = "";
  try {
    const body = (await request.json()) as { query?: unknown };
    query = typeof body.query === "string" ? body.query.trim() : "";
  } catch {
    return reject({ status: 400, error: "検索する言葉がありません" });
  }
  if (query.length === 0 || query.length > MAX_QUERY_LENGTH) {
    return reject({ status: 400, error: "検索する言葉がないか、長すぎます" });
  }

  const upstream = await fetch(EXA_SEARCH_ENDPOINT, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      numResults: 5,
      type: "auto",
      contents: { text: { maxCharacters: 600 } },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!upstream.ok) {
    // 状態だけを返す（Exa の応答本文はキーの情報を含みうるので渡さない）
    return reject({
      status: upstream.status,
      error: `Exa の検索に失敗しました（${upstream.status}）`,
    });
  }
  const data = (await upstream.json()) as {
    results?: { title?: string; url?: string; text?: string }[];
  };
  return Response.json(
    {
      results: (data.results ?? []).map(({ title = "", url = "", text = "" }) => ({
        title,
        url,
        text,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
