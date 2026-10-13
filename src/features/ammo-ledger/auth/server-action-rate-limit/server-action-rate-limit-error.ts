export class ServerActionRateLimitError extends Error {
  constructor() {
    super("SERVER_ACTION_RATE_LIMITED");
    this.name = "ServerActionRateLimitError";
  }
}

export const serverActionRateLimitMessage = "操作が多すぎます。しばらくしてからお試しください。";

export function serverActionRateLimitErrorResult() {
  return { ok: false as const, error: serverActionRateLimitMessage };
}

/** 読み込み用 API がレート制限に当たったとき、画面で読める日本語のまま返す。 */
export function serverActionRateLimitResponse() {
  return Response.json(
    { error: serverActionRateLimitMessage },
    { status: 429, headers: { "Cache-Control": "private, no-store" } },
  );
}
