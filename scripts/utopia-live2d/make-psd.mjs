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
  // 肩から二本線の裾までのケープ襟。胴の服として胴と一緒に動かし、袖（腕）より手前に描く（fit_parts.py）
  [["cape_side_R", "cape_side_L"], "topwear 2"],
  ["tie", "neckwear"],
  // ブローチは布と一緒に揺らさない（金具なので変形させない）
  ["brooch", "objects"],
  // 横髪（画面右・顔より奥）は 2 束。顔に近い L1 を手前に（split_hair.py）
  ["hair_side_L_L2", "back hair 3"],
  ["hair_side_L_L1", "back hair 2"],
  ["face", "face"],
  ["cheek", "腮红"],
  ["mouth_closed", "mouth close"],
  ["mouth_open_a", "mouth open"],
  // 驚きの「お」の口（ParamMouthO で出す）。mouth open 系の名前にすると口の開きが 0 のとき自動で消えるので、顔の 2 枚目にする
  ["mouth_open_o", "face 2"],
  ["eye_white_R", "eyewhite-r"],
  ["iris_R", "irides-r"],
  // 下まつ毛は顔ではなく目のレイヤーにする（顔に結合すると、頭の向きで目と顔の動きがずれて離れる）
  ["eyelash_lower_R", "eyelash 2-r"],
  ["eyelash_upper_R", "eyelash-r"],
  ["eye_white_L", "eyewhite-l"],
  ["iris_L", "irides-l"],
  ["eyelash_lower_L", "eyelash 2-l"],
  ["eyelash_upper_L", "eyelash-l"],
  ["brow_R", "eyebrow-r"],
  ["brow_L", "eyebrow-l"],
  ["ear_L", "ear-l"],
  ["earring_L", "earwear-l"],
  // 横髪（画面左・手前）は分けない（split_hair.py）
  ["hair_side_R_R1", "front hair 2"],
  // 編み込みは揺らさず頭と一緒に動かす（髪として扱うと前髪の揺れが付く）
  ["braid_L", "headwear 2"],
  ["ribbon_L", "headwear"],
  // アホ毛は前髪の後ろに描き、付け根を頭頂の分け目の毛の下に潜らせる（手前だと付け根の尖った端が見えて二股に見える）
  ["ahoge", "front hair 4"],
  // 前髪は 5 束。奥から F5（右へ払う短い束）・F1・F2・F4・F3（中央の細い束）の順（split_hair.py）
  ["hair_front_F5", "front hair 7"],
  ["hair_front_F1", "front hair 8"],
  ["hair_front_F2", "front hair 9"],
  ["hair_front_F4", "front hair 10"],
  ["hair_front_F3", "front hair"],
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
