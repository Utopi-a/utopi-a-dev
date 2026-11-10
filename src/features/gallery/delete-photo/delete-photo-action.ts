"use server";

import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db } from "@/db";
import { galleryPhoto } from "@/db/schema/gallery";
import { GALLERY_PHOTOS_CACHE_TAG } from "@/features/gallery/list-photos/gallery-photos-cache-tag";
import { resolveGalleryOwner } from "@/features/gallery/owner/resolve-gallery-owner";
import { deletePhotoSchema } from "@/features/gallery/schema";
import { resolveGalleryStorage } from "@/features/gallery/storage/resolve-gallery-storage";

export type DeletePhotoResult =
  | { ok: true }
  | { ok: false; code?: "unauthenticated" | "forbidden"; error: string };

/** 写真を消す。input は `{ id }`。 */
export async function deletePhotoAction(input: unknown): Promise<DeletePhotoResult> {
  const owner = await resolveGalleryOwner();
  if (!owner.ok) {
    return { ok: false, code: owner.code, error: owner.error };
  }
  const parsed = deletePhotoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "削除する写真を指定してください" };
  }

  const [deleted] = await db
    .delete(galleryPhoto)
    .where(eq(galleryPhoto.id, parsed.data.id))
    .returning({ variants: galleryPhoto.variants });
  if (!deleted) {
    return { ok: false, error: "写真が見つかりません" };
  }
  updateTag(GALLERY_PHOTOS_CACHE_TAG);

  // 行が消えた時点で公開ページからは見えなくなり、残ったファイルは URL を知らなければ辿れないので害がない。
  // ファイルの削除に失敗しても、消したことは画面に成功として返し、片付けはログから行う。
  const keys = deleted.variants.map(({ key }) => key);
  const storageResult = resolveGalleryStorage();
  if (!storageResult.ok) {
    console.error("写真のファイルを消せませんでした（保存先が未設定）", { keys });
    return { ok: true };
  }
  try {
    await storageResult.storage.remove({ keys });
  } catch (error) {
    console.error("写真のファイルを消せませんでした", { keys, error });
  }
  return { ok: true };
}
