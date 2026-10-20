/**
 * サイトのファビコン・アプリアイコン・OGP 画像を HTML から描画して書き出す。
 * サイト本体と同じ端末内蔵の明朝で組むため、ヒラギノ明朝のある macOS で実行する。
 *
 * pnpm icons:render
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const paper = "#FDFCFE";
const ink = "#1D1C23";
const muted = "#696770";
const wisteria = "#724EA0";
// style 属性の中に埋め込むため、書体名は単引用符で囲む
const mincho = `'Hiragino Mincho ProN', 'Yu Mincho', serif`;

const publicDir = path.join(process.cwd(), "public");

/** 明朝の「ゆ」に、名前の傍点と同じ藤色の点を一つ添える */
function iconHtml({ size, rounded }: { size: number; rounded: boolean }) {
  return `<!doctype html>
<html><body style="margin:0">
<div style="
  width:${size}px;height:${size}px;box-sizing:border-box;
  background:${paper};border-radius:${rounded ? "22%" : "0"};
  display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;">
  <span style="
    font-family:${mincho};font-weight:600;color:${ink};
    font-size:${size * 0.78}px;line-height:1;transform:translate(-2%, 3%);">ゆ</span>
  <span style="
    position:absolute;top:${size * 0.13}px;right:${size * 0.16}px;
    width:${size * 0.13}px;height:${size * 0.13}px;border-radius:50%;background:${wisteria};"></span>
</div>
</body></html>`;
}

function openGraphHtml({ avatarDataUrl }: { avatarDataUrl: string }) {
  return `<!doctype html>
<html><body style="margin:0">
<div style="
  width:1200px;height:630px;box-sizing:border-box;padding:0 104px 0 112px;background:${paper};
  display:flex;align-items:center;justify-content:space-between;font-family:${mincho};color:${ink};">
  <div style="display:flex;flex-direction:column;gap:36px;">
    <div style="
      font-size:128px;font-weight:600;line-height:1.25;letter-spacing:0.04em;
      text-emphasis:'·' ${wisteria};">ゆーとぴあ</div>
    <div style="font-size:30px;letter-spacing:0.14em;color:${muted};">utopi-a.dev</div>
  </div>
  <img src="${avatarDataUrl}" style="width:232px;height:232px;border-radius:50%;box-shadow:0 0 0 2px #E6E4EA;" />
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
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  const renderIcon = async ({ size, rounded }: { size: number; rounded: boolean }) => {
    // 小さいサイズは大きく描いて縮め、明朝の細い線を潰さない
    const drawSize = Math.max(size, 512);
    await page.setViewportSize({ width: drawSize, height: drawSize });
    await page.setContent(iconHtml({ size: drawSize, rounded }));
    await page.evaluate(() => document.fonts.ready);
    const shot = await page.screenshot({ omitBackground: true, type: "png" });
    return sharp(shot).resize(size, size).png().toBuffer();
  };

  // ホーム画面やタブ用は角丸、iOS・Android がマスクをかけるアプリアイコンは全面塗り
  const favicon16 = await renderIcon({ size: 16, rounded: true });
  const favicon32 = await renderIcon({ size: 32, rounded: true });
  const favicon48 = await renderIcon({ size: 48, rounded: true });
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
      await renderIcon({ size, rounded: false }),
    );
  }

  const avatar = await readFile(path.join(publicDir, "p0zKKXuf_400x400.jpg"));
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(
    openGraphHtml({ avatarDataUrl: `data:image/jpeg;base64,${avatar.toString("base64")}` }),
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: path.join(publicDir, "opengraph-image.jpg"),
    type: "jpeg",
    quality: 90,
  });

  await browser.close();
  console.log("Brand images written to public/ and src/app/favicon.ico");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
