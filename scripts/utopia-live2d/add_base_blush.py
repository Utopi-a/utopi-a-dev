"""元絵の顔にある淡い頬の赤みを、顔のパーツに焼き込む。

GPT で描き直した顔は頬の赤みがなく、元絵より平坦に見える。頬染めのパーツ（照れで濃くなる）を
薄くして顔に重ね、普段の赤みにする。照れのときは頬染めパーツがさらに上に重なる。
"""
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
LAYERS = REPO / "tmp/utopia-puppet-work/layers4x"
BASE_OPACITY = 0.3

face = Image.open(LAYERS / "face.png").convert("RGBA")
cheek = np.array(Image.open(LAYERS / "cheek.png").convert("RGBA")).astype(np.float32)
cheek[..., 3] *= BASE_OPACITY
# 顔の外にはみ出さないよう、顔の不透明度で切る
cheek[..., 3] *= np.array(face)[..., 3] / 255
blended = face.copy()
blended.alpha_composite(Image.fromarray(cheek.astype(np.uint8), "RGBA"))
blended.save(LAYERS / "face.png", compress_level=3)
print("base blush added")
