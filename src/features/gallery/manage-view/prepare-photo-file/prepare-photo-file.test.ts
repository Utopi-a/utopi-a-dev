import { describe, expect, it } from "vitest";
import {
  exifDateTimeToIso,
  exifTagsToPhotoExif,
  fitWithinLongEdge,
  looksLikeHeic,
} from "./prepare-photo-file";

// exifr.parse(file, { pick, reviveValues: false }) が返す形。有理数は割り算済みの数値で届く。
describe("exifTagsToPhotoExif", () => {
  it("iPhone のタグを撮影情報にする", () => {
    expect(
      exifTagsToPhotoExif({
        tags: {
          Make: "Apple",
          Model: "iPhone 15 Pro",
          LensModel: "iPhone 15 Pro back triple camera 6.765mm f/1.78",
          FocalLength: 6.765,
          FocalLengthIn35mmFormat: 24,
          FNumber: 1.78,
          ExposureTime: 1 / 120,
          ISO: 50,
          ExposureCompensation: 0,
          DateTimeOriginal: "2026:10:03 10:00:00",
          OffsetTimeOriginal: "+09:00",
        },
      }),
    ).toEqual({
      cameraMake: "Apple",
      cameraModel: "iPhone 15 Pro",
      lensModel: "iPhone 15 Pro back triple camera 6.765mm f/1.78",
      focalLength: 6.765,
      focalLength35mm: 24,
      aperture: 1.78,
      exposureTime: 1 / 120,
      iso: 50,
      exposureCompensation: 0,
    });
  });

  it("ミラーレスのタグから空白と NUL を除き、配列の ISO は先頭を使い、壊れた値は落とす", () => {
    expect(
      exifTagsToPhotoExif({
        tags: {
          Make: "FUJIFILM\0",
          Model: "  X-T5  ",
          LensModel: "   ",
          FocalLength: 23,
          FNumber: Number.NaN,
          ExposureTime: "1/250",
          ISO: new Uint16Array([160, 0]),
          ExposureCompensation: -2 / 3,
        },
      }),
    ).toEqual({
      cameraMake: "FUJIFILM",
      cameraModel: "X-T5",
      focalLength: 23,
      iso: 160,
      exposureCompensation: -2 / 3,
    });
  });

  it("位置情報などの対象外のタグは拾わない", () => {
    expect(
      exifTagsToPhotoExif({
        tags: { GPSLatitude: 36.08, SerialNumber: "12345", Artist: "持ち主", ISO: 200 },
      }),
    ).toEqual({ iso: 200 });
  });

  it("EXIF が無い・撮影情報のタグが 1 つも無ければ null", () => {
    expect(exifTagsToPhotoExif({ tags: undefined })).toBeNull();
    expect(exifTagsToPhotoExif({ tags: { DateTimeOriginal: "2026:10:03 10:00:00" } })).toBeNull();
  });
});

describe("fitWithinLongEdge", () => {
  it("長辺が上限以下ならそのままの寸法を返す", () => {
    expect(fitWithinLongEdge({ width: 2560, height: 1440, maxLongEdge: 2560 })).toEqual({
      width: 2560,
      height: 1440,
    });
  });

  it("横長は幅を上限に合わせ、縦横比を保って縮める", () => {
    expect(fitWithinLongEdge({ width: 4032, height: 3024, maxLongEdge: 2560 })).toEqual({
      width: 2560,
      height: 1920,
    });
  });

  it("縦長は高さを上限に合わせる", () => {
    expect(fitWithinLongEdge({ width: 3024, height: 4032, maxLongEdge: 2560 })).toEqual({
      width: 1920,
      height: 2560,
    });
  });

  it("極端に細長くても短辺を 1px 未満にしない", () => {
    expect(fitWithinLongEdge({ width: 100000, height: 10, maxLongEdge: 2560 })).toEqual({
      width: 2560,
      height: 1,
    });
  });
});

describe("looksLikeHeic", () => {
  it.each([
    { type: "image/heic", name: "IMG_0001.HEIC" },
    { type: "image/heif", name: "photo" },
    { type: "", name: "IMG_0001.heic" },
    { type: "", name: "IMG_0001.HEIF" },
  ])("$type / $name は HEIC とみなす", ({ type, name }) => {
    expect(looksLikeHeic({ type, name })).toBe(true);
  });

  it.each([
    { type: "image/jpeg", name: "IMG_0001.jpg" },
    { type: "image/png", name: "heic.png" },
    { type: "", name: "notes.txt" },
  ])("$type / $name は HEIC とみなさない", ({ type, name }) => {
    expect(looksLikeHeic({ type, name })).toBe(false);
  });
});

describe("exifDateTimeToIso", () => {
  it("時差のタグがあればその時差で読む", () => {
    expect(exifDateTimeToIso({ dateTime: "2026:11:10 14:05:09", offset: "+09:00" })).toBe(
      "2026-11-10T05:05:09.000Z",
    );
  });

  it("時差のタグが無ければこの端末の現地時刻として読む", () => {
    expect(exifDateTimeToIso({ dateTime: "2026:11:10 14:05:09" })).toBe(
      new Date(2026, 10, 10, 14, 5, 9).toISOString(),
    );
  });

  it("時計を合わせていないカメラの空の日時は null を返す", () => {
    expect(exifDateTimeToIso({ dateTime: "0000:00:00 00:00:00" })).toBeNull();
  });

  it("形式が違えば null を返す", () => {
    expect(exifDateTimeToIso({ dateTime: "unknown" })).toBeNull();
    expect(exifDateTimeToIso({ dateTime: "2026-11-10" })).toBeNull();
  });
});
