import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GalleryStorage } from "@/features/gallery/storage/gallery-storage";

export const LOCAL_FILE_URL_PREFIX = "/api/gallery/local-files";

export type LocalFileStorage = GalleryStorage & {
  read(options: { key: string }): Promise<Buffer | null>;
};

/** 開発とテスト用に、手元のディレクトリへ写真を置く保存先。 */
export function createLocalFileStorage({ directory }: { directory: string }): LocalFileStorage {
  // turbopackIgnore の理由は gallery-storage-env.ts の getGalleryStorageLocalDir と同じ
  const root = path.resolve(/*turbopackIgnore: true*/ directory);

  // key は配信の URL からも届くので、`..` や絶対パスでディレクトリの外を読み書きさせない
  function resolveInside({ key }: { key: string }) {
    const resolved = path.resolve(/*turbopackIgnore: true*/ root, key);
    if (key.length === 0 || key.includes("\0") || !resolved.startsWith(`${root}${path.sep}`)) {
      throw new Error("保存先の外を指すキーは使えません");
    }
    return resolved;
  }

  return {
    async put({ key, body }) {
      const filePath = resolveInside({ key });
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, body);
    },
    async remove({ keys }) {
      await Promise.all(keys.map((key) => rm(resolveInside({ key }), { force: true })));
    },
    async read({ key }) {
      try {
        return await readFile(resolveInside({ key }));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return null;
        }
        throw error;
      }
    },
    publicUrl({ key }) {
      return `${LOCAL_FILE_URL_PREFIX}/${key}`;
    },
  };
}
