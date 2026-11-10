import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveGalleryStorage } from "@/features/gallery/storage/resolve-gallery-storage";

const s3Env = {
  GALLERY_STORAGE_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  GALLERY_STORAGE_BUCKET: "gallery",
  GALLERY_STORAGE_ACCESS_KEY_ID: "key-id",
  GALLERY_STORAGE_SECRET_ACCESS_KEY: "secret",
  GALLERY_STORAGE_PUBLIC_URL: "https://photos.example.com",
};

function stubS3Env(values: Partial<typeof s3Env>) {
  for (const name of Object.keys(s3Env) as (keyof typeof s3Env)[]) {
    vi.stubEnv(name, values[name] ?? "");
  }
}

describe("resolveGalleryStorage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(["development", "production"])("NODE_ENV=%s でも 5 つそろえば R2 を使う", (nodeEnv) => {
    vi.stubEnv("NODE_ENV", nodeEnv);
    stubS3Env(s3Env);
    expect(resolveGalleryStorage()).toMatchObject({ ok: true, kind: "s3" });
  });

  it("本番以外で 1 つも無ければ手元のディレクトリを使う", () => {
    vi.stubEnv("NODE_ENV", "development");
    stubS3Env({});
    expect(resolveGalleryStorage()).toMatchObject({ ok: true, kind: "local" });
  });

  it("本番で未設定なら、手元に書かずに未設定として返す", () => {
    vi.stubEnv("NODE_ENV", "production");
    stubS3Env({});
    expect(resolveGalleryStorage()).toEqual({
      ok: false,
      error: "写真の保存先が設定されていません",
    });
  });

  it("一部だけの設定は、本番以外でも未設定として返す", () => {
    vi.stubEnv("NODE_ENV", "development");
    stubS3Env({ GALLERY_STORAGE_ENDPOINT: s3Env.GALLERY_STORAGE_ENDPOINT });
    expect(resolveGalleryStorage()).toMatchObject({ ok: false });
  });
});
