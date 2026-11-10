import { resolveGalleryStorage } from "@/features/gallery/storage/resolve-gallery-storage";

/** 保存先が手元のディレクトリのときだけ、置いた写真を配信する。R2 を使うときは何も返さない。 */
export async function serveLocalGalleryFile({ key }: { key: string }) {
  const storageResult = resolveGalleryStorage();
  if (!storageResult.ok || storageResult.kind !== "local") {
    return new Response(null, { status: 404 });
  }
  let body: Buffer | null;
  try {
    body = await storageResult.storage.read({ key });
  } catch {
    // ディレクトリの外を指すキーは、存在しないものとして扱う
    return new Response(null, { status: 404 });
  }
  if (!body) {
    return new Response(null, { status: 404 });
  }
  return new Response(new Uint8Array(body), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "no-store" },
  });
}
