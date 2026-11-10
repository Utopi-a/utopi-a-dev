import { desc, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { galleryPhoto } from "@/db/schema/gallery";
import { GALLERY_PHOTOS_CACHE_TAG } from "@/features/gallery/list-photos/gallery-photos-cache-tag";
import { toGalleryPhoto } from "@/features/gallery/list-photos/to-gallery-photo";
import type { GalleryPhoto } from "@/features/gallery/photo";
import { resolveGalleryStorage } from "@/features/gallery/storage/resolve-gallery-storage";

/** 写真を新しい順に全件返す。撮影日時が無い写真は投稿日時で並べる。 */
export async function queryGalleryPhotos(): Promise<GalleryPhoto[]> {
  const rows = await db
    .select({
      id: galleryPhoto.id,
      caption: galleryPhoto.caption,
      takenAt: galleryPhoto.takenAt,
      exif: galleryPhoto.exif,
      width: galleryPhoto.width,
      height: galleryPhoto.height,
      variants: galleryPhoto.variants,
    })
    .from(galleryPhoto)
    .orderBy(
      desc(sql`coalesce(${galleryPhoto.takenAt}, ${galleryPhoto.createdAt})`),
      desc(galleryPhoto.createdAt),
      galleryPhoto.id,
    );
  // 保存先が未設定の本番でも、写真が無いうちは公開ページを表示できるよう、行があるときだけ解決する
  if (rows.length === 0) {
    return [];
  }
  const storageResult = resolveGalleryStorage();
  if (!storageResult.ok) {
    throw new Error(storageResult.error);
  }
  return rows.map((row) => toGalleryPhoto({ row, storage: storageResult.storage }));
}

/**
 * 公開ページ用の一覧。DB が別リージョンにあり来訪のたびに往復させないため、
 * 投稿・編集・削除でタグが無効化されるまで結果をキャッシュする。
 * キャッシュはデプロイをまたいで残るので、保存先の公開 URL を変えたときなど、
 * タグの無効化を通らない変更も 1 時間で反映されるよう期限を付ける。
 */
export const listGalleryPhotos = unstable_cache(queryGalleryPhotos, ["gallery-photos"], {
  tags: [GALLERY_PHOTOS_CACHE_TAG],
  revalidate: 3600,
});
