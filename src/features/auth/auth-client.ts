import { createAuthClient } from "better-auth/react";

/**
 * baseURL は指定しない（既定で `/api/auth` 相対パス）。
 * NEXT_PUBLIC_APP_URL を固定すると、3000 が塞がって 3001 で起動したときに Failed to fetch になる。
 */
export const authClient = createAuthClient();
