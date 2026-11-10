// @vitest-environment node
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { getSession } from "@/features/auth/get-session/get-session";
import { MAX_PHOTO_BYTES, uploadPhoto } from "@/features/gallery/upload-photo/upload-photo";

vi.mock("@/features/auth/get-session/get-session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: { insert: vi.fn() },
}));

const getSessionMock = vi.mocked(getSession);
const insertMock = vi.mocked(db.insert);

function sessionFor({ email }: { email: string }) {
  return {
    session: {
      id: "session-1",
      userId: "user-1",
      expiresAt: new Date(),
      token: "token",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    user: {
      id: "user-1",
      name: "テストユーザー",
      email,
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

function uploadRequest({
  site = "same-origin",
  file,
  exif,
}: {
  site?: string | null;
  file?: File;
  exif?: string;
}) {
  const form = new FormData();
  if (file) {
    form.set("file", file);
  }
  form.set("caption", "筑波山");
  if (exif !== undefined) {
    form.set("exif", exif);
  }
  const headers = new Headers();
  if (site) {
    headers.set("sec-fetch-site", site);
  }
  return new Request("http://localhost:3000/api/gallery/photos", {
    method: "POST",
    headers,
    body: form,
  });
}

async function jpegFile() {
  const body = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#48c" } })
    .jpeg()
    .toBuffer();
  return new File([new Uint8Array(body)], "photo.jpg", { type: "image/jpeg" });
}

let storageDir: string;

beforeEach(async () => {
  vi.clearAllMocks();
  storageDir = await mkdtemp(path.join(tmpdir(), "gallery-upload-"));
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("OWNER_EMAILS", "owner@example.com");
  vi.stubEnv("GALLERY_STORAGE_LOCAL_DIR", storageDir);
  for (const name of [
    "GALLERY_STORAGE_ENDPOINT",
    "GALLERY_STORAGE_BUCKET",
    "GALLERY_STORAGE_ACCESS_KEY_ID",
    "GALLERY_STORAGE_SECRET_ACCESS_KEY",
    "GALLERY_STORAGE_PUBLIC_URL",
  ]) {
    vi.stubEnv(name, "");
  }
  getSessionMock.mockResolvedValue(sessionFor({ email: "owner@example.com" }));
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(storageDir, { recursive: true, force: true });
});

async function expectNothingSaved() {
  expect(await readdir(storageDir)).toEqual([]);
  expect(insertMock).not.toHaveBeenCalled();
}

describe("uploadPhoto で投稿を断るとき", () => {
  it("ログインしていなければ 401 と code を返し、何も保存しない", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await uploadPhoto({ request: uploadRequest({ file: await jpegFile() }) });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: expect.any(String),
      code: "unauthenticated",
    });
    await expectNothingSaved();
  });

  it("持ち主でなければ 403 を返し、何も保存しない", async () => {
    getSessionMock.mockResolvedValue(sessionFor({ email: "visitor@example.com" }));

    const response = await uploadPhoto({ request: uploadRequest({ file: await jpegFile() }) });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "forbidden" });
    await expectNothingSaved();
  });

  it.each([
    "cross-site",
    "same-site",
    null,
  ])("sec-fetch-site が %s なら、ログインを確かめる前に 403 を返す", async (site) => {
    const response = await uploadPhoto({
      request: uploadRequest({ site, file: await jpegFile() }),
    });

    expect(response.status).toBe(403);
    expect(getSessionMock).not.toHaveBeenCalled();
    await expectNothingSaved();
  });

  it("ファイルが無ければ 400 を返し、何も保存しない", async () => {
    const response = await uploadPhoto({ request: uploadRequest({}) });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    await expectNothingSaved();
  });

  it("撮影情報が JSON として読めなければ 400 を返し、何も保存しない", async () => {
    const response = await uploadPhoto({
      request: uploadRequest({ file: await jpegFile(), exif: '{"cameraModel":"X-T5"' }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    await expectNothingSaved();
  });

  it("画像と名乗るだけの画像でないファイルなら 400 を返し、何も保存しない", async () => {
    const file = new File(["これは画像ではありません"], "photo.jpg", { type: "image/jpeg" });

    const response = await uploadPhoto({ request: uploadRequest({ file }) });

    expect(response.status).toBe(400);
    await expectNothingSaved();
  });

  it("上限を超えるファイルなら 413 を返し、何も保存しない", async () => {
    const file = new File([new Uint8Array(MAX_PHOTO_BYTES + 1)], "photo.jpg", {
      type: "image/jpeg",
    });

    const response = await uploadPhoto({ request: uploadRequest({ file }) });

    expect(response.status).toBe(413);
    await expectNothingSaved();
  });

  it("本番で保存先が未設定なら 503 を返し、何も保存しない", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await uploadPhoto({ request: uploadRequest({ file: await jpegFile() }) });

    expect(response.status).toBe(503);
    await expectNothingSaved();
  });
});

describe("uploadPhoto で DB への保存に失敗したとき", () => {
  it("置いたファイルを消してから 500 を返す", async () => {
    insertMock.mockImplementation(() => {
      throw new Error("connection refused");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await uploadPhoto({ request: uploadRequest({ file: await jpegFile() }) });

    expect(response.status).toBe(500);
    expect(insertMock).toHaveBeenCalledTimes(1);
    // 一度は置いたので写真ごとのディレクトリはできているが、中のファイルは 1 つも残さない
    const photoDirs = await readdir(path.join(storageDir, "photos"));
    expect(photoDirs).toHaveLength(1);
    expect(await readdir(path.join(storageDir, "photos", photoDirs[0]))).toEqual([]);
  });
});
