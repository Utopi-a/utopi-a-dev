function parseBoolean({
  value,
  defaultValue,
}: {
  value: string | undefined;
  defaultValue: boolean;
}) {
  if (value === undefined) {
    return defaultValue;
  }
  return value === "true" || value === "1";
}

export function isSignUpAllowed() {
  return parseBoolean({
    value: process.env.AUTH_ALLOW_SIGNUP,
    defaultValue: true,
  });
}

export function getOwnerEmails(): string[] {
  const raw = process.env.OWNER_EMAILS ?? "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getTrustedOrigins(): string[] {
  const origins = [process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_APP_URL].filter(
    (value): value is string => Boolean(value),
  );
  return [...new Set(origins)];
}
