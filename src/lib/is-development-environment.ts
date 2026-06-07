/** `pnpm dev` など NODE_ENV=development のときのみ true（production ビルドでは常に false） */
export function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === "development";
}
