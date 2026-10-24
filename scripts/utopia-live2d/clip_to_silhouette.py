"""体まわりのパーツを、元絵の人物の輪郭の内側に収める。

GPT が描き足した隠れ面は本来ほかのパーツの裏に隠れる位置にあるはずだが、腕の袖山などが
元絵の輪郭より外へはみ出して描かれることがある。輪郭（少しだけ広げたもの）の外の画素を消す。
髪は揺れて輪郭の外へ出るのが正しいので対象にしない。
"""
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
WORK = REPO / "tmp/utopia-puppet-work"
PARTS = ["torso", "arm_L", "arm_R", "tie"]

figure = np.load(WORK / "seg/masks4x.npz")["fg_alpha"] > 0.02
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))
allowed = cv2.GaussianBlur(cv2.dilate(figure.astype(np.uint8), kernel).astype(np.float32), (0, 0), 2)

for name in PARTS:
    path = WORK / f"layers4x/{name}.png"
    rgba = np.array(Image.open(path).convert("RGBA")).astype(np.float32)
    before = (rgba[..., 3] > 0).sum()
    rgba[..., 3] *= allowed
    Image.fromarray(rgba.astype(np.uint8), "RGBA").save(path, compress_level=3)
    print(name, "removed", int(before - (rgba[..., 3] > 0).sum()), "px")
