// パーツ画像（4 倍キャンバス）を、PSD2Live が部位を読み取れるレイヤー名で 2 倍キャンバスの PSD にまとめる。
// 閉じ目は入れない（PSD2Live がまぶたを下ろして閉じる方が、差し替えより自然に動くため）。
//   node scripts/utopia-live2d/make-psd.mjs <出力 PSD のパス>
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { writePsdBuffer } from "ag-psd";
import sharp from "sharp";

// 中間生成物の作業フォルダ（git 対象外）
const layersDir = path.resolve(import.meta.dirname, "../../tmp/utopia-puppet-work/layers4x");
const out = process.argv[2];
const scale = 0.5;
const canvas = { width: 2048, height: 3072 };

// 奥から手前の順。[ファイル名, PSD2Live のレイヤー名]
const order = [
  ["hair_back", "back hair"],
  ["torso", "topwear"],
  ["arm_R", "handwear-r"],
  ["arm_L", "handwear-l"],
  ["tie", "neckwear"],
  // ブローチは布と一緒に揺らさない（金具なので変形させない）
  ["brooch", "objects"],
  ["hair_side_L", "back hair 2"],
  ["face", "face"],
  ["cheek", "腮红"],
  ["mouth_closed", "mouth close"],
  ["mouth_open_a", "mouth open"],
  ["eye_white_R", "eyewhite-r"],
  ["iris_R", "irides-r"],
  // 下まつ毛は顔ではなく目のレイヤーにする（顔に結合すると、頭の向きで目と顔の動きがずれて離れる）
  ["eyelash_lower_R", "eyelash 2-r"],
  ["eye_white_L", "eyewhite-l"],
  ["iris_L", "irides-l"],
  ["eyelash_lower_L", "eyelash 2-l"],
  ["eyelash_upper_L", "eyelash-l"],
  ["brow_R", "eyebrow-r"],
  ["brow_L", "eyebrow-l"],
  ["ear_L", "ear-l"],
  ["earring_L", "earwear-l"],
  ["hair_side_R", "front hair 2"],
  // 編み込みは揺らさず頭と一緒に動かす（髪として扱うと前髪の揺れが付く）
  ["braid_L", "headwear 2"],
  ["ribbon_L", "headwear"],
  ["hair_front", "front hair"],
  // 右目の上まつ毛は目尻の跳ねが顔の外の髪の上まで伸びているので、元絵どおり髪より手前に描く
  // （髪の後ろにすると跳ねが隠れ、閉じたときに線が途切れて見える）
  ["eyelash_upper_R", "eyelash-r"],
  ["ahoge", "front hair 4"],
  // 髪飾りは前髪の毛先より手前に見える
  ["hairpin", "headwear 3"],
];

async function loadLayer(files) {
  const list = Array.isArray(files) ? files : [files];
  let image = sharp(path.join(layersDir, `${list[0]}.png`));
  if (list.length > 1) {
    image = image.composite(list.slice(1).map((f) => ({ input: path.join(layersDir, `${f}.png`) })));
  }
  const full = await image.png().toBuffer();
  const resized = await sharp(full).resize(canvas.width, canvas.height).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const { data, info } = resized;
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 2) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  const left = Math.max(0, minX - 4), top = Math.max(0, minY - 4);
  const width = Math.min(info.width, maxX + 5) - left, height = Math.min(info.height, maxY + 5) - top;
  const pixels = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left, top, width, height }).raw().toBuffer();
  return { left, top, imageData: { width, height, data: new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.byteLength) } };
}

const children = [];
for (const [files, name] of order) {
  children.push({ name, ...(await loadLayer(files)) });
  console.log("layer", name);
}
await writeFile(out, writePsdBuffer({ ...canvas, children }, { generateThumbnail: false, noBackground: true }));
console.log("psd", out);
