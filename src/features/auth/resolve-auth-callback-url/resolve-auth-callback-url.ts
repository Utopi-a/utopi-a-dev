export function resolveAuthCallbackURL({ next }: { next?: string }) {
  if (next?.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/lab";
}
