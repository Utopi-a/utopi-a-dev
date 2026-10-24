"""Codex が単体で描いた表情パーツ（開いた口・頬染め）を、元絵の口・頬の位置へ縮小して置く（4 倍キャンバス）。"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

REPO = Path(__file__).resolve().parents[2]
# 中間生成物（4 倍の元絵・マスク・パーツ画像）は git に入れない作業フォルダに置く
WORK = REPO / "tmp/utopia-puppet-work"
OUT = WORK / "layers4x"
S = 4
CANVAS = (1024 * S, 1536 * S)


def load(name, mirror=False):
    image = Image.open(Path(__file__).resolve().parent / f"source/sprites/{name}.png").convert("RGBA")
    alpha = np.array(image)[..., 3]
    ys, xs = np.where(alpha > 20)
    image = image.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    return ImageOps.mirror(image) if mirror else image


def place(layer, sprite, *, center, width):
    """sprite を幅 width（1 倍座標）に縮小し、中心を center（1 倍座標）に合わせて重ねる"""
    scale = width * S / sprite.width
    resized = sprite.resize((round(sprite.width * scale), round(sprite.height * scale)), Image.LANCZOS)
    x = round(center[0] * S - resized.width / 2)
    y = round(center[1] * S - resized.height / 2)
    layer.alpha_composite(resized, (x, y))


def single(name, sprite, *, center, width):
    layer = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    place(layer, sprite, center=center, width=width)
    layer.save(OUT / f"{name}.png", compress_level=3)
    print("saved", name)


# 口: 閉じた口の線（x 503〜530, y 760 付近）の上端に揃える
single("mouth_open_a", load("mouth_open_a"), center=(517, 766), width=30)

# 照れの頬染め: 両頬に置く
cheek = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
place(cheek, load("blush"), center=(425, 728), width=78)
place(cheek, load("blush", mirror=True), center=(614, 712), width=72)
cheek.save(OUT / "cheek.png", compress_level=3)
print("saved cheek")
