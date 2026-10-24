"""金色の U 字の髪飾りと胸元のブローチを、元絵からそのまま切り出す（隠れている部分がないので描き足し不要）。

GPT で描き直した編み込みとタイは、これらを除いた形で描いてあるので、上に重ねる別パーツにする。
"""
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from sam_helper import segment

REPO = Path(__file__).resolve().parents[2]
WORK = REPO / "tmp/utopia-puppet-work"
MASTER = WORK / "master/master_b_4x.png"
S = 4

rgba = np.array(Image.open(MASTER).convert("RGBA"))
hsv = cv2.cvtColor(rgba[..., :3], cv2.COLOR_RGB2HSV_FULL).astype(np.int16)
# 金具のまわりに写り込む髪（明るいラベンダー）とタイの布（暗い紫）。金具の淡いハイライトは残す
lavender_hair = (hsv[..., 0] >= 165) & (hsv[..., 0] <= 235) & (hsv[..., 1] >= 20) & (hsv[..., 2] >= 150)
tie_cloth = (hsv[..., 0] >= 165) & (hsv[..., 0] <= 240) & (hsv[..., 2] < 130)

ACCESSORIES = {
    "hairpin": {"box": (625, 380, 700, 445), "pos": [(660, 410)]},
    "brooch": {"box": (480, 915, 560, 980), "pos": [(520, 935)]},
}

for name, prompt in ACCESSORIES.items():
    mask, scores = segment(str(MASTER), pos=prompt["pos"], box=prompt["box"])
    core = mask & ~lavender_hair & ~tie_cloth
    core = cv2.morphologyEx(core.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)).astype(bool)
    # 金具は一つながりなので、いちばん大きいかたまりだけ残す（髪の小片などを落とす）
    count, labels, stats, _ = cv2.connectedComponentsWithStats(core.astype(np.uint8), connectivity=8)
    core = labels == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    alpha = cv2.GaussianBlur(core.astype(np.float32), (0, 0), 0.8 * S / 2)
    out = rgba.copy()
    out[..., 3] = (alpha * 255).astype(np.uint8)
    Image.fromarray(out, "RGBA").save(WORK / f"layers4x/{name}.png", compress_level=3)
    print(name, "score", float(scores.max()), "pixels", int(core.sum()))
