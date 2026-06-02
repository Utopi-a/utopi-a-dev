import { redirect } from "next/navigation";
import { getOwnerEmails } from "@/features/auth/auth-env";
import { requireSession } from "@/features/auth/require-session/require-session";

export async function requireOwner() {
  const session = await requireSession();
  const ownerEmails = getOwnerEmails();

  if (ownerEmails.length > 0) {
    const email = session.user.email.toLowerCase();
    if (!ownerEmails.includes(email)) {
      redirect("/");
    }
  }

  return session;
}
