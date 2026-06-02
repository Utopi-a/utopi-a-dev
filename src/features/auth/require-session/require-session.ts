import { redirect } from "next/navigation";
import { getSession } from "@/features/auth/get-session/get-session";

type RequireSessionOptions = {
  redirectTo?: string;
};

export async function requireSession({ redirectTo = "/login" }: RequireSessionOptions = {}) {
  const session = await getSession();

  if (!session) {
    redirect(redirectTo);
  }

  return session;
}
