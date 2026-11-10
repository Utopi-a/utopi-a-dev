// @vitest-environment node
import exifr from "exifr";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processPhoto } from "@/features/gallery/process-photo/process-photo";

async function jpegWithGps({
  width,
  height,
  orientation = 1,
}: {
  width: number;
  height: number;
  orientation?: number;
}) {
  return sharp({ create: { width, height, channels: 3, background: "#4a7" } })
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
    .withMetadata({ orientation })
    .toBuffer();
}

async function processOk({ input }: { input: Buffer }) {
  const result = await processPhoto({ input });
  if (!result.ok) {
    throw new Error(`変換に失敗しました: ${result.error}`);
  }
  return result.variants;
}

describe("processPhoto", () => {
  it("GPS 入りの EXIF を持つ JPEG から、どのサイズにも EXIF と ICC を残さない WebP を作る", async () => {
    const input = await jpegWithGps({ width: 3000, height: 2000 });
    // 入力に本当に位置情報が入っていることを先に確かめておく（入っていなければこのテストは意味をなさない）
    expect(await exifr.gps(input)).toMatchObject({ latitude: expect.any(Number) });

    const variants = await processOk({ input });

    expect(variants.length).toBeGreaterThan(1);
    for (const variant of variants) {
      const metadata = await sharp(variant.body).metadata();
      expect(metadata.format).toBe("webp");
      expect(metadata.exif).toBeUndefined();
      expect(metadata.icc).toBeUndefined();
      expect(metadata.xmp).toBeUndefined();
    }
  });

  it.each([
    {
      source: { width: 4000, height: 3000 },
      expected: [
        { width: 640, height: 480 },
        { width: 1280, height: 960 },
        { width: 2560, height: 1920 },
      ],
    },
    {
      source: { width: 1000, height: 750 },
      expected: [
        { width: 640, height: 480 },
        { width: 1000, height: 750 },
      ],
    },
    {
      source: { width: 500, height: 375 },
      expected: [{ width: 500, height: 375 }],
    },
  ])("長辺 $source.width の元から、元より大きくないサイズだけを幅の昇順で作る", async ({
    source,
    expected,
  }) => {
    const input = await jpegWithGps(source);

    const variants = await processOk({ input });

    expect(variants.map(({ width, height }) => ({ width, height }))).toEqual(expected);
    for (const variant of variants) {
      const metadata = await sharp(variant.body).metadata();
      expect({ width: metadata.width, height: metadata.height }).toEqual({
        width: variant.width,
        height: variant.height,
      });
    }
  });

  it("EXIF の向き（orientation 6）を反映して縦長にし、出力には向きの情報を残さない", async () => {
    const input = await jpegWithGps({ width: 1000, height: 500, orientation: 6 });

    const variants = await processOk({ input });

    expect(variants.map(({ width, height }) => ({ width, height }))).toEqual([
      { width: 320, height: 640 },
      { width: 500, height: 1000 },
    ]);
    const metadata = await sharp(variants[1].body).metadata();
    expect(metadata.orientation).toBeUndefined();
  });

  it("PNG と WebP も受け付ける", async () => {
    const base = sharp({ create: { width: 200, height: 100, channels: 4, background: "#fff0" } });
    for (const input of [
      await base.clone().png().toBuffer(),
      await base.clone().webp().toBuffer(),
    ]) {
      const variants = await processOk({ input });
      expect(variants.map(({ width, height }) => ({ width, height }))).toEqual([
        { width: 200, height: 100 },
      ]);
    }
  });

  it("画像と偽ったテキストを拒否する", async () => {
    const result = await processPhoto({ input: Buffer.from("これは画像ではありません") });
    expect(result).toMatchObject({ ok: false, reason: "unreadable" });
  });

  it("SVG と GIF を、読める画像でも拒否する", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
    );
    const gif = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "#000" },
    })
      .gif()
      .toBuffer();

    for (const input of [svg, gif]) {
      expect(await processPhoto({ input })).toMatchObject({
        ok: false,
        reason: "unsupported-format",
      });
    }
  });

  it("途中で切れた JPEG を拒否する", async () => {
    const input = await jpegWithGps({ width: 800, height: 600 });
    const truncated = input.subarray(0, Math.floor(input.length / 2));

    expect(await processPhoto({ input: truncated })).toMatchObject({
      ok: false,
      reason: "unreadable",
    });
  });
});
