"use server";

import { eq, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db } from "@/db";
import { galleryPhoto } from "@/db/schema/gallery";
import { GALLERY_PHOTOS_CACHE_TAG } from "@/features/gallery/list-photos/gallery-photos-cache-tag";
import { resolveGalleryOwner } from "@/features/gallery/owner/resolve-gallery-owner";
import { updatePhotoSchema } from "@/features/gallery/schema";

export type UpdatePhotoResult =
  | { ok: true }
  | { ok: false; code?: "unauthenticated" | "forbidden"; error: string };

/** 写真の説明と撮影日時を書き換える。input は `{ id, caption, takenAt }`。 */
export async function updatePhotoAction(input: unknown): Promise<UpdatePhotoResult> {
  const owner = await resolveGalleryOwner();
  if (!owner.ok) {
    return { ok: false, code: owner.code, error: owner.error };
  }
  const parsed = updatePhotoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "入力内容を確認してください" };
  }
  const { id, caption, takenAt } = parsed.data;

  // ギャラリーはサイト全体で 1 つなので、投稿した人に限らず持ち主なら誰でも直せる
  const updated = await db
    .update(galleryPhoto)
    // 作成時の created_at / updated_at は DB の時計で入るので、更新も DB の時計に揃える。
    // アプリ側の時計と混ぜると、時計のずれで更新後のほうが古く見えることがある
    .set({ caption, takenAt, updatedAt: sql`now()` })
    .where(eq(galleryPhoto.id, id))
    .returning({ id: galleryPhoto.id });
  if (updated.length === 0) {
    return { ok: false, error: "写真が見つかりません" };
  }

  updateTag(GALLERY_PHOTOS_CACHE_TAG);
  return { ok: true };
}
