// @vitest-environment node
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalFileStorage } from "@/features/gallery/storage/local-file-storage";
import { serveLocalGalleryFile } from "@/features/gallery/storage/serve-local-file";

let parent: string;
let directory: string;

beforeEach(async () => {
  parent = await mkdtemp(path.join(tmpdir(), "gallery-serve-"));
  directory = path.join(parent, "storage");
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("GALLERY_STORAGE_LOCAL_DIR", directory);
  for (const name of [
    "GALLERY_STORAGE_ENDPOINT",
    "GALLERY_STORAGE_BUCKET",
    "GALLERY_STORAGE_ACCESS_KEY_ID",
    "GALLERY_STORAGE_SECRET_ACCESS_KEY",
    "GALLERY_STORAGE_PUBLIC_URL",
  ]) {
    vi.stubEnv(name, "");
  }
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(parent, { recursive: true, force: true });
});

describe("serveLocalGalleryFile", () => {
  it("手元に置いた写真を WebP として返す", async () => {
    await createLocalFileStorage({ directory }).put({
      key: "photos/abc/640.webp",
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/webp",
    });

    const response = await serveLocalGalleryFile({ key: "photos/abc/640.webp" });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("無いキーとディレクトリの外を指すキーは 404", async () => {
    await writeFile(path.join(parent, "outside.webp"), "secret");

    expect((await serveLocalGalleryFile({ key: "photos/none/640.webp" })).status).toBe(404);
    expect((await serveLocalGalleryFile({ key: "../outside.webp" })).status).toBe(404);
  });

  it("R2 を使う設定のときは手元のファイルを返さない", async () => {
    await createLocalFileStorage({ directory }).put({
      key: "photos/abc/640.webp",
      body: new Uint8Array([1]),
      contentType: "image/webp",
    });
    vi.stubEnv("GALLERY_STORAGE_ENDPOINT", "https://account.r2.cloudflarestorage.com");
    vi.stubEnv("GALLERY_STORAGE_BUCKET", "gallery");
    vi.stubEnv("GALLERY_STORAGE_ACCESS_KEY_ID", "key-id");
    vi.stubEnv("GALLERY_STORAGE_SECRET_ACCESS_KEY", "secret");
    vi.stubEnv("GALLERY_STORAGE_PUBLIC_URL", "https://photos.example.com");

    expect((await serveLocalGalleryFile({ key: "photos/abc/640.webp" })).status).toBe(404);
  });
});
