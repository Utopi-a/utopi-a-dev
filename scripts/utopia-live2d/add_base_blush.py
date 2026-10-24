"""元絵の顔にある淡い頬の赤みを、顔のパーツに焼き込む。

元絵で顔が見えている所は元絵の画素（赤みを含む）を使うので、それ以外の GPT で描き直した所にだけ、
頬染めのパーツ（照れで濃くなる）を薄くして重ね、普段の赤みにする。照れのときは頬染めパーツがさらに上に重なる。
"""
from pathlib import Path

import cv2
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
# 元絵の画素を使っている所（元絵で顔が見えている所）は、元絵にもう頬の赤みがあるので足さない
masks = np.load(REPO / "tmp/utopia-puppet-work/seg/masks4x.npz")
cheek[..., 3] *= 1 - cv2.GaussianBlur(masks["face_visible"].astype(np.float32), (0, 0), 8)
blended = face.copy()
blended.alpha_composite(Image.fromarray(cheek.astype(np.uint8), "RGBA"))
blended.save(LAYERS / "face.png", compress_level=3)
print("base blush added")
