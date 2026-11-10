// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  deletePhotoSchema,
  MAX_CAPTION_LENGTH,
  photoExifSchema,
  updatePhotoSchema,
  uploadPhotoFieldsSchema,
} from "@/features/gallery/schema";

const file = new File([new Uint8Array([1, 2, 3])], "photo.jpg", { type: "image/jpeg" });

const fullExif = {
  cameraMake: "FUJIFILM",
  cameraModel: "X-T5",
  lensModel: "XF23mmF1.4 R LM WR",
  focalLength: 23,
  focalLength35mm: 35,
  aperture: 1.4,
  exposureTime: 0.004,
  iso: 160,
  exposureCompensation: -0.7,
};

describe("uploadPhotoFieldsSchema", () => {
  it("ファイルだけでも通り、説明・撮影日時・撮影情報は null になる", () => {
    expect(uploadPhotoFieldsSchema.parse({ file })).toEqual({
      file,
      caption: null,
      takenAt: null,
      exif: null,
    });
  });

  it("撮影情報は JSON 文字列で受け取る", () => {
    expect(uploadPhotoFieldsSchema.parse({ file, exif: JSON.stringify(fullExif) }).exif).toEqual(
      fullExif,
    );
  });

  it.each([
    "{",
    "not json",
    "null",
    "[]",
    '"X-T5"',
    "160",
  ])("JSON として読めない・オブジェクトでない撮影情報 %s を拒否する", (exif) => {
    expect(uploadPhotoFieldsSchema.safeParse({ file, exif }).success).toBe(false);
  });

  it("説明の前後の空白を除き、撮影日時を Date にする", () => {
    const parsed = uploadPhotoFieldsSchema.parse({
      file,
      caption: "  夕方の筑波山  ",
      takenAt: "2026-10-01T17:30:00+09:00",
    });
    expect(parsed.caption).toBe("夕方の筑波山");
    expect(parsed.takenAt?.toISOString()).toBe("2026-10-01T08:30:00.000Z");
  });

  it("空白だけの説明は null にする", () => {
    expect(uploadPhotoFieldsSchema.parse({ file, caption: " \n " }).caption).toBeNull();
  });

  it(`説明は ${MAX_CAPTION_LENGTH} 文字まで`, () => {
    expect(
      uploadPhotoFieldsSchema.safeParse({ file, caption: "あ".repeat(MAX_CAPTION_LENGTH) }).success,
    ).toBe(true);
    expect(
      uploadPhotoFieldsSchema.safeParse({ file, caption: "あ".repeat(MAX_CAPTION_LENGTH + 1) })
        .success,
    ).toBe(false);
  });

  it.each([
    "2026-10-01",
    "2026-10-01T17:30:00",
    "昨日",
  ])("時差の分からない・日時でない撮影日時 %s を拒否する", (takenAt) => {
    expect(uploadPhotoFieldsSchema.safeParse({ file, takenAt }).success).toBe(false);
  });

  it("ファイルでないものを拒否する", () => {
    expect(uploadPhotoFieldsSchema.safeParse({ file: "photo.jpg" }).success).toBe(false);
    expect(uploadPhotoFieldsSchema.safeParse({}).success).toBe(false);
  });
});

describe("photoExifSchema", () => {
  it("許可した項目をそのまま通す", () => {
    expect(photoExifSchema.parse(fullExif)).toEqual(fullExif);
  });

  it("位置情報などの未知のキーは落とす", () => {
    expect(
      photoExifSchema.parse({
        cameraModel: "X-T5",
        gpsLatitude: 36.08,
        GPSLongitude: 140.1,
        serialNumber: "12345",
        ownerName: "持ち主",
      }),
    ).toEqual({ cameraModel: "X-T5" });
  });

  it("文字列は前後の空白と NUL を除き、空になった項目と 100 文字を超える項目は落とす", () => {
    expect(
      photoExifSchema.parse({
        cameraMake: " FUJIFILM\0 ",
        cameraModel: "   ",
        lensModel: "L".repeat(101),
      }),
    ).toEqual({ cameraMake: "FUJIFILM" });
    expect(photoExifSchema.parse({ lensModel: "L".repeat(100) })).toEqual({
      lensModel: "L".repeat(100),
    });
  });

  it.each([
    { field: "focalLength", ok: [0.1, 10000], ng: [0, -1, 10000.1] },
    { field: "focalLength35mm", ok: [1, 10000], ng: [0, 10001] },
    { field: "aperture", ok: [0.95, 100], ng: [0, 100.1] },
    { field: "exposureTime", ok: [1 / 8000, 3600], ng: [0, 3601] },
    { field: "iso", ok: [1, 10_000_000], ng: [0, 0.4, 10_000_001] },
    { field: "exposureCompensation", ok: [-20, 0, 20], ng: [-20.1, 20.1] },
  ])("$field は範囲内だけを通し、範囲外はその項目だけ落とす", ({ field, ok, ng }) => {
    for (const value of ok) {
      expect(photoExifSchema.parse({ cameraModel: "X-T5", [field]: value })).toEqual({
        cameraModel: "X-T5",
        [field]: value,
      });
    }
    for (const value of ng) {
      expect(photoExifSchema.parse({ cameraModel: "X-T5", [field]: value })).toEqual({
        cameraModel: "X-T5",
      });
    }
  });

  it("型の違う項目は落とす", () => {
    expect(
      photoExifSchema.parse({ cameraModel: 5, iso: "160", aperture: null, focalLength: 23 }),
    ).toEqual({ focalLength: 23 });
  });

  it("ISO は整数に丸める", () => {
    expect(photoExifSchema.parse({ iso: 159.6 })).toEqual({ iso: 160 });
  });

  it("残る項目が無ければ null にする", () => {
    expect(photoExifSchema.parse({})).toBeNull();
    expect(photoExifSchema.parse({ gpsLatitude: 36.08, cameraModel: " ", iso: 0 })).toBeNull();
  });
});

describe("updatePhotoSchema", () => {
  it("説明と撮影日時を null で消せる", () => {
    expect(updatePhotoSchema.parse({ id: "photo-1", caption: null, takenAt: null })).toEqual({
      id: "photo-1",
      caption: null,
      takenAt: null,
    });
  });

  it("id がない・説明と撮影日時を省いたものを拒否する", () => {
    expect(updatePhotoSchema.safeParse({ id: "", caption: null, takenAt: null }).success).toBe(
      false,
    );
    expect(updatePhotoSchema.safeParse({ id: "photo-1" }).success).toBe(false);
  });
});

describe("deletePhotoSchema", () => {
  it("id を必須にする", () => {
    expect(deletePhotoSchema.parse({ id: "photo-1" })).toEqual({ id: "photo-1" });
    expect(deletePhotoSchema.safeParse({}).success).toBe(false);
  });
});
