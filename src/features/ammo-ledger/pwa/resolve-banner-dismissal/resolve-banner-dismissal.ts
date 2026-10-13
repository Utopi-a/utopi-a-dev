const bannerSnoozeMs = 30 * 24 * 60 * 60 * 1000;

/**
 * 保存値から「後で」を押した時刻を読む。
 * 以前の版は時刻を持たない "true" を保存していたため、初めて読んだ時刻を押した時刻とみなし、
 * そこから30日は出さない（更新直後に一斉に再表示しない）。
 */
export function resolveBannerDismissedAt({
  storedValue,
  now,
}: {
  storedValue: string | null;
  now: number;
}): number | null {
  if (storedValue === "true") {
    return now;
  }
  const dismissedAt = Number(storedValue);
  return storedValue && Number.isFinite(dismissedAt) ? dismissedAt : null;
}

export function isBannerSnoozed({
  dismissedAt,
  now,
}: {
  dismissedAt: number | null;
  now: number;
}): boolean {
  return dismissedAt !== null && now - dismissedAt < bannerSnoozeMs;
}
