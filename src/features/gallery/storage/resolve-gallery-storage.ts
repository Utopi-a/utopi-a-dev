import type { GalleryStorage } from "@/features/gallery/storage/gallery-storage";
import {
  getGalleryStorageLocalDir,
  readGalleryS3Env,
} from "@/features/gallery/storage/gallery-storage-env";
import {
  createLocalFileStorage,
  type LocalFileStorage,
} from "@/features/gallery/storage/local-file-storage";
import { createS3Storage } from "@/features/gallery/storage/s3-storage";

export type ResolveGalleryStorageResult =
  | { ok: true; kind: "s3"; storage: GalleryStorage }
  | { ok: true; kind: "local"; storage: LocalFileStorage }
  | { ok: false; error: string };

export function resolveGalleryStorage(): ResolveGalleryStorageResult {
  const env = readGalleryS3Env();
  if (env.status === "complete") {
    return { ok: true, kind: "s3", storage: createS3Storage({ config: env.config }) };
  }
  // 一部だけ設定されているのは書き間違いの可能性が高いので、黙って手元に保存せず止める。
  // 本番で未設定のまま手元のディレクトリへ書くと、関数の再起動で消えるので使わない。
  if (env.status === "empty" && process.env.NODE_ENV !== "production") {
    return {
      ok: true,
      kind: "local",
      storage: createLocalFileStorage({ directory: getGalleryStorageLocalDir() }),
    };
  }
  return { ok: false, error: "写真の保存先が設定されていません" };
}
