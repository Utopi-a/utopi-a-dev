"""パーツを GPT（Codex の画像生成）で描き直し・補完する。

    python gpt_parts.py prepare <パーツ名>...   入力画像と依頼文を作る
    python gpt_parts.py apply <パーツ名>...     生成結果を元の位置に合わせて layers4x に戻す
    python gpt_parts.py record <パーツ名>...    今の layers4x の位置を記録する（以後の apply はその位置を使う）

生成結果は source/gpt/<パーツ名>.webp に置く（Codex が書き出した out.png を変換して保存する）。

依頼の中身（どこを描くか・何を除くか）は source/gpt_parts.json に書く。
元絵のパーツ周辺を切り抜いた画像を参照画像として渡し、同じ構図のまま「そのパーツだけ」を
隠れた部分まで描き足した透過 PNG にしてもらう。返ってきた画像は大きさ・位置が少しずれるので、
今のパーツ（大まかな位置の目安）と形が最も重なる拡大率と平行移動を探して置く。
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
WORK = REPO / "tmp/utopia-puppet-work"
LAYERS = WORK / "layers4x"
JOBS = WORK / "gpt-parts"
MASTER = WORK / "master/master_b_4x.png"
SPEC = json.loads((HERE / "source/gpt_parts.json").read_text())
INPUT_LONG_EDGE = 1024

COMMON_RULES = """条件（最重要。守れないなら作り直す）:
- {master} を参照画像として渡し、編集で作る。出力は {master} と同じ縦横比・同じ構図にし、パーツの位置・大きさ・角度を {master} の中の位置と一致させる（後でその位置にそのまま重ねるため）。拡大・移動・回転・描き直しで構図を変えない
- 描くのは指定したパーツだけ。それ以外はすべて完全な透明（transparent_background: true）。白背景・影・グローを残さない
- 元絵で他の物に隠れていた部分は、そのパーツが本来あるはずの形で自然に描き足す（Live2D で動かしたときに見えるため）。穴・透明な抜け・色の欠け・他パーツの残骸を残さない
- 線の太さ・色・塗り（アニメ塗り）は元絵に合わせる。設定 /Users/ryo/dev/private/utopi-a-dev/tmp/utopia-reference/ゆーとぴあちゃん_テキスト設定_v1.3.txt を守る
- 参考: {context} は元絵の全体で、赤く塗った範囲が今のパーツ、黄色の枠が {master} の切り抜き範囲。{current} は今のパーツ（不完全なもの。位置の目安にだけ使う）
"""

CLEAN_RULES = """条件（最重要）:
- {current} を参照画像として渡し、編集で作る。これは元絵から切り出したパーツで、形はほぼ正しいが、縁の欠け・途切れ・他のパーツの混入がある
- 出力は {current} と同じ縦横比・同じ構図にし、パーツの位置・大きさ・外形を {current} と一致させる（後でそのまま重ねるため）
- 欠けた部分を自然につなぎ、途切れ・ガタつき・他のパーツの混入（瞳の縁、白目、肌など）だけを取り除く。形を作り変えない
- 背景は完全な透明（transparent_background: true）
- 色・線・塗りは {master}（同じ範囲の元絵）に合わせる
"""


def crop_box(name: str) -> tuple[int, int, int, int]:
    spec = SPEC[name]
    if "box" in spec:
        x0, y0, x1, y1 = spec["box"]
        return x0 * 4, y0 * 4, x1 * 4, y1 * 4
    image = Image.open(LAYERS / f"{spec.get('reference', name)}.png")
    x0, y0, x1, y1 = image.getbbox()
    pad = int(max(x1 - x0, y1 - y0) * spec.get("pad", 0.15))
    width, height = image.size
    return max(0, x0 - pad), max(0, y0 - pad), min(width, x1 + pad), min(height, y1 + pad)


def scaled(image: Image.Image) -> Image.Image:
    scale = INPUT_LONG_EDGE / max(image.size)
    return image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)


REMOVE_RULES = """条件（最重要）:
- {master} を参照画像として渡し、編集で作る。出力は {master} と同じ縦横比・同じ構図にし、取り除くもの以外は {master} と一致させる（後でそのまま重ねるため）。拡大・移動・回転・描き直しで構図を変えない
- 取り除いた跡には、その下に本来ある服（襟・シャツなど）を、周りとつながる形・線・塗りで自然に描き足す。ぼかし・にじみ・取り除いたものの影や輪郭の残りを残さない
- 背景（人物の外）は元絵のままでよい（透明にしなくてよい）
- 線の太さ・色・塗り（アニメ塗り）は元絵に合わせる。設定 /Users/ryo/dev/private/utopi-a-dev/tmp/utopia-reference/ゆーとぴあちゃん_テキスト設定_v1.3.txt を守る
- 参考: {context} は元絵の全体で、赤く塗った範囲が取り除くもの、黄色の枠が {master} の切り抜き範囲
"""


def prepare(name: str):
    spec = SPEC[name]
    job = JOBS / name
    job.mkdir(parents=True, exist_ok=True)
    box = crop_box(name)
    master = Image.open(MASTER).convert("RGBA")
    scaled(master.crop(box)).save(job / "master_crop.png")

    reference = Image.open(LAYERS / f"{spec.get('reference', name)}.png")
    scaled(reference.crop(box)).save(job / "current.png")

    context = master.resize((1024, 1536), Image.LANCZOS)
    tint = np.zeros((1536, 1024, 4), np.uint8)
    tint[np.array(reference.resize((1024, 1536)))[..., 3] > 40] = (255, 0, 80, 120)
    context.alpha_composite(Image.fromarray(tint))
    ImageDraw.Draw(context).rectangle([v // 4 for v in box], outline=(255, 200, 0, 255), width=3)
    context.convert("RGB").save(job / "context.png")

    (job / "box.json").write_text(json.dumps(box))
    if spec.get("input") == "remove":
        # 元絵から手前のパーツを取り除き、その下を描き足す（揺れものが動いたときに見える下地）
        rules = REMOVE_RULES.format(master=job / "master_crop.png", context=job / "context.png")
    elif spec.get("input") == "current":
        # 今の切り出しを清書する。形と位置は今のパーツを基準にし、元絵は色と線の参考にだけ使う
        rules = CLEAN_RULES.format(current=job / "current.png", master=job / "master_crop.png")
    else:
        rules = COMMON_RULES.format(master=job / "master_crop.png", context=job / "context.png", current=job / "current.png")
    prompt = f"""目的: キャラクター「ゆーとぴあちゃん」の Live2D モデル用パーツ「{spec['label']}」を画像生成で作る。
描くもの: {spec['instruction']}

{rules}
出力: 1 回だけ生成し、cp で {job / 'out.png'} に保存する（作り直した場合も最後の 1 枚をこの名前で）。PIL は使わない。
報告: 保存したファイルと sips で確認した寸法、指示と違ってしまった点。
"""
    (job / "prompt.md").write_text(prompt)
    print("prepared", name, box)


def best_placement(reference: np.ndarray, candidate: np.ndarray) -> tuple[float, int, int, float]:
    """不透明部分の重なり（IoU）が最大になる拡大率と平行移動（切り抜き範囲内の画素）"""
    factor = max(1, max(reference.shape) // 256)
    ref = reference[::factor, ::factor] > 128
    height, width = ref.shape
    cand_image = Image.fromarray(candidate).resize((width, height), Image.BILINEAR)

    def score(scale, dx, dy):
        w, h = max(1, round(width * scale)), max(1, round(height * scale))
        resized = np.array(cand_image.resize((w, h), Image.BILINEAR)) > 128
        canvas = np.zeros_like(ref)
        x0, y0 = (width - w) // 2 + dx, (height - h) // 2 + dy
        sx, sy, tx, ty = max(0, -x0), max(0, -y0), max(0, x0), max(0, y0)
        cw, ch = min(w - sx, width - tx), min(h - sy, height - ty)
        if cw <= 0 or ch <= 0:
            return 0.0
        canvas[ty:ty + ch, tx:tx + cw] = resized[sy:sy + ch, sx:sx + cw]
        return (ref & canvas).sum() / max(1, (ref | canvas).sum())

    reach = max(2, width // 12)
    best = max((score(s, dx, dy), s, dx, dy)
               for s in np.arange(0.75, 1.26, 0.02)
               for dy in range(-reach, reach + 1, 2) for dx in range(-reach, reach + 1, 2))
    _, s0, x0, y0 = best
    best = max((score(s, dx, dy), s, dx, dy)
               for s in np.arange(s0 - 0.015, s0 + 0.016, 0.005)
               for dy in range(y0 - 2, y0 + 3) for dx in range(x0 - 2, x0 + 3))
    iou, scale, dx, dy = best
    return float(scale), dx * factor, dy * factor, float(iou)


def best_color_placement(master: np.ndarray, candidate: np.ndarray) -> tuple[float, int, int, float]:
    """パーツの不透明な画素の色が元絵と最も多く一致する拡大率と平行移動（元絵に見えているパーツ向け）。
    隠れていた部分を描き足した画素は一致しないが、見えている部分が多数を占めるので結果は崩れない"""
    factor = max(1, max(master.shape[:2]) // 320)
    ref = master[::factor, ::factor, :3].astype(np.int16)
    height, width = ref.shape[:2]
    cand_image = Image.fromarray(candidate).resize((width, height), Image.BILINEAR)

    def score(scale, dx, dy):
        w, h = max(1, round(width * scale)), max(1, round(height * scale))
        resized = np.array(cand_image.resize((w, h), Image.BILINEAR)).astype(np.int16)
        x0, y0 = (width - w) // 2 + dx, (height - h) // 2 + dy
        sx, sy, tx, ty = max(0, -x0), max(0, -y0), max(0, x0), max(0, y0)
        cw, ch = min(w - sx, width - tx), min(h - sy, height - ty)
        if cw <= 0 or ch <= 0:
            return 0.0
        part = resized[sy:sy + ch, sx:sx + cw]
        opaque = part[..., 3] > 200
        if opaque.sum() < 20:
            return 0.0
        diff = np.abs(part[..., :3] - ref[ty:ty + ch, tx:tx + cw]).sum(-1)
        return float(((diff < 60) & opaque).sum() / opaque.sum())

    reach = max(2, width // 8)
    best = max((score(s, dx, dy), s, dx, dy)
               for s in np.arange(0.8, 1.21, 0.025)
               for dy in range(-reach, reach + 1, 2) for dx in range(-reach, reach + 1, 2))
    _, s0, x0, y0 = best
    best = max((score(s, dx, dy), s, dx, dy)
               for s in np.arange(s0 - 0.02, s0 + 0.021, 0.005)
               for dy in range(y0 - 2, y0 + 3) for dx in range(x0 - 2, x0 + 3))
    match, scale, dx, dy = best
    return float(scale), dx * factor, dy * factor, float(match)


def best_chamfer_placement(reference: np.ndarray, candidate: np.ndarray) -> tuple[float, int, int, float]:
    """細い線のパーツ向け。生成した線の画素から、今のパーツ（途切れていても位置は正しい）の最寄りの画素までの
    平均距離が最小になる拡大率と平行移動"""
    import cv2

    factor = max(1, max(reference.shape) // 320)
    ref = reference[::factor, ::factor] > 100
    height, width = ref.shape
    distance = cv2.distanceTransform((~ref).astype(np.uint8), cv2.DIST_L2, 3)
    cand_image = Image.fromarray(candidate).resize((width, height), Image.BILINEAR)

    def score(scale, dx, dy):
        w, h = max(1, round(width * scale)), max(1, round(height * scale))
        resized = np.array(cand_image.resize((w, h), Image.BILINEAR)) > 128
        ys, xs = np.nonzero(resized)
        if len(ys) < 10:
            return -1e9
        xs = xs + (width - w) // 2 + dx
        ys = ys + (height - h) // 2 + dy
        inside = (xs >= 0) & (ys >= 0) & (xs < width) & (ys < height)
        if inside.mean() < 0.9:
            return -1e9
        return -float(distance[ys[inside], xs[inside]].mean())

    reach = max(2, width // 8)
    best = max((score(s, dx, dy), s, dx, dy)
               for s in np.arange(0.75, 1.26, 0.025)
               for dy in range(-reach, reach + 1, 2) for dx in range(-reach, reach + 1, 2))
    _, s0, x0, y0 = best
    best = max((score(s, dx, dy), s, dx, dy)
               for s in np.arange(s0 - 0.02, s0 + 0.021, 0.005)
               for dy in range(y0 - 2, y0 + 3) for dx in range(x0 - 2, x0 + 3))
    mean_distance, scale, dx, dy = best
    return float(scale), dx * factor, dy * factor, -mean_distance * factor


def apply(name: str):
    """source/gpt の絵を、gpt_parts.json に記録した位置（なければ探した位置）で layers4x に置く"""
    spec = SPEC[name]
    job = JOBS / name
    x0, y0, x1, y1 = crop_box(name) if "placement" in spec else json.loads((job / "box.json").read_text())
    size = (x1 - x0, y1 - y0)
    out = Image.open(HERE / f"source/gpt/{name}.webp").convert("RGBA").resize(size, Image.LANCZOS)
    if "placement" in spec:
        scale, dx, dy = spec["placement"]["scale"], spec["placement"]["dx"], spec["placement"]["dy"]
        score = float("nan")
    else:
        scale, dx, dy, score = find_placement(name, (x0, y0, x1, y1), out)
        spec["placement"] = {"scale": round(scale, 4), "dx": dx, "dy": dy}
        save_spec()
    placed = out.resize((round(size[0] * scale), round(size[1] * scale)), Image.LANCZOS)
    canvas = Image.new("RGBA", Image.open(MASTER).size, (0, 0, 0, 0))
    # 透明なキャンバスへはマスクなしで写す（自身をマスクにすると縁の透明度が二乗される）
    canvas.paste(placed, (x0 + (size[0] - placed.width) // 2 + dx, y0 + (size[1] - placed.height) // 2 + dy))
    canvas.save(LAYERS / f"{name}.png", compress_level=3)
    print(f"applied {name}: {spec.get('align', 'iou')} {score:.3f} scale {scale:.3f} offset ({dx}, {dy})")


def find_placement(name: str, box, out: Image.Image):
    """生成した絵を置く位置を探す。結果は gpt_parts.json に記録し、次からはそれを使う"""
    spec = SPEC[name]
    x0, y0, x1, y1 = box
    reference = np.array(Image.open(LAYERS / f"{spec.get('reference', name)}.png").crop(box))[..., 3]
    if spec.get("align") == "none":
        # 同じ切り抜きから描いているので、構図が保たれていればそのまま重なる
        return 1.0, 0, 0, float("nan")
    if spec.get("align") == "color":
        master_crop = np.array(Image.open(MASTER).convert("RGB").crop(box))
        return best_color_placement(master_crop, np.array(out))
    if spec.get("align") == "chamfer":
        return best_chamfer_placement(reference, np.array(out)[..., 3])
    return best_placement(reference, np.array(out)[..., 3])


def save_spec():
    (HERE / "source/gpt_parts.json").write_text(json.dumps(SPEC, ensure_ascii=False, indent=1) + "\n")


def record(name: str):
    """今の layers4x に置かれている位置を、source/gpt の絵と重ね合わせて求め、記録する"""
    spec = SPEC[name]
    box = json.loads((JOBS / name / "box.json").read_text())
    size = (box[2] - box[0], box[3] - box[1])
    out = Image.open(HERE / f"source/gpt/{name}.webp").convert("RGBA").resize(size, Image.LANCZOS)
    current = np.array(Image.open(LAYERS / f"{name}.png").crop(box))[..., 3]
    scale, dx, dy, iou = best_placement(current, np.array(out)[..., 3])
    spec["placement"] = {"scale": round(scale, 4), "dx": dx, "dy": dy}
    spec["box"] = [v // 4 for v in box]
    save_spec()
    print(f"recorded {name}: IoU {iou:.3f} scale {scale:.3f} offset ({dx}, {dy})")


if __name__ == "__main__":
    command, *names = sys.argv[1:]
    for part in names or list(SPEC):
        {"prepare": prepare, "apply": apply, "record": record}[command](part)
