import { getOwnerEmails } from "@/features/auth/auth-env";
import { getSession } from "@/features/auth/get-session/get-session";

export type GalleryOwnerResult =
  | { ok: true; user: { id: string; email: string } }
  | { ok: false; code: "unauthenticated" | "forbidden"; error: string };

/**
 * 写真の投稿・編集・削除をしてよい人かを確かめる。
 * API と Server Action から呼ぶので、リダイレクトせず結果で返す。
 */
export async function resolveGalleryOwner(): Promise<GalleryOwnerResult> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      code: "unauthenticated",
      error: "ログインの有効期限が切れました。ログインし直してください。",
    };
  }

  // 既存の requireOwner は OWNER_EMAILS が空だと全員を通すが、ここは公開ページへ写真を出す入口なので、
  // 設定漏れのときに誰でも投稿できる状態にならないよう閉じる側に倒す。
  const ownerEmails = getOwnerEmails();
  const email = session.user.email.toLowerCase();
  if (!ownerEmails.includes(email)) {
    return {
      ok: false,
      code: "forbidden",
      error: "このアカウントでは写真を投稿・編集できません。",
    };
  }

  return { ok: true, user: { id: session.user.id, email: session.user.email } };
}
