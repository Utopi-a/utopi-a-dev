import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";

export function computeDaysUntilExpiry({
  expiresOn,
  today,
}: {
  expiresOn: string;
  today: string;
}): number {
  const end = new Date(`${expiresOn}T00:00:00`);
  const start = new Date(`${today}T00:00:00`);
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function formatPermitExpiryLabel({
  expiresOn,
  today,
}: {
  expiresOn: string;
  today: string;
}): string {
  const days = computeDaysUntilExpiry({ expiresOn, today });

  if (days < 0) {
    return `期限切れ（${Math.abs(days)}日前）`;
  }
  if (days === 0) {
    return "本日まで";
  }
  if (days <= 30) {
    return `あと${days}日`;
  }
  return `あと${days}日（${formatIsoDateForDisplay({ value: expiresOn })}まで）`;
}

export function isPermitActive({
  grantedOn,
  expiresOn,
  today,
}: {
  grantedOn: string;
  expiresOn: string;
  today: string;
}): boolean {
  return today >= grantedOn && today <= expiresOn;
}
