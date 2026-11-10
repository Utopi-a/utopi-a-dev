import sharp from "sharp";

/** 作る画像の長辺。元がこれより小さければ、元の長辺のものを最後に 1 つ作る。 */
const LONG_EDGES = [640, 1280, 2560] as const;
const WEBP_QUALITY = 80;
// 展開後の画素数で上限を決める。ファイルが小さくても展開すると巨大になる画像でメモリを使い切らないため。
const MAX_INPUT_PIXELS = 50_000_000;
// Content-Type や拡張子は送る側がいくらでも偽れるので、中身を読んで判別した形式だけで決める。
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export type ProcessedPhotoVariant = {
  width: number;
  height: number;
  body: Buffer;
};

export type ProcessPhotoResult =
  | { ok: true; variants: ProcessedPhotoVariant[] }
  | { ok: false; reason: "unsupported-format" | "unreadable" | "too-large"; error: string };

const inputOptions = {
  limitInputPixels: MAX_INPUT_PIXELS,
  failOn: "error",
  autoOrient: true,
} as const;

function selectLongEdges({ longEdge }: { longEdge: number }) {
  const edges: number[] = LONG_EDGES.filter((edge) => edge < longEdge);
  const largest = Math.min(longEdge, LONG_EDGES[LONG_EDGES.length - 1]);
  if (!edges.includes(largest)) {
    edges.push(largest);
  }
  return edges;
}

async function readMetadata({ input }: { input: Buffer }) {
  try {
    return await sharp(input, inputOptions).metadata();
  } catch {
    return null;
  }
}

/**
 * 投稿された画像を、公開用の WebP 数サイズに変換する。
 * EXIF（撮影場所の GPS を含む）と ICC は出力に残さない。sharp は withMetadata 系を呼ばなければ
 * メタデータを書き出さないので、ここではそれらを呼ばないことで守っている。
 */
export async function processPhoto({ input }: { input: Buffer }): Promise<ProcessPhotoResult> {
  const metadata = await readMetadata({ input });
  if (!metadata) {
    return { ok: false, reason: "unreadable", error: "画像として読み取れませんでした" };
  }
  const { format, autoOrient } = metadata;
  if (!format || !ACCEPTED_FORMATS.has(format)) {
    return {
      ok: false,
      reason: "unsupported-format",
      error: "JPEG・PNG・WebP の画像だけを投稿できます",
    };
  }

  if (autoOrient.width * autoOrient.height > MAX_INPUT_PIXELS) {
    return { ok: false, reason: "too-large", error: "画像の画素数が多すぎます" };
  }

  const isLandscape = autoOrient.width >= autoOrient.height;
  const longEdge = Math.max(autoOrient.width, autoOrient.height);
  const variants: ProcessedPhotoVariant[] = [];
  try {
    // 1 サイズずつ順に作る。並行にすると大きな画像の展開が同時に走り、関数のメモリ上限に近づくため。
    for (const edge of selectLongEdges({ longEdge })) {
      const { data, info } = await sharp(input, inputOptions)
        .resize(isLandscape ? { width: edge } : { height: edge })
        .toColourspace("srgb")
        .webp({ quality: WEBP_QUALITY })
        .toBuffer({ resolveWithObject: true });
      variants.push({ width: info.width, height: info.height, body: data });
    }
    return { ok: true, variants };
  } catch {
    // metadata は読めても、本体が途中で壊れている画像は変換の段階で失敗する
    return { ok: false, reason: "unreadable", error: "画像として読み取れませんでした" };
  }
}
