import { AwsClient } from "aws4fetch";
import type { GalleryStorage } from "@/features/gallery/storage/gallery-storage";
import type { GalleryS3Config } from "@/features/gallery/storage/gallery-storage-env";

/** Cloudflare R2 を S3 互換 API で使う保存先。 */
export function createS3Storage({
  config,
  fetch = globalThis.fetch,
}: {
  config: GalleryS3Config;
  fetch?: typeof globalThis.fetch;
}): GalleryStorage {
  // 署名だけを aws4fetch に任せ、送信は自前で行う。AwsClient.fetch は 5xx を最大 10 回まで
  // 待ちながら再送するため、投稿の応答が長く止まるのを避ける。
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });

  function objectUrl({ key }: { key: string }) {
    const path = key.split("/").map(encodeURIComponent).join("/");
    return `${config.endpoint}/${encodeURIComponent(config.bucket)}/${path}`;
  }

  async function send({ url, init, action }: { url: string; init: RequestInit; action: string }) {
    const response = await fetch(await client.sign(url, init));
    if (!response.ok) {
      throw new Error(`保存先の${action}に失敗しました（${response.status}）`);
    }
  }

  return {
    async put({ key, body, contentType }) {
      await send({
        url: objectUrl({ key }),
        init: {
          method: "PUT",
          headers: {
            "Content-Type": contentType,
            // キーに写真 ID と幅が入り、同じキーの中身は変わらないので、ずっとキャッシュさせてよい
            "Cache-Control": "public, max-age=31536000, immutable",
          },
          // Buffer の型は SharedArrayBuffer も含みうるので fetch の本文型に合わない。ArrayBuffer へ写して渡す
          body: new Uint8Array(body),
        },
        action: "書き込み",
      });
    },
    async remove({ keys }) {
      await Promise.all(
        keys.map((key) =>
          send({ url: objectUrl({ key }), init: { method: "DELETE" }, action: "削除" }),
        ),
      );
    },
    publicUrl({ key }) {
      return `${config.publicUrl}/${key}`;
    },
  };
}
