"""前髪と横髪を毛束ごとに分ける（VTuber の Live2D モデルで一般的な分け方）。

前髪・横髪が 1 枚ずつだと毛束ごとに揺れず、横髪には頭頂まで含まれていて頭の上まで一緒に揺れていた。
境目の線は Codex に元絵と各レイヤーを見せて決めた案（毛束の間の隙間や輪郭線に沿う）。

- 分けた束のうち奥の束は、手前の束の下になる部分を 30px（元絵）まで塗り足す。手前の束が揺れても隙間が
  見えないように。塗り足した所は輪郭線を残さず、その束の見えている髪の色で埋める（二重線にしないため）
- 画面左の横髪には GPT が描いたアホ毛の形が入っていて、アホ毛が揺れると二重に見えるので除く

fit_parts.py の後に実行する。結果は layers4x/<元の名前>_<束>.png。
"""
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
LAYERS = REPO / "tmp/utopia-puppet-work/layers4x"
S = 4
# 奥の束を手前の束の下へ塗り足す幅（4 倍の座標）
OVERLAP = 30 * S

# 境目の線（4 倍の座標、上から下へ）。線の左側と右側で束が変わる。束は左から順に並べる
SPLITS = {
    "hair_front": {
        "boundaries": [
            [(2000, 1170), (1860, 1230), (1690, 1450), (1570, 1700), (1490, 2000), (1440, 2270), (1450, 2500)],
            [(2080, 1310), (1970, 1430), (1860, 1650), (1800, 1890), (1780, 2070)],
            [(2090, 1320), (2110, 1600), (2080, 1900), (2010, 2200), (1930, 2420), (1850, 2570)],
            [(2110, 1300), (2200, 1320), (2280, 1400), (2310, 1510)],
        ],
        "pieces": ["F1", "F2", "F3", "F4", "F5"],
        # 手前から奥の順
        "front_to_back": ["F3", "F4", "F2", "F1", "F5"],
    },
    "hair_side_R": {
        "boundaries": [
            [(2000, 1170), (1740, 1250), (1460, 1510), (1190, 1900), (1010, 2310), (1000, 2650), (1070, 2920),
             (1270, 3160), (1510, 3330), (1790, 3430)],
            # 顔の近くの短い束（R1）は y 2500 あたりで終わるので、毛先の先で右へ折り返して閉じる
            [(2000, 1280), (1870, 1430), (1750, 1660), (1660, 1930), (1560, 2200), (1450, 2410), (1360, 2500),
             (1500, 2600), (1900, 2620), (2300, 2600)],
        ],
        "pieces": ["R3", "R2", "R1"],
        "front_to_back": ["R1", "R2", "R3"],
    },
    "hair_side_L": {
        "boundaries": [
            [(2390, 1260), (2520, 1400), (2660, 1610), (2810, 1930), (2960, 2350), (3000, 2670), (2930, 2920),
             (2780, 3120), (2600, 3330)],
        ],
        "pieces": ["L1", "L2"],
        "front_to_back": ["L1", "L2"],
    },
}


def disk(px: int) -> np.ndarray:
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * px + 1, 2 * px + 1))


def left_of(curve: list[tuple[int, int]], shape: tuple[int, int]) -> np.ndarray:
    """曲線（上から下へ）より左側の範囲。上端は真上へ、下端は最後の向きのまま画面の外まで延ばして閉じる"""
    height, width = shape
    points = np.array(curve, np.float64)
    direction = points[-1] - points[-2]
    end = points[-1] + direction / np.linalg.norm(direction) * (height + width) * 2
    # 画面の下を回って左上へ戻る（右へ折り返す線でも、線の下側を左側として扱う）
    far = (height + width) * 3.0
    polygon = [(points[0][0], -10.0), *points, tuple(end), (end[0], far), (-far, far), (-far, -10.0)]
    mask = np.zeros(shape, np.uint8)
    cv2.fillPoly(mask, [np.round(np.array(polygon)).astype(np.int32)], 1)
    return mask.astype(bool)


def own_hair_color(rgba: np.ndarray, region: np.ndarray) -> np.ndarray:
    """その束の見えている髪の色（輪郭線の暗い色を除く）を周りから広げた色"""
    rgb = rgba[..., :3].astype(np.float32)
    luma = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    known = (region & (rgba[..., 3] > 200) & (luma > 140)).astype(np.float32)
    color = np.median(rgb[known > 0], axis=0) * np.ones_like(rgb)
    for sigma in (40 * S, 10 * S):
        weight = cv2.GaussianBlur(known, (0, 0), sigma)
        blurred = cv2.GaussianBlur(known[..., None] * rgb, (0, 0), sigma) / np.maximum(weight, 1e-6)[..., None]
        color = np.where((weight > 0.05)[..., None], blurred, color)
    return color


MASKS = np.load(REPO / "tmp/utopia-puppet-work/seg/masks4x.npz")
# 元絵で顔・目が見えている所（目にかかる半透明の前髪の所は除く）。顔の手前の髪（前髪・画面左の横髪）は
# ここに出さない。GPT は髪の隠れた部分を描き足すとき、額や目・頬が見えている所まで髪を広げることがあり、
# 静止状態でも額に髪の帯が出たり、目尻や頬に髪がかぶさったりしていた
FACE_SHOWN = cv2.erode(
    ((MASKS["face_visible"] | MASKS["eye_R_opening"] | MASKS["eye_L_opening"] | MASKS["eye_R_upper"] | MASKS["eye_L_upper"])
     & ~MASKS["translucent_bangs"]).astype(np.uint8),
    disk(2 * S),
).astype(bool)
# 顔のマスク（SAM）は頬の横の肌や目尻の白目を取りこぼす。顔のまわりでは、元絵の色が肌色・白目の色の所も
# 「顔が見えている所」とする（髪の色は青紫で、半透明の前髪越しの所も青みが残るので区別できる）
_master = np.array(Image.open(REPO / "tmp/utopia-puppet-work/master/master_b_4x.png").convert("RGB")).astype(np.int16)
_near_face = cv2.dilate(
    (MASKS["face_visible"] | MASKS["eye_R_opening"] | MASKS["eye_L_opening"]).astype(np.uint8), disk(60 * S)
).astype(bool)
_skin = (_master[..., 0] - _master[..., 2] > 8) & (_master.min(axis=2) > 150)
_white = _master.min(axis=2) > 232
_by_color = cv2.morphologyEx((_near_face & (_skin | _white)).astype(np.uint8), cv2.MORPH_OPEN, disk(2 * S))
# 色の判定は横髪だけに使う（前髪では細い毛先のすき間の肌まで拾い、毛先が櫛のように欠けた）
FACE_SHOWN_BY_COLOR = FACE_SHOWN | cv2.erode(_by_color, disk(S)).astype(bool)
IN_FRONT_OF_FACE = {"hair_front": FACE_SHOWN, "hair_side_R": FACE_SHOWN_BY_COLOR}


def split(name: str, spec: dict):
    rgba = np.array(Image.open(LAYERS / f"{name}.png").convert("RGBA"))
    if name in IN_FRONT_OF_FACE:
        keep = 1 - cv2.GaussianBlur(IN_FRONT_OF_FACE[name].astype(np.float32), (0, 0), S / 2)
        rgba[..., 3] = (rgba[..., 3] * keep).astype(np.uint8)
    if name == "hair_side_R":
        ahoge = np.array(Image.open(LAYERS / "ahoge.png"))[..., 3] > 20
        rgba[..., 3] = np.where(cv2.dilate(ahoge.astype(np.uint8), disk(4 * S)).astype(bool), 0, rgba[..., 3])
    shape = rgba.shape[:2]
    lefts = [left_of(curve, shape) for curve in spec["boundaries"]]
    regions = {}
    previous = np.zeros(shape, bool)
    for piece, boundary in zip(spec["pieces"], [*lefts, np.ones(shape, bool)]):
        regions[piece] = boundary & ~previous
        previous |= boundary
    alpha = rgba[..., 3]
    for depth, piece in enumerate(spec["front_to_back"]):
        region = regions[piece]
        # 自分より手前の束の下になる所へ塗り足す
        in_front = np.zeros(shape, bool)
        for front in spec["front_to_back"][:depth]:
            in_front |= regions[front]
        # 目にかかる半透明の前髪には塗り足さない（手前の束と重なって二重に濃くなり、目が濁って見える）
        extension = cv2.dilate(region.astype(np.uint8), disk(OVERLAP)).astype(bool) & in_front & (alpha > 240)
        out = np.zeros_like(rgba)
        out[region] = rgba[region]
        if extension.any():
            out[..., :3] = np.where(extension[..., None], own_hair_color(rgba, region), out[..., :3])
            out[..., 3] = np.where(extension, alpha, out[..., 3])
        Image.fromarray(out, "RGBA").save(LAYERS / f"{name}_{piece}.png", compress_level=3)
        print(name, piece, "pixels", int((out[..., 3] > 0).sum()), "extended", int(extension.sum()))


for layer_name, layer_spec in SPLITS.items():
    split(layer_name, layer_spec)
