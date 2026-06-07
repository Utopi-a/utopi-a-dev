const savedSignInEmailStorageKey = "auth.savedSignInEmail";

export function readSavedSignInEmail(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = localStorage.getItem(savedSignInEmailStorageKey);
  if (!stored) {
    return null;
  }

  return stored;
}

export function writeSavedSignInEmail({ email }: { email: string }): void {
  localStorage.setItem(savedSignInEmailStorageKey, email);
}

export function clearSavedSignInEmail(): void {
  localStorage.removeItem(savedSignInEmailStorageKey);
}
