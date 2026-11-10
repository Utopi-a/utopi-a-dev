import path from "node:path";

export type GalleryS3Config = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
};

const S3_ENV_NAMES = {
  endpoint: "GALLERY_STORAGE_ENDPOINT",
  bucket: "GALLERY_STORAGE_BUCKET",
  accessKeyId: "GALLERY_STORAGE_ACCESS_KEY_ID",
  secretAccessKey: "GALLERY_STORAGE_SECRET_ACCESS_KEY",
  publicUrl: "GALLERY_STORAGE_PUBLIC_URL",
} as const satisfies Record<keyof GalleryS3Config, string>;

function readTrimmed({ name }: { name: string }) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

/** R2 の設定を読む。全部そろっているか、1 つも無いか、一部だけかを区別して返す。 */
export function readGalleryS3Env():
  | { status: "complete"; config: GalleryS3Config }
  | { status: "empty" }
  | { status: "partial"; missing: string[] } {
  const fields = Object.keys(S3_ENV_NAMES) as (keyof GalleryS3Config)[];
  const values = Object.fromEntries(
    fields.map((field) => [field, readTrimmed({ name: S3_ENV_NAMES[field] })]),
  ) as Record<keyof GalleryS3Config, string | null>;
  const { endpoint, bucket, accessKeyId, secretAccessKey, publicUrl } = values;
  if (endpoint && bucket && accessKeyId && secretAccessKey && publicUrl) {
    return {
      status: "complete",
      config: {
        // 末尾の / の有無で URL が二重スラッシュにならないよう揃える
        endpoint: endpoint.replace(/\/+$/, ""),
        bucket,
        accessKeyId,
        secretAccessKey,
        publicUrl: publicUrl.replace(/\/+$/, ""),
      },
    };
  }
  const missing = fields.filter((field) => values[field] === null).map((f) => S3_ENV_NAMES[f]);
  return missing.length === fields.length ? { status: "empty" } : { status: "partial", missing };
}

// turbopackIgnore: 実行時に決まるパスなので、ビルドの依存追跡の対象から外す。
// 外さないとプロジェクト全体が関数に同梱される（Vercel の関数サイズが膨らむ）
export function getGalleryStorageLocalDir() {
  return path.resolve(
    /*turbopackIgnore: true*/ readTrimmed({ name: "GALLERY_STORAGE_LOCAL_DIR" }) ??
      path.join(/*turbopackIgnore: true*/ process.cwd(), "tmp/gallery-storage"),
  );
}
