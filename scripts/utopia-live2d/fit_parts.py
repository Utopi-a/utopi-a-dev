"""GPT で描き直したパーツを、Live2D で動かしたときに破綻しない形に整える（評価で出た指摘への対処）。

- 白目: GPT の白目は丸い楕円で下まぶたより下まで広がり、目を閉じても白い帯が残る。
  元絵の目の開口部（少しだけ広げたもの）と上まつ毛の裏の範囲に収める
- 顔: GPT の顔にも小さな口が描かれていて、閉じ口の線と二重に見えるので口の赤みを消す
  （閉じ口の線は draw_mouth_line.py で描く）
- 腕: GPT が描き足した袖山が、胴の肩線の手前に二重の山として見える。元絵で腕が見えていた範囲
  （少し広げたもの）に収め、肩の輪郭は胴に任せる
- 髪: GPT の髪は内側にも半透明の画素があり、目の上に透明な板のように重なる。内側を不透明にし、
  なめらかな縁だけを残す
"""
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
WORK = REPO / "tmp/utopia-puppet-work"
LAYERS = WORK / "layers4x"
S = 4
masks = np.load(WORK / "seg/masks4x.npz")


def disk(px: int) -> np.ndarray:
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * px + 1, 2 * px + 1))


def load(name: str) -> np.ndarray:
    return np.array(Image.open(LAYERS / f"{name}.png").convert("RGBA")).astype(np.float32)


def save(name: str, rgba: np.ndarray):
    Image.fromarray(rgba.clip(0, 255).astype(np.uint8), "RGBA").save(LAYERS / f"{name}.png", compress_level=3)
    print("fitted", name)


def soft(mask: np.ndarray, px: float) -> np.ndarray:
    return cv2.GaussianBlur(mask.astype(np.float32), (0, 0), px)


for side in ("L", "R"):
    opening = masks[f"eye_{side}_opening"].astype(np.uint8)
    upper = load(f"eyelash_upper_{side}")[..., 3] > 40
    # 開口部を上へは上まつ毛の裏まで、横と下へは 2px（元絵の解像度）だけ広げる
    allowed = cv2.dilate(opening, disk(S)).astype(bool) | (cv2.dilate(opening, disk(10 * S)).astype(bool) & upper)
    for part in (f"eye_white_{side}", f"iris_{side}"):
        rgba = load(part)
        rgba[..., 3] *= soft(allowed, S / 2)
        save(part, rgba)

face = load("face")
hsv = cv2.cvtColor(face[..., :3].clip(0, 255).astype(np.uint8), cv2.COLOR_RGB2HSV_FULL).astype(np.int16)
mouth_area = np.zeros(face.shape[:2], bool)
mouth_area[730 * S:800 * S, 455 * S:575 * S] = True
reddish = mouth_area & ((hsv[..., 0] <= 20) | (hsv[..., 0] >= 235)) & (hsv[..., 1] > 50)
reddish = cv2.dilate(reddish.astype(np.uint8), disk(3)).astype(bool)
face[..., :3] = cv2.inpaint(face[..., :3].clip(0, 255).astype(np.uint8), reddish.astype(np.uint8) * 255, 6, cv2.INPAINT_TELEA)
save("face", face)

for side in ("L", "R"):
    visible_arm = cv2.dilate(masks[f"arm_{side}"].astype(np.uint8), disk(6 * S)).astype(bool)
    rgba = load(f"arm_{side}")
    rgba[..., 3] *= soft(visible_arm, S)
    save(f"arm_{side}", rgba)

for part in ("hair_front", "hair_side_L", "hair_side_R", "hair_back"):
    rgba = load(part)
    alpha = rgba[..., 3] / 255
    solid = (alpha > 0.5).astype(np.uint8)
    interior = cv2.erode(solid, disk(2 * S)).astype(bool)
    # 縁から 2px より内側は不透明、縁はなめらかに
    alpha = np.where(interior, 1.0, np.clip((alpha - 0.2) / 0.6, 0, 1))
    rgba[..., 3] = alpha * 255
    save(part, rgba)
