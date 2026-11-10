"use client";

import { Analytics } from "@vercel/analytics/next";
import { stripUrlQueryAndHash } from "./strip-url-query-and-hash/strip-url-query-and-hash";

export function SiteAnalytics() {
  return <Analytics beforeSend={(event) => stripUrlQueryAndHash({ event })} />;
}
