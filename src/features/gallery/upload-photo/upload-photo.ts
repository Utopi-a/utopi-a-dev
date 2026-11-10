import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { galleryPhoto } from "@/db/schema/gallery";
import { GALLERY_PHOTOS_CACHE_TAG } from "@/features/gallery/list-photos/gallery-photos-cache-tag";
import { toGalleryPhoto } from "@/features/gallery/list-photos/to-gallery-photo";
import { resolveGalleryOwner } from "@/features/gallery/owner/resolve-gallery-owner";
import { processPhoto } from "@/features/gallery/process-photo/process-photo";
import { uploadPhotoFieldsSchema } from "@/features/gallery/schema";
import { buildPhotoVariantKey } from "@/features/gallery/storage/gallery-storage";
import { resolveGalleryStorage } from "@/features/gallery/storage/resolve-gallery-storage";

// Vercel の関数が受け取れるリクエスト本文の上限（4.5MB）に合わせる。
// これより大きいファイルは本番では関数に届く前に断られるので、手元でも同じ所で止める。
export const MAX_PHOTO_BYTES = 4_500_000;

function reject({ status, error, code }: { status: number; error: string; code?: string }) {
  return Response.json(code ? { error, code } : { error }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

// フォームの空欄は "" で届くので、未入力として扱う
function optionalText({ value }: { value: FormDataEntryValue | null }) {
  return value === null || value === "" ? null : value;
}

/** 写真の投稿。multipart/form-data の file（必須）・caption・takenAt・exif（JSON 文字列）を受け取る。 */
export async function uploadPhoto({ request }: { request: Request }) {
  if (request.headers.get("sec-fetch-site") !== "same-origin") {
    return reject({ status: 403, error: "このサイトのページからだけ投稿できます" });
  }
  const owner = await resolveGalleryOwner();
  if (!owner.ok) {
    return owner.code === "unauthenticated"
      ? reject({ status: 401, error: owner.error, code: owner.code })
      : reject({ status: 403, error: owner.error, code: owner.code });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reject({ status: 400, error: "投稿の形式を読み取れませんでした" });
  }
  const parsed = uploadPhotoFieldsSchema.safeParse({
    file: form.get("file") ?? undefined,
    caption: optionalText({ value: form.get("caption") }),
    takenAt: optionalText({ value: form.get("takenAt") }),
    exif: optionalText({ value: form.get("exif") }),
  });
  if (!parsed.success) {
    return reject({ status: 400, error: "画像ファイルと入力内容を確認してください" });
  }
  const { file, caption, takenAt, exif } = parsed.data;
  if (file.size > MAX_PHOTO_BYTES) {
    return reject({ status: 413, error: "画像は 4.5MB 以下にしてください" });
  }

  const storageResult = resolveGalleryStorage();
  if (!storageResult.ok) {
    return reject({ status: 503, error: storageResult.error });
  }
  const { storage } = storageResult;

  const processed = await processPhoto({ input: Buffer.from(await file.arrayBuffer()) });
  if (!processed.ok) {
    return reject({ status: 400, error: processed.error });
  }

  const id = crypto.randomUUID();
  const variants = processed.variants.map(({ width, height, body }) => ({
    key: buildPhotoVariantKey({ photoId: id, width }),
    width,
    height,
    body,
  }));
  const keys = variants.map(({ key }) => key);
  const largest = variants[variants.length - 1];

  let row: typeof galleryPhoto.$inferSelect;
  try {
    await Promise.all(
      variants.map(({ key, body }) => storage.put({ key, body, contentType: "image/webp" })),
    );
    [row] = await db
      .insert(galleryPhoto)
      .values({
        id,
        userId: owner.user.id,
        caption,
        takenAt,
        exif,
        width: largest.width,
        height: largest.height,
        variants: variants.map(({ key, width, height }) => ({ key, width, height })),
      })
      .returning();
  } catch (error) {
    // 行の無いファイルは一覧から辿れない残骸になるので、置いた分を片付けてから失敗を返す
    console.error("写真の保存に失敗しました", error);
    await storage.remove({ keys }).catch((removeError) => {
      console.error("保存に失敗した写真のファイルを消せませんでした", { keys, removeError });
    });
    return reject({ status: 500, error: "写真を保存できませんでした" });
  }

  revalidateTag(GALLERY_PHOTOS_CACHE_TAG, { expire: 0 });
  return Response.json(
    { photo: toGalleryPhoto({ row, storage }) },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
