import type { BeforeSendEvent } from "@vercel/analytics/next";

// パスワード再設定の ?token= など、URL のクエリには秘密が入る。計測はパス単位で足りるので全部落とす
export function stripUrlQueryAndHash({ event }: { event: BeforeSendEvent }): BeforeSendEvent {
  const url = new URL(event.url);
  url.search = "";
  url.hash = "";

  return { ...event, url: url.toString() };
}
