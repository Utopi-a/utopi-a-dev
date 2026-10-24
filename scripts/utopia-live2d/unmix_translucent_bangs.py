"""目や額にかかる半透明の前髪・横髪を、不透明な焼き込みから「髪の色 + 透明度」に戻す。

元絵では髪越しに目が透けている。焼き込んだままだと、目を閉じても髪に開いた目の色が残るので、
下にあるパーツ（顔・目）の色 U と髪の色 H から、合成結果 P = a·H + (1−a)·U となる透明度 a を求める。
"""
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
WORK = REPO / "tmp/utopia-puppet-work"
LAYERS = WORK / "layers4x"
S = 4

# リグの描画順（既定の表情で見えているパーツだけ）
DRAW_ORDER = ["hair_back", "torso", "arm_R", "arm_L", "tie", "hair_side_L", "face", "mouth_closed",
              "eye_white_R", "iris_R", "eyelash_lower_R", "eyelash_upper_R",
              "eye_white_L", "iris_L", "eyelash_lower_L", "eyelash_upper_L",
              "brow_R", "brow_L", "ear_L", "earring_L", "hair_side_R", "braid_L", "ribbon_L",
              "hair_front"]

masks = np.load(WORK / "seg/masks4x.npz")


def dilate(mask, px):
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * px + 1, 2 * px + 1))
    return cv2.dilate(mask.astype(np.uint8), k).astype(bool)


def load(name):
    return np.array(Image.open(LAYERS / f"{name}.png")).astype(np.float32)


def composite(names):
    first = load(names[0])
    out = np.zeros((*first.shape[:2], 3), np.float32)
    for name in names:
        layer = load(name) / 255
        a = layer[..., 3:4]
        out = layer[..., :3] * 255 * a + out * (1 - a)
    return out


def unmix(name, region, *, min_alpha):
    layer = load(name)
    under = composite(DRAW_ORDER[: DRAW_ORDER.index(name)])
    # 髪の色: 範囲外の不透明な髪の色を大きくぼかして広げる
    opaque = (layer[..., 3] > 250) & ~region
    num = cv2.GaussianBlur(layer[..., :3] * opaque[..., None], (0, 0), 30 * S)
    den = cv2.GaussianBlur(opaque.astype(np.float32), (0, 0), 30 * S)
    hair = num / np.maximum(den, 1e-4)[..., None]

    pixel = layer[..., :3]
    direction = hair - under
    alpha = ((pixel - under) * direction).sum(-1) / np.maximum((direction ** 2).sum(-1), 1.0)
    # 髪が明るい肌に重なって暗くなることはないので、髪より大きく暗い画素はまつ毛などの目の色とみなす
    darker_than_hair = pixel.mean(-1) < hair.mean(-1) - 60
    alpha[darker_than_hair & region] = 0
    alpha = alpha.clip(min_alpha, 1.0)
    # 合成結果が元の色に戻るよう、透明度に合わせて色を解き直す。薄いところは解が振れるので髪の色に寄せる
    solved = ((pixel - (1 - alpha[..., None]) * under) / np.maximum(alpha, 1e-3)[..., None]).clip(0, 255)
    trust = np.clip((alpha - 0.2) / 0.3, 0, 1)[..., None]
    color = solved * trust + hair * (1 - trust)

    # 範囲内で髪の色（ラベンダー〜肌と混ざったマゼンタ寄り）でない画素は、目や肌なので髪から外す
    hsv = cv2.cvtColor(layer[..., :3].clip(0, 255).astype(np.uint8), cv2.COLOR_RGB2HSV_FULL).astype(np.int16)
    hairish = (hsv[..., 0] >= 165) & (hsv[..., 0] <= 246) & (hsv[..., 1] >= 18)
    alpha[region & ~hairish] = 0

    target = region & (layer[..., 3] > 0)
    soft = cv2.GaussianBlur(target.astype(np.float32), (0, 0), S)
    result = layer.copy()
    result[target, :3] = color[target]
    result[..., 3] = layer[..., 3] * (1 - soft) + alpha * layer[..., 3] * soft
    Image.fromarray(result.clip(0, 255).astype(np.uint8), "RGBA").save(LAYERS / f"{name}.png", compress_level=3)
    print(name, "unmixed pixels", int(target.sum()))


eye_zone = dilate(masks["eye_L_region"] | masks["eye_R_region"], 3 * S)
# 目の上は、髪が無く目だけの画素もあり得るので透明度 0 まで許す
unmix("hair_side_R", eye_zone, min_alpha=0.0)
unmix("hair_front", masks["translucent_bangs"] | eye_zone, min_alpha=0.0)
