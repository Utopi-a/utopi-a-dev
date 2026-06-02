import { createAuthClient } from "better-auth/react";
import { getClientEnv } from "@/lib/env";

const { NEXT_PUBLIC_APP_URL } = getClientEnv();

export const authClient = createAuthClient({
  baseURL: NEXT_PUBLIC_APP_URL,
});
