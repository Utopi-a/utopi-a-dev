import type { GalleryPhotoExif } from "@/features/gallery/photo";

// サーバーは 1 リクエスト 4.5MB までなので、余裕を見て 4MB に収める。
const maxUploadBytes = 4 * 1024 * 1024;
const maxLongEdge = 2560;
const jpegQualities = [0.9, 0.8, 0.7] as const;

// 公開する撮影情報のタグだけを読む。位置情報・シリアル番号・持ち主の名前などは読み込みもしない。
const exifTextTags = {
  cameraMake: "Make",
  cameraModel: "Model",
  lensModel: "LensModel",
} as const satisfies Partial<Record<keyof GalleryPhotoExif, string>>;

const exifNumberTags = {
  focalLength: "FocalLength",
  focalLength35mm: "FocalLengthIn35mmFormat",
  aperture: "FNumber",
  exposureTime: "ExposureTime",
  iso: "ISO",
  exposureCompensation: "ExposureCompensation",
} as const satisfies Partial<Record<keyof GalleryPhotoExif, string>>;

const exifPick = [
  "DateTimeOriginal",
  "OffsetTimeOriginal",
  ...Object.values(exifTextTags),
  ...Object.values(exifNumberTags),
];

export type PreparePhotoFileResult =
  | { ok: true; blob: Blob; takenAt: string | null; exif: GalleryPhotoExif | null }
  | { ok: false; error: string };

export function fitWithinLongEdge({
  width,
  height,
  maxLongEdge: limit,
}: {
  width: number;
  height: number;
  maxLongEdge: number;
}): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= limit) {
    return { width, height };
  }
  const scale = limit / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

const heicTypes = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

export function looksLikeHeic({ type, name }: { type: string; name: string }) {
  return heicTypes.has(type.toLowerCase()) || /\.(heic|heif)$/i.test(name);
}

/**
 * EXIF の日時（"2026:11:10 14:05:09"）を ISO 8601 にする。
 * 時差のタグがあればそれで、無ければ撮った端末と同じ地域で選んでいるとみなし、この端末の現地時刻として読む。
 */
export function exifDateTimeToIso({
  dateTime,
  offset,
}: {
  dateTime: string;
  offset?: string | null;
}): string | null {
  const match = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(dateTime.trim());
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second] = match;
  // 時計を合わせていないカメラは "0000:00:00 00:00:00" を書くので、撮影日が無いものとして扱う。
  if (Number(month) === 0 || Number(day) === 0) {
    return null;
  }
  const date =
    offset && /^[+-]\d{2}:\d{2}$/.test(offset)
      ? new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`)
      : new Date(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hour),
          Number(minute),
          Number(second),
        );
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function readExifText({ value }: { value: unknown }) {
  if (typeof value !== "string") {
    return undefined;
  }
  const text = value.replaceAll("\0", "").trim();
  return text === "" ? undefined : text;
}

// ISO などは機種によって複数の値の配列で書かれるので、先頭を使う。
function readExifNumber({ value }: { value: unknown }) {
  const first =
    ArrayBuffer.isView(value) || Array.isArray(value)
      ? Array.from(value as ArrayLike<unknown>)[0]
      : value;
  return typeof first === "number" && Number.isFinite(first) ? first : undefined;
}

/** exifr が返したタグ（reviveValues: false）から、公開してよい撮影情報だけを取り出す。 */
export function exifTagsToPhotoExif({
  tags,
}: {
  tags: Record<string, unknown> | null | undefined;
}): GalleryPhotoExif | null {
  if (!tags) {
    return null;
  }
  const exif: GalleryPhotoExif = {};
  for (const [field, tag] of Object.entries(exifTextTags)) {
    const value = readExifText({ value: tags[tag] });
    if (value !== undefined) {
      exif[field as keyof typeof exifTextTags] = value;
    }
  }
  for (const [field, tag] of Object.entries(exifNumberTags)) {
    const value = readExifNumber({ value: tags[tag] });
    if (value !== undefined) {
      exif[field as keyof typeof exifNumberTags] = value;
    }
  }
  return Object.keys(exif).length === 0 ? null : exif;
}

type PhotoMetadata = { takenAt: string | null; exif: GalleryPhotoExif | null };

async function readPhotoMetadata({ file }: { file: File }): Promise<PhotoMetadata> {
  try {
    const exifr = await import("exifr");
    const tags = await exifr.parse(file, { pick: exifPick, reviveValues: false });
    const dateTime = tags?.DateTimeOriginal;
    const offset = typeof tags?.OffsetTimeOriginal === "string" ? tags.OffsetTimeOriginal : null;
    return {
      takenAt: typeof dateTime === "string" ? exifDateTimeToIso({ dateTime, offset }) : null,
      exif: exifTagsToPhotoExif({ tags }),
    };
  } catch {
    // 撮影情報が読めなくても投稿は続ける。
    return { takenAt: null, exif: null };
  }
}

async function decodeImage({ file }: { file: File }): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // PC の Chrome / Firefox は HEIC を復号できないので、HEIC のときだけ復号器を読み込む。
    if (!looksLikeHeic({ type: file.type, name: file.name })) {
      return null;
    }
  }
  try {
    const { heicTo } = await import("heic-to");
    return await heicTo({ blob: file, type: "bitmap" });
  } catch {
    return null;
  }
}

function canvasToJpeg({
  canvas,
  quality,
}: {
  canvas: HTMLCanvasElement;
  quality: number;
}): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function preparePhotoFile({ file }: { file: File }): Promise<PreparePhotoFileResult> {
  const [{ takenAt, exif }, bitmap] = await Promise.all([
    readPhotoMetadata({ file }),
    decodeImage({ file }),
  ]);
  if (!bitmap) {
    return { ok: false, error: "この形式の画像は読み込めません" };
  }

  const size = fitWithinLongEdge({
    width: bitmap.width,
    height: bitmap.height,
    maxLongEdge,
  });
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return { ok: false, error: "画像を縮小できませんでした" };
  }
  // canvas に描き直すので、位置情報を含む EXIF はここで落ちる（最終的な保証はサーバー側）。
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();

  try {
    for (const quality of jpegQualities) {
      const blob = await canvasToJpeg({ canvas, quality });
      if (!blob) {
        return { ok: false, error: "画像を書き出せませんでした" };
      }
      if (blob.size <= maxUploadBytes) {
        return { ok: true, blob, takenAt, exif };
      }
    }
    return { ok: false, error: "画像が大きすぎて送れません" };
  } finally {
    // iOS Safari は canvas の合計メモリに上限があるため、使い終えたらすぐ手放す。
    canvas.width = 0;
    canvas.height = 0;
  }
}
