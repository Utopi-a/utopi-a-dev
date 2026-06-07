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
