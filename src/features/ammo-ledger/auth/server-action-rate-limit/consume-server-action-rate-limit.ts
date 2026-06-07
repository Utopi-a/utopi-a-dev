import { ServerActionRateLimitError } from "@/features/ammo-ledger/auth/server-action-rate-limit/server-action-rate-limit-error";

export type ServerActionRateLimitKind = "read" | "mutation";

const rateLimitWindows = {
  read: { windowMs: 60_000, max: 120 },
  mutation: { windowMs: 60_000, max: 30 },
} as const;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

export function assertServerActionRateLimit({
  userId,
  kind,
}: {
  userId: string;
  kind: ServerActionRateLimitKind;
}) {
  const { windowMs, max } = rateLimitWindows[kind];
  const key = `${kind}:${userId}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (bucket.count >= max) {
    throw new ServerActionRateLimitError();
  }

  bucket.count += 1;
}
