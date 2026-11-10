import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

/** 保存先に置いた 1 サイズ分の画像。URL は保存先の設定から組み立てるので、ここにはキーだけを持つ。 */
export type GalleryPhotoStoredVariant = {
  key: string;
  width: number;
  height: number;
};

/**
 * 公開してよい撮影情報だけを持つ。位置情報・機体のシリアル番号・持ち主の名前のように
 * 人や場所を特定できる項目は、ここに足さない。
 */
export type GalleryPhotoExif = {
  cameraMake?: string;
  cameraModel?: string;
  lensModel?: string;
  /** mm */
  focalLength?: number;
  /** 35mm 判換算の mm */
  focalLength35mm?: number;
  /** F 値 */
  aperture?: number;
  /** 秒 */
  exposureTime?: number;
  iso?: number;
  /** EV */
  exposureCompensation?: number;
};

export const galleryPhoto = pgTable("gallery_photo", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  caption: text("caption"),
  takenAt: timestamp("taken_at"),
  // 最大サイズの寸法。一覧で縦横比から枠を先に確保するために持つ。
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  variants: jsonb("variants").$type<GalleryPhotoStoredVariant[]>().notNull(),
  exif: jsonb("exif").$type<GalleryPhotoExif>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
