export function normalizePhone({ phone }: { phone: string | null }): string | null {
  if (!phone) {
    return null;
  }

  const digits = phone.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}
