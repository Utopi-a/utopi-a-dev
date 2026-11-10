import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getGalleryStorageLocalDir,
  readGalleryS3Env,
} from "@/features/gallery/storage/gallery-storage-env";

const fullEnv = {
  GALLERY_STORAGE_ENDPOINT: "https://account.r2.cloudflarestorage.com/",
  GALLERY_STORAGE_BUCKET: "gallery",
  GALLERY_STORAGE_ACCESS_KEY_ID: "key-id",
  GALLERY_STORAGE_SECRET_ACCESS_KEY: "secret",
  GALLERY_STORAGE_PUBLIC_URL: " https://photos.example.com/ ",
};

function stubEnvs(values: Record<string, string>) {
  for (const [name, value] of Object.entries(values)) {
    vi.stubEnv(name, value);
  }
}

describe("readGalleryS3Env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("5 つそろえば、前後の空白と末尾の / を除いて返す", () => {
    stubEnvs(fullEnv);
    expect(readGalleryS3Env()).toEqual({
      status: "complete",
      config: {
        endpoint: "https://account.r2.cloudflarestorage.com",
        bucket: "gallery",
        accessKeyId: "key-id",
        secretAccessKey: "secret",
        publicUrl: "https://photos.example.com",
      },
    });
  });

  it("1 つも無ければ empty（空文字と空白だけも無いものとみなす）", () => {
    stubEnvs(Object.fromEntries(Object.keys(fullEnv).map((name) => [name, " "])));
    expect(readGalleryS3Env()).toEqual({ status: "empty" });
  });

  it("一部だけなら、足りない名前を返す", () => {
    stubEnvs({ ...fullEnv, GALLERY_STORAGE_BUCKET: "", GALLERY_STORAGE_PUBLIC_URL: "" });
    expect(readGalleryS3Env()).toEqual({
      status: "partial",
      missing: ["GALLERY_STORAGE_BUCKET", "GALLERY_STORAGE_PUBLIC_URL"],
    });
  });
});

describe("getGalleryStorageLocalDir", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("未設定ならリポジトリの tmp/gallery-storage", () => {
    vi.stubEnv("GALLERY_STORAGE_LOCAL_DIR", "");
    expect(getGalleryStorageLocalDir()).toBe(path.join(process.cwd(), "tmp/gallery-storage"));
  });

  it("GALLERY_STORAGE_LOCAL_DIR で変えられる", () => {
    vi.stubEnv("GALLERY_STORAGE_LOCAL_DIR", "/var/tmp/gallery");
    expect(getGalleryStorageLocalDir()).toBe("/var/tmp/gallery");
  });
});
