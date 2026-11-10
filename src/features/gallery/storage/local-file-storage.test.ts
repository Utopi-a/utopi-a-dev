// @vitest-environment node
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLocalFileStorage } from "@/features/gallery/storage/local-file-storage";

let parent: string;
let directory: string;

beforeEach(async () => {
  parent = await mkdtemp(path.join(tmpdir(), "gallery-local-storage-"));
  directory = path.join(parent, "storage");
});

afterEach(async () => {
  await rm(parent, { recursive: true, force: true });
});

describe("createLocalFileStorage", () => {
  it("置いたファイルを読めて、消したら読めなくなる", async () => {
    const storage = createLocalFileStorage({ directory });
    const body = new Uint8Array([7, 8, 9]);

    await storage.put({ key: "photos/abc/640.webp", body, contentType: "image/webp" });
    expect(new Uint8Array((await storage.read({ key: "photos/abc/640.webp" })) ?? [])).toEqual(
      body,
    );

    await storage.remove({ keys: ["photos/abc/640.webp"] });
    expect(await storage.read({ key: "photos/abc/640.webp" })).toBeNull();
  });

  it("無いキーを消しても失敗しない", async () => {
    const storage = createLocalFileStorage({ directory });
    await expect(storage.remove({ keys: ["photos/none/640.webp"] })).resolves.toBeUndefined();
  });

  it.each([
    "../outside.webp",
    "photos/../../outside.webp",
    "/etc/passwd",
    "",
  ])("ディレクトリの外を指すキー %j での書き込み・読み出し・削除を拒否する", async (key) => {
    const storage = createLocalFileStorage({ directory });
    await writeFile(path.join(parent, "outside.webp"), "secret");

    await expect(
      storage.put({ key, body: new Uint8Array([1]), contentType: "image/webp" }),
    ).rejects.toThrow();
    await expect(storage.read({ key })).rejects.toThrow();
    await expect(storage.remove({ keys: [key] })).rejects.toThrow();
    expect(await readdir(parent)).toEqual(["outside.webp"]);
  });

  it("公開 URL は配信用の API を指す", () => {
    const storage = createLocalFileStorage({ directory });
    expect(storage.publicUrl({ key: "photos/abc/640.webp" })).toBe(
      "/api/gallery/local-files/photos/abc/640.webp",
    );
  });
});
