import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import postgres from "postgres";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// 認証（better-auth のセッション）と Next.js の実行環境だけを差し替え、DB・画像処理・保存先は本物を使う
const sessionState = vi.hoisted(() => ({ current: null as null | { id: string; email: string } }));

vi.mock("@/features/auth/get-session/get-session", () => ({
  getSession: async () => {
    const user = sessionState.current;
    if (!user) return null;
    return {
      session: {
        id: `session-${user.id}`,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000),
        token: "token",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      user: {
        ...user,
        name: "Integration User",
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  },
}));

const cacheCalls = vi.hoisted(() => ({
  updateTag: [] as string[],
  revalidateTag: [] as unknown[],
}));

vi.mock("next/cache", () => ({
  // テストは Next.js のリクエストの外で動くので、キャッシュは素通しにして無効化の呼び出しだけを記録する
  unstable_cache: <T>(fn: T) => fn,
  updateTag: (tag: string) => {
    cacheCalls.updateTag.push(tag);
  },
  revalidateTag: (...args: unknown[]) => {
    cacheCalls.revalidateTag.push(args);
  },
}));

const databaseName = `gallery_integration_${crypto.randomUUID().replaceAll("-", "")}`;
let admin: ReturnType<typeof postgres> | undefined;
let sql: ReturnType<typeof postgres>;
let databaseCreated = false;
let storageDir: string;
let getDb: typeof import("@/db").getDb | undefined;
let uploadPhoto: typeof import("@/features/gallery/upload-photo/upload-photo").uploadPhoto;
let queryGalleryPhotos: typeof import("@/features/gallery/list-photos/list-photos").queryGalleryPhotos;
let updatePhotoAction: typeof import("@/features/gallery/update-photo/update-photo-action").updatePhotoAction;
let deletePhotoAction: typeof import("@/features/gallery/delete-photo/delete-photo-action").deletePhotoAction;

const owner = { id: "gallery-owner", email: "owner@gallery-integration.invalid" };
const visitor = { id: "gallery-visitor", email: "visitor@gallery-integration.invalid" };

beforeAll(async () => {
  const databaseUrl = process.env.E2E_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("E2E_DATABASE_URL must point to a local PostgreSQL instance");
  }
  const target = new URL(databaseUrl);
  if (
    !["postgres:", "postgresql:"].includes(target.protocol) ||
    !["127.0.0.1", "localhost"].includes(target.hostname) ||
    target.search !== ""
  ) {
    throw new Error("Integration tests only allow PostgreSQL on 127.0.0.1 or localhost");
  }

  admin = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  await admin`create database ${admin(databaseName)}`;
  databaseCreated = true;
  target.pathname = `/${databaseName}`;
  sql = postgres(target.toString(), { max: 1, onnotice: () => {} });

  const migrationDirectory = path.resolve(import.meta.dirname, "../../drizzle");
  const journal = JSON.parse(
    await readFile(path.join(migrationDirectory, "meta/_journal.json"), "utf8"),
  ) as { entries: { tag: string }[] };
  for (const migration of journal.entries) {
    const source = await readFile(path.join(migrationDirectory, `${migration.tag}.sql`), "utf8");
    for (const statement of source.split("--> statement-breakpoint")) {
      if (statement.trim()) await sql.unsafe(statement);
    }
  }
  for (const user of [owner, visitor]) {
    await sql`insert into "user" (id, name, email, email_verified)
      values (${user.id}, 'Integration User', ${user.email}, true)`;
  }

  storageDir = await mkdtemp(path.join(tmpdir(), "gallery-integration-"));
  vi.stubEnv("DATABASE_URL", target.toString());
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("OWNER_EMAILS", owner.email.toUpperCase());
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
  ({ getDb } = await import("@/db"));
  ({ uploadPhoto } = await import("@/features/gallery/upload-photo/upload-photo"));
  ({ queryGalleryPhotos } = await import("@/features/gallery/list-photos/list-photos"));
  ({ updatePhotoAction } = await import("@/features/gallery/update-photo/update-photo-action"));
  ({ deletePhotoAction } = await import("@/features/gallery/delete-photo/delete-photo-action"));
});

afterAll(async () => {
  try {
    if (getDb) await getDb().$client.end({ timeout: 5 });
    if (sql) await sql.end({ timeout: 5 });
    if (admin && databaseCreated) await admin`drop database ${admin(databaseName)}`;
    if (storageDir) await rm(storageDir, { recursive: true, force: true });
  } finally {
    if (admin) await admin.end({ timeout: 5 });
    vi.unstubAllEnvs();
  }
});

beforeEach(() => {
  sessionState.current = owner;
  cacheCalls.updateTag.length = 0;
  cacheCalls.revalidateTag.length = 0;
});

async function jpegWithGps({ width, height }: { width: number; height: number }) {
  return sharp({ create: { width, height, channels: 3, background: "#5a8" } })
    .jpeg()
    .withExif({
      IFD0: { Make: "TestCam" },
      IFD3: {
        GPSLatitudeRef: "N",
        GPSLatitude: "36/1 5/1 0/1",
        GPSLongitudeRef: "E",
        GPSLongitude: "140/1 6/1 0/1",
      },
    })
    .toBuffer();
}

function uploadRequest({
  body,
  type,
  caption,
  takenAt,
  exif,
}: {
  body: Buffer;
  type: string;
  caption?: string;
  takenAt?: string;
  exif?: string;
}) {
  const form = new FormData();
  form.set("file", new File([new Uint8Array(body)], "photo", { type }));
  if (caption !== undefined) form.set("caption", caption);
  if (takenAt !== undefined) form.set("takenAt", takenAt);
  if (exif !== undefined) form.set("exif", exif);
  return new Request("http://localhost:3000/api/gallery/photos", {
    method: "POST",
    headers: { "sec-fetch-site": "same-origin" },
    body: form,
  });
}

async function listStoredFiles() {
  const photoDirs = await readdir(path.join(storageDir, "photos")).catch(() => [] as string[]);
  const files: string[] = [];
  for (const photoDir of photoDirs) {
    for (const file of await readdir(path.join(storageDir, "photos", photoDir))) {
      files.push(`photos/${photoDir}/${file}`);
    }
  }
  return files.sort();
}

async function photoRowCount() {
  const [{ count }] = await sql<
    { count: number }[]
  >`select count(*)::int as count from gallery_photo`;
  return count;
}

describe("gallery photo mutations against local PostgreSQL", () => {
  it("持ち主が投稿・一覧・編集・削除でき、保存したファイルに位置情報を残さない", async () => {
    const gpsJpeg = await jpegWithGps({ width: 3000, height: 2000 });
    expect((await sharp(gpsJpeg).metadata()).exif).toBeDefined();

    // 撮影日時のある古い写真
    const firstResponse = await uploadPhoto({
      request: uploadRequest({
        body: gpsJpeg,
        type: "image/jpeg",
        caption: "  田んぼの朝  ",
        takenAt: "2020-05-01T10:00:00+09:00",
      }),
    });
    expect(firstResponse.status).toBe(201);
    const { photo: first } = (await firstResponse.json()) as {
      photo: Awaited<ReturnType<typeof queryGalleryPhotos>>[number];
    };
    expect(first).toEqual({
      id: expect.any(String),
      caption: "田んぼの朝",
      takenAt: "2020-05-01T01:00:00.000Z",
      exif: null,
      width: 2560,
      height: 1707,
      variants: [640, 1280, 2560].map((width) => ({
        url: `/api/gallery/local-files/photos/${first.id}/${width}.webp`,
        width,
        height: expect.any(Number),
      })),
    });
    expect(cacheCalls.revalidateTag).toEqual([["gallery-photos", { expire: 0 }]]);

    const [row] = await sql`select user_id, caption, width, height, variants, exif
      from gallery_photo where id = ${first.id}`;
    expect(row).toMatchObject({
      user_id: owner.id,
      caption: "田んぼの朝",
      width: 2560,
      exif: null,
    });
    expect(row.variants.map((variant: { key: string }) => variant.key)).toEqual([
      `photos/${first.id}/640.webp`,
      `photos/${first.id}/1280.webp`,
      `photos/${first.id}/2560.webp`,
    ]);
    const storedFiles = await listStoredFiles();
    expect(storedFiles).toEqual([
      `photos/${first.id}/1280.webp`,
      `photos/${first.id}/2560.webp`,
      `photos/${first.id}/640.webp`,
    ]);
    for (const file of storedFiles) {
      const metadata = await sharp(await readFile(path.join(storageDir, file))).metadata();
      expect(metadata.format).toBe("webp");
      expect(metadata.exif).toBeUndefined();
    }

    // 撮影日時の無い写真は投稿日時（今）で並ぶので、2020 年の写真より前に来る
    const png = await sharp({
      create: { width: 300, height: 400, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    const secondResponse = await uploadPhoto({
      request: uploadRequest({ body: png, type: "image/png", caption: " ", takenAt: "" }),
    });
    expect(secondResponse.status).toBe(201);
    const { photo: second } = (await secondResponse.json()) as { photo: { id: string } };

    expect(await queryGalleryPhotos()).toEqual([
      {
        id: second.id,
        caption: null,
        takenAt: null,
        exif: null,
        width: 300,
        height: 400,
        variants: [
          {
            url: `/api/gallery/local-files/photos/${second.id}/300.webp`,
            width: 300,
            height: 400,
          },
        ],
      },
      first,
    ]);

    const [before] = await sql`select updated_at from gallery_photo where id = ${first.id}`;
    await expect(
      updatePhotoAction({ id: first.id, caption: "稲刈りの前", takenAt: null }),
    ).resolves.toEqual({ ok: true });
    expect(cacheCalls.updateTag).toEqual(["gallery-photos"]);
    const [after] = await sql`select caption, taken_at, updated_at
      from gallery_photo where id = ${first.id}`;
    expect(after.caption).toBe("稲刈りの前");
    expect(after.taken_at).toBeNull();
    expect(after.updated_at.getTime()).toBeGreaterThan(before.updated_at.getTime());

    await expect(deletePhotoAction({ id: first.id })).resolves.toEqual({ ok: true });
    expect(await sql`select id from gallery_photo where id = ${first.id}`).toEqual([]);
    expect(await listStoredFiles()).toEqual([`photos/${second.id}/300.webp`]);
    expect((await queryGalleryPhotos()).map(({ id }) => id)).toEqual([second.id]);

    await expect(deletePhotoAction({ id: first.id })).resolves.toEqual({
      ok: false,
      error: "写真が見つかりません",
    });
    await expect(
      updatePhotoAction({ id: first.id, caption: null, takenAt: null }),
    ).resolves.toEqual({ ok: false, error: "写真が見つかりません" });

    await expect(deletePhotoAction({ id: second.id })).resolves.toEqual({ ok: true });
    expect(await queryGalleryPhotos()).toEqual([]);
  });

  it("撮影情報は許可した項目だけを保存し、一覧に返す", async () => {
    const response = await uploadPhoto({
      request: uploadRequest({
        body: await jpegWithGps({ width: 800, height: 600 }),
        type: "image/jpeg",
        exif: JSON.stringify({
          cameraMake: "FUJIFILM",
          cameraModel: " X-T5 ",
          lensModel: "",
          focalLength: 23,
          aperture: 1.4,
          exposureTime: 0.004,
          iso: 160,
          exposureCompensation: -0.7,
          gpsLatitude: 36.08,
          serialNumber: "12345",
        }),
      }),
    });
    expect(response.status).toBe(201);
    const { photo } = (await response.json()) as { photo: { id: string; exif: unknown } };
    const expected = {
      cameraMake: "FUJIFILM",
      cameraModel: "X-T5",
      focalLength: 23,
      aperture: 1.4,
      exposureTime: 0.004,
      iso: 160,
      exposureCompensation: -0.7,
    };
    expect(photo.exif).toEqual(expected);

    const [row] = await sql`select exif from gallery_photo where id = ${photo.id}`;
    expect(row.exif).toEqual(expected);
    expect(Object.keys(row.exif)).not.toContain("gpsLatitude");
    expect((await queryGalleryPhotos()).find(({ id }) => id === photo.id)?.exif).toEqual(expected);

    // 許可した項目が 1 つも残らなければ null として保存する
    const emptied = await uploadPhoto({
      request: uploadRequest({
        body: await jpegWithGps({ width: 800, height: 600 }),
        type: "image/jpeg",
        exif: JSON.stringify({ gpsLatitude: 36.08 }),
      }),
    });
    expect(emptied.status).toBe(201);
    const { photo: emptiedPhoto } = (await emptied.json()) as { photo: { id: string } };
    const [emptiedRow] = await sql`select exif from gallery_photo where id = ${emptiedPhoto.id}`;
    expect(emptiedRow.exif).toBeNull();

    // 壊れた JSON は断り、行もファイルも増やさない
    const filesBefore = await listStoredFiles();
    const rejected = await uploadPhoto({
      request: uploadRequest({
        body: await jpegWithGps({ width: 800, height: 600 }),
        type: "image/jpeg",
        exif: "{",
      }),
    });
    expect(rejected.status).toBe(400);
    expect(await photoRowCount()).toBe(2);
    expect(await listStoredFiles()).toEqual(filesBefore);

    for (const id of [photo.id, emptiedPhoto.id]) {
      await expect(deletePhotoAction({ id })).resolves.toEqual({ ok: true });
    }
  });

  it.each([
    { label: "ログインしていない人", user: null, status: 401, code: "unauthenticated" },
    { label: "持ち主でない人", user: visitor, status: 403, code: "forbidden" },
  ])("$label の投稿・編集・削除は断り、行もファイルも増減しない", async ({
    user,
    status,
    code,
  }) => {
    const created = await uploadPhoto({
      request: uploadRequest({
        body: await jpegWithGps({ width: 800, height: 600 }),
        type: "image/jpeg",
      }),
    });
    expect(created.status).toBe(201);
    const { photo } = (await created.json()) as { photo: { id: string } };
    const filesBefore = await listStoredFiles();
    const [rowBefore] =
      await sql`select caption, updated_at from gallery_photo where id = ${photo.id}`;

    sessionState.current = user;

    const rejected = await uploadPhoto({
      request: uploadRequest({
        body: await jpegWithGps({ width: 800, height: 600 }),
        type: "image/jpeg",
      }),
    });
    expect(rejected.status).toBe(status);
    expect(await rejected.json()).toMatchObject({ code });
    await expect(
      updatePhotoAction({ id: photo.id, caption: "書き換え", takenAt: null }),
    ).resolves.toMatchObject({ ok: false, code });
    await expect(deletePhotoAction({ id: photo.id })).resolves.toMatchObject({ ok: false, code });

    expect(await photoRowCount()).toBe(1);
    expect(await listStoredFiles()).toEqual(filesBefore);
    expect(await sql`select caption, updated_at from gallery_photo where id = ${photo.id}`).toEqual(
      [rowBefore],
    );
    expect(cacheCalls.updateTag).toEqual([]);

    sessionState.current = owner;
    await expect(deletePhotoAction({ id: photo.id })).resolves.toEqual({ ok: true });
    expect(await listStoredFiles()).toEqual([]);
  });
});
