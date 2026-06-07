export function resolveOwnerName({
  profileOwnerName,
  accountName,
}: {
  profileOwnerName?: string | null;
  accountName: string;
}): string {
  if (profileOwnerName?.trim()) {
    return profileOwnerName.trim();
  }
  return accountName;
}
