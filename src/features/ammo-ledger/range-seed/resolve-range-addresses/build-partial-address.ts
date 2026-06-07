import { normalizePrefecture } from "./normalize-prefecture";

export function buildPartialAddress({
  prefecture,
  location,
}: {
  prefecture: string;
  location: string;
}): string {
  return `${normalizePrefecture({ prefecture })}${location}`;
}
