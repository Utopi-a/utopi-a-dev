"""Codex が単体で描いた表情パーツ（開いた口・驚きの口・頬染め）を、元絵の口・頬の位置へ縮小して置く（4 倍キャンバス）。"""
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


def single(name, sprite, *, center, width, stretch=1.0):
    """stretch は縦の伸ばし率（口を縦にも大きく開けるとき）"""
    layer = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    if stretch != 1.0:
        sprite = sprite.resize((sprite.width, round(sprite.height * stretch)), Image.LANCZOS)
    place(layer, sprite, center=center, width=width)
    layer.save(OUT / f"{name}.png", compress_level=3)
    print("saved", name)


# 口: 閉じた口の線（x 503〜530, y 760 付近）の上端に揃える
# 開いた口は VTuber のモデルでよく見る大きさにする（大きく開けたとき幅が顔の幅の 2 割弱、高さが幅の半分強）。
# 幅 30 では閉じた口の線とほぼ同じで、開きが小さく見えた。上端が閉じた口の線（y 760）にそろうよう中心を下げる
single("mouth_open_a", load("mouth_open_a"), center=(517, 774), width=46, stretch=1.3)
# 驚きの「お」の口: 縦に開いた楕円
single("mouth_open_o", load("mouth_open_o"), center=(517, 774), width=22)

# 照れの頬染め: 両頬に置く
cheek = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
place(cheek, load("blush"), center=(425, 728), width=78)
place(cheek, load("blush", mirror=True), center=(614, 712), width=72)
cheek.save(OUT / "cheek.png", compress_level=3)
print("saved cheek")
