"""Codex の画像生成で清書した髪のパーツを、元のパーツの位置に戻して差し替える。

清書は切り出しの 2 倍キャンバス版を入力にして作ってあり、縦横比は保たれるが大きさは変わって返ってくる。
waifu2x で拡大してから元の 4 倍キャンバスの大きさに合わせ、元のパーツと形が最も重なる位置へずらして置く。
"""
import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
WORK = REPO / "tmp/utopia-puppet-work"
LAYERS = WORK / "layers4x"
CLEANED = Path(__file__).resolve().parent / "source/cleaned"
WAIFU2X = WORK / "tools/waifu2x-ncnn-vulkan-20250915-macos"


def upscale_2x(image: Image.Image) -> Image.Image:
    """透明画素の色を近傍で延長してから RGB を waifu2x で、アルファを BICUBIC で 2 倍にする"""
    rgba = np.array(image.convert("RGBA"))
    with tempfile.TemporaryDirectory() as tmp:
        src, dst = Path(tmp) / "in.png", Path(tmp) / "out.png"
        Image.fromarray(rgba[..., :3]).save(src)
        subprocess.run(
            [str(WAIFU2X / "waifu2x-ncnn-vulkan"), "-i", str(src), "-o", str(dst), "-n", "-1", "-s", "2",
             "-m", str(WAIFU2X / "models-cunet"), "-g", "0", "-f", "png"],
            check=True, capture_output=True,
        )
        rgb = Image.open(dst).convert("RGB")
    alpha = Image.fromarray(rgba[..., 3]).resize(rgb.size, Image.BICUBIC)
    rgb.putalpha(alpha)
    return rgb


def best_placement(reference: np.ndarray, candidate: Image.Image) -> tuple[float, int, int]:
    """不透明部分の重なり（IoU）が最大になる拡大率と平行移動。縮小した画像で粗く探してから細かく詰める"""
    factor = 8
    ref_small = np.array(Image.fromarray(reference).resize(
        (reference.shape[1] // factor, reference.shape[0] // factor), Image.BILINEAR)) > 128
    height, width = ref_small.shape

    def score(scale: float, dx: int, dy: int, ref, cand_image, size) -> float:
        w, h = size
        scaled = np.array(cand_image.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.BILINEAR)) > 128
        canvas = np.zeros_like(ref)
        # 拡大縮小は中心を基準にする
        x0 = (w - scaled.shape[1]) // 2 + dx
        y0 = (h - scaled.shape[0]) // 2 + dy
        sx0, sy0 = max(0, -x0), max(0, -y0)
        tx0, ty0 = max(0, x0), max(0, y0)
        cw = min(scaled.shape[1] - sx0, w - tx0)
        ch = min(scaled.shape[0] - sy0, h - ty0)
        if cw <= 0 or ch <= 0:
            return 0.0
        canvas[ty0:ty0 + ch, tx0:tx0 + cw] = scaled[sy0:sy0 + ch, sx0:sx0 + cw]
        return (ref & canvas).sum() / max(1, (ref | canvas).sum())

    alpha_small = Image.fromarray(np.array(candidate)[..., 3]).resize((width, height), Image.BILINEAR)
    best = max(
        (score(scale, dx, dy, ref_small, alpha_small, (width, height)), scale, dx, dy)
        for scale in np.arange(0.88, 1.13, 0.02)
        for dy in range(-12, 13, 2)
        for dx in range(-12, 13, 2)
    )
    _, scale, dx, dy = best
    best = max(
        (score(s, x, y, ref_small, alpha_small, (width, height)), s, x, y)
        for s in np.arange(scale - 0.015, scale + 0.016, 0.005)
        for y in range(dy - 2, dy + 3)
        for x in range(dx - 2, dx + 3)
    )
    iou, scale, dx, dy = best
    print(f"  IoU {iou:.3f} scale {scale:.3f} offset ({dx * factor}, {dy * factor})")
    return float(scale), dx * factor, dy * factor


def main():
    boxes = json.loads((CLEANED / "bbox.json").read_text())
    for name, (x0, y0, x1, y1) in boxes.items():
        cleaned_path = CLEANED / f"{name}.png"
        if not cleaned_path.exists():
            continue
        print(name)
        target_size = (x1 - x0, y1 - y0)
        cleaned = upscale_2x(Image.open(cleaned_path)).resize(target_size, Image.LANCZOS)
        original = Image.open(LAYERS / f"{name}.png")
        reference = np.array(original.crop((x0, y0, x1, y1)))[..., 3]
        scale, dx, dy = best_placement(reference, cleaned)
        scaled = cleaned.resize((round(target_size[0] * scale), round(target_size[1] * scale)), Image.LANCZOS)
        left = x0 + (target_size[0] - scaled.width) // 2 + dx
        top = y0 + (target_size[1] - scaled.height) // 2 + dy
        canvas = Image.new("RGBA", original.size, (0, 0, 0, 0))
        canvas.paste(scaled, (left, top), scaled)
        canvas.save(LAYERS / f"{name}.png", compress_level=3)


if __name__ == "__main__":
    main()
