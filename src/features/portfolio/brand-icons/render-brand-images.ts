/**
 * サイトのアバター・ファビコン・アプリアイコン・OGP 画像を、ゆーとぴあちゃんのロゴから書き出す。
 * OGP の文字はサイトの見出しと同じ Web フォントを Google Fonts から読んで組むので、実行にはネットワークが要る。
 *
 * pnpm icons:render
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const paper = "#FDFCFE";
const ink = "#1D1C23";
const hairline = "#E6E4EA";
// サイトの見出し（src/lib/theme/site-fonts.ts の siteDisplayFont）と同じ書体。書体を替えたらここも替えて描き直す
const openGraphFont = { family: "Shippori Mincho B1", weight: 600 };
const openGraphTexts = ["ゆーとぴあ", "utopi-a.dev"];
// 使う字だけを text= で頼み、和文の unicode-range の片を拾い損ねないようにする
const openGraphFontCssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
  openGraphFont.family,
)}:wght@${openGraphFont.weight}&text=${encodeURIComponent(openGraphTexts.join(""))}&display=block`;

// 原寸（5016px・約 23MB）はリポジトリに入れず、各サイズの元になる縮小版だけを置く
const logoPath = path.join(
  process.cwd(),
  "src",
  "features",
  "portfolio",
  "brand-icons",
  "source",
  "utopia-logo-1536.webp",
);
const publicDir = path.join(process.cwd(), "public");

// 16〜48px では全体を縮めると顔が数ピクセルになって判別できないため、頭まわりに寄せる。
// 髪の外側に地の濃い紫を少し残し、頭の輪郭が地から浮くようにしている（1536px の座標）
const faceCrop = { left: 200, top: 170, width: 1100, height: 1100 };

// 角を丸めると輪郭を見せている地の紫が削れて頭の形が崩れるので、四角のまま出す
async function renderFavicon({ size }: { size: number }) {
  return (
    sharp(logoPath)
      .extract(faceCrop)
      .resize(size, size, { kernel: "lanczos3" })
      // 縮小で目元が眠くなるのを、弱いシャープで戻す
      .sharpen({ sigma: 0.5 })
      // 元画像にアルファが無くても RGBA にする。ICO の中の PNG が RGB だと Next.js が読めずにビルドが落ちる
      .ensureAlpha()
      .png({ compressionLevel: 9 })
      .toBuffer()
  );
}

/** iOS・Android がマスクをかけるので、全面塗りのまま書き出す */
async function renderAppIcon({ size }: { size: number }) {
  return (
    sharp(logoPath)
      .resize(size, size, { kernel: "lanczos3" })
      // 減色しても見た目が変わらず、512px で 260KB → 100KB ほどに縮む
      .png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 })
      .toBuffer()
  );
}

function openGraphHtml({ logoDataUrl }: { logoDataUrl: string }) {
  return `<!doctype html>
<html><head><link rel="stylesheet" href="${openGraphFontCssUrl}"></head><body style="margin:0">
<div style="
  width:1200px;height:630px;box-sizing:border-box;padding:0 112px;background:${paper};
  display:flex;align-items:center;justify-content:space-between;color:${ink};
  font-family:'${openGraphFont.family}';font-weight:${openGraphFont.weight};">
  <div style="display:flex;flex-direction:column;gap:28px;white-space:nowrap;">
    <!-- Home の .pf-name と同じ字間（palt なし） -->
    <div style="font-size:112px;line-height:1.15;letter-spacing:-0.04em;">${openGraphTexts[0]}</div>
    <!-- ヘッダーの .site-brand と同じ扱い -->
    <div style="font-size:34px;letter-spacing:0.01em;">${openGraphTexts[1]}</div>
  </div>
  <img src="${logoDataUrl}" style="
    width:384px;height:384px;border-radius:12px;outline:2px solid ${hairline};outline-offset:-2px;" />
</div>
</body></html>`;
}

/** PNG をそのまま格納した ICO を組み立てる（主要ブラウザが対応する形式） */
function encodeIco({ images }: { images: Array<{ size: number; png: Buffer }> }): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries: Buffer[] = [];
  let offset = 6 + images.length * 16;
  for (const { size, png } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)]);
}

async function main() {
  // Home のヒーローは最大 192px で出すので、3x の画面まで荒れない 576px にする。配信時は next/image が縮める
  await sharp(logoPath)
    .resize(576, 576, { kernel: "lanczos3" })
    .webp({ quality: 88 })
    .toFile(path.join(publicDir, "utopia-avatar.webp"));

  const favicon16 = await renderFavicon({ size: 16 });
  const favicon32 = await renderFavicon({ size: 32 });
  const favicon48 = await renderFavicon({ size: 48 });
  await writeFile(path.join(publicDir, "favicon.png"), favicon32);
  await writeFile(path.join(publicDir, "icons", "site-icon-32.png"), favicon32);
  await writeFile(
    path.join(process.cwd(), "src", "app", "favicon.ico"),
    encodeIco({
      images: [
        { size: 16, png: favicon16 },
        { size: 32, png: favicon32 },
        { size: 48, png: favicon48 },
      ],
    }),
  );
  for (const size of [180, 192, 512]) {
    await writeFile(
      path.join(publicDir, "icons", `site-icon-${size}.png`),
      await renderAppIcon({ size }),
    );
  }

  // 置く大きさちょうどに sharp で縮めておき、ブラウザ側の縮小で線が粗くなるのを避ける
  const logo = await sharp(logoPath).resize(384, 384, { kernel: "lanczos3" }).png().toBuffer();
  const browser = await chromium.launch();
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { width: 1200, height: 630 },
  });
  await page.setContent(
    openGraphHtml({ logoDataUrl: `data:image/png;base64,${logo.toString("base64")}` }),
  );
  // 読み込みに失敗すると代わりの書体で黙って描かれるので、字形が揃って読めたかを確かめて止める
  const loadedFaceCount = await page.evaluate(
    async ({ family, weight, text }) =>
      (await document.fonts.load(`${weight} 112px "${family}"`, text)).length,
    { ...openGraphFont, text: openGraphTexts.join("") },
  );
  if (loadedFaceCount === 0) {
    throw new Error(
      `OGP の書体 ${openGraphFont.family} を読み込めませんでした: ${openGraphFontCssUrl}`,
    );
  }
  await page.screenshot({
    path: path.join(publicDir, "opengraph-image.jpg"),
    type: "jpeg",
    quality: 88,
  });
  await browser.close();

  console.log("Brand images written to public/ and src/app/favicon.ico");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
