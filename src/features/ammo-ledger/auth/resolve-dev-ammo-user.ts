import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth";

export async function resolveDevAmmoUser({ email }: { email: string }) {
  const [devUser] = await db.select().from(user).where(eq(user.email, email)).limit(1);

  if (!devUser) {
    throw new Error(`AMMO_LEDGER_DEV_USER_EMAIL に指定したユーザーが見つかりません: ${email}`);
  }

  return devUser;
}
