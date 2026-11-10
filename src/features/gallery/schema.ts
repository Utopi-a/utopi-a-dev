import { z } from "zod";
import type { GalleryPhotoExif } from "@/db/schema/gallery";

export const MAX_CAPTION_LENGTH = 500;

// 機種によっては 0 や桁外れの値を書くので、範囲を外れた項目は投稿ごと断らずにその項目だけ落とす。
const exifTextSchema = z
  .string()
  .transform((value) => value.replaceAll("\0", "").trim())
  .pipe(z.string().min(1).max(100))
  .optional()
  .catch(undefined);

function exifNumberSchema({ min, max }: { min: number; max: number }) {
  return z.number().gt(min).max(max).optional().catch(undefined);
}

const exifFields = {
  cameraMake: exifTextSchema,
  cameraModel: exifTextSchema,
  lensModel: exifTextSchema,
  focalLength: exifNumberSchema({ min: 0, max: 10_000 }),
  focalLength35mm: exifNumberSchema({ min: 0, max: 10_000 }),
  aperture: exifNumberSchema({ min: 0, max: 100 }),
  exposureTime: exifNumberSchema({ min: 0, max: 3600 }),
  iso: z
    .number()
    .transform((value) => Math.round(value))
    .pipe(z.number().int().min(1).max(10_000_000))
    .optional()
    .catch(undefined),
  exposureCompensation: z.number().min(-20).max(20).optional().catch(undefined),
} satisfies { [Key in keyof Required<GalleryPhotoExif>]: z.ZodType<GalleryPhotoExif[Key]> };

/**
 * 撮影情報。ここに挙げた項目だけを通し、位置情報などの未知のキーは落とす。
 * 残る項目が無ければ null にする。
 */
export const photoExifSchema = z.object(exifFields).transform((value): GalleryPhotoExif | null => {
  const entries = Object.entries(value).filter(([, field]) => field !== undefined);
  return entries.length === 0 ? null : Object.fromEntries(entries);
});

// フォームでは JSON 文字列で届く。読めないときは投稿ごと断る。
const exifJsonSchema = z
  .string()
  .transform((value, context) => {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      context.addIssue({ code: "custom", message: "撮影情報を JSON として読めません" });
      return z.NEVER;
    }
  })
  .pipe(photoExifSchema);

const captionSchema = z
  .string()
  .trim()
  .max(MAX_CAPTION_LENGTH)
  .transform((value) => (value === "" ? null : value));

// 時差の書かれていない日時は、どの地域の時刻か決められないので受け付けない。
const takenAtSchema = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

export const uploadPhotoFieldsSchema = z.object({
  file: z.instanceof(File),
  caption: captionSchema.nullable().default(null),
  takenAt: takenAtSchema.nullable().default(null),
  exif: exifJsonSchema.nullable().default(null),
});

export const updatePhotoSchema = z.object({
  id: z.string().min(1),
  caption: captionSchema.nullable(),
  takenAt: takenAtSchema.nullable(),
});

export const deletePhotoSchema = z.object({
  id: z.string().min(1),
});
