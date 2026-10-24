"""元絵（4倍）をパペット用パーツに分ける。

- 領域の判定は SAM 2.1（点・枠の指定）と色の条件、同色が続く髪の分け目だけ多角形で決める
- 白背景との境界は color-to-alpha で半透明を残す（細い毛先が欠けないように）
- 他のパーツに隠れていた部分は LaMa で埋める
座標の指定はすべて 1 倍の元絵（1024×1536）で書き、4 倍して使う。
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from sam_helper import segment

REPO = Path(__file__).resolve().parents[2]
# 中間生成物（4 倍の元絵・マスク・パーツ画像）は git に入れない作業フォルダに置く
WORK = REPO / "tmp/utopia-puppet-work"
MASTER_4X = WORK / "master/master_b_4x.png"
OUT = WORK / "layers4x"
DEBUG = WORK / "seg/debug"
S = 4

rgb = np.array(Image.open(MASTER_4X).convert("RGB"))
H, W = rgb.shape[:2]
hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV_FULL).astype(np.int16)
HUE, SAT, VAL = hsv[..., 0], hsv[..., 1], hsv[..., 2]


def poly(points):
    mask = np.zeros((H, W), np.uint8)
    cv2.fillPoly(mask, [np.array([(x * S, y * S) for x, y in points], np.int32)], 1)
    return mask.astype(bool)


def ellipse(center, rx, ry):
    mask = np.zeros((H, W), np.uint8)
    cv2.ellipse(mask, (center[0] * S, center[1] * S), (int(rx * S), int(ry * S)), 0, 0, 360, 1, -1)
    return mask.astype(bool)


def dilate(mask, px):
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * px + 1, 2 * px + 1))
    return cv2.dilate(mask.astype(np.uint8), k).astype(bool)


def erode(mask, px):
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * px + 1, 2 * px + 1))
    return cv2.erode(mask.astype(np.uint8), k).astype(bool)


def close(mask, px):
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * px + 1, 2 * px + 1))
    return cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_CLOSE, k).astype(bool)


def fill_holes(mask):
    m = mask.astype(np.uint8)
    flood = m.copy()
    cv2.floodFill(flood, np.zeros((H + 2, W + 2), np.uint8), (0, 0), 1)
    return mask | (flood == 0)


def sam(**kwargs):
    mask, _ = segment(str(MASTER_4X), **kwargs)
    return mask


def save_debug(name, mask):
    DEBUG.mkdir(parents=True, exist_ok=True)
    small = cv2.resize(mask.astype(np.uint8) * 255, (W // S, H // S), interpolation=cv2.INTER_AREA)
    Image.fromarray(small).save(DEBUG / f"{name}.png")


# ---------- 背景と前景の透明度 ----------
near_white = rgb.min(axis=2) > 236
count, labels = cv2.connectedComponents(near_white.astype(np.uint8), connectivity=4)
border_labels = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
background = np.isin(labels, border_labels[border_labels != 0])
# 髪の束に囲まれて四隅とつながらない背景の白も透明にする。顔・目・体・小物の白（白目や光沢）は除く
keep_white = (
    poly([(315, 400), (705, 400), (725, 700), (625, 805), (510, 850), (400, 800), (310, 700)])
    | poly([(672, 555), (760, 555), (760, 705), (672, 705)])
    | poly([(722, 488), (828, 488), (828, 705), (722, 705)])
    | poly([(0, 815), (1024, 815), (1024, 1536), (0, 1536)])
    | poly([(660, 660), (712, 660), (712, 765), (660, 765)])
    | poly([(620, 375), (705, 375), (705, 450), (620, 450)])
)
enclosed_white = np.isin(labels, np.setdiff1d(np.unique(labels[near_white & ~keep_white]), [0])) & ~keep_white
background |= enclosed_white & ~background
# 背景に接する帯だけ白を透明に変換し、内側は不透明にする
edge_band = dilate(background, 6 * S) & ~background
whiteness_alpha = ((255 - rgb.min(axis=2).astype(np.float32)) / (255 - 200)).clip(0, 1)
fg_alpha = np.ones((H, W), np.float32)
fg_alpha[background] = 0
fg_alpha[edge_band] = whiteness_alpha[edge_band]
# 白いシャツは背景の白とつながりやすいので、SAM の人物領域は必ず前景に含める
person = segment(str(MASTER_4X), pos=[(300, 1100), (700, 1100), (512, 600), (512, 1000)], box=(0, 160, 1024, 1536))[0]
# 髪のすき間は人物領域に含まれてしまうので、体（シャツ）の高さだけに効かせる
fg_alpha[person & erode(person, 3 * S) & poly([(0, 815), (1024, 815), (1024, 1536), (0, 1536)])] = 1
foreground = fg_alpha > 0.02


def unmix_white(color, alpha):
    """白背景と混ざった縁の色から、白を差し引いた本来の色を求める"""
    a = np.maximum(alpha, 1e-3)[..., None]
    return ((color.astype(np.float32) - 255 * (1 - a)) / a).clip(0, 255)


# ---------- SAM による主要領域 ----------
hair_sam = sam(pos=[(250, 600), (780, 700), (400, 400), (650, 300)], neg=[(560, 520), (450, 740), (500, 1100)])
lavender = (HUE >= 165) & (HUE <= 225) & (SAT >= 18) & (VAL >= 120)
head_zone = poly([(60, 150), (960, 150), (960, 905), (60, 905)])
hair_all = (close(hair_sam, 2 * S) | (lavender & head_zone & dilate(hair_sam, 6 * S))) & foreground & head_zone

face_sam = sam(pos=[(520, 720), (620, 500), (450, 760)], neg=[(380, 420), (250, 650), (505, 870)])
ahoge = sam(box=(320, 170, 525, 300)) & foreground
ear = sam(pos=[(715, 620)], box=(680, 570, 745, 695))
earring = sam(box=(668, 665, 705, 758))
ribbon = sam(pos=[(780, 560), (770, 640)], box=(728, 495, 822, 695))
upin = sam(box=(625, 380, 700, 445))
# タイは結び目から下の濃色部分。襟は体に残す
tie = poly([(455, 925), (585, 925), (640, 1395), (395, 1395)]) & (VAL < 150)
brooch = sam(box=(480, 915, 560, 980))
eye_sam = {
    "L": sam(box=(545, 585, 690, 675)),
    "R": sam(box=(330, 600, 470, 700)),
}

# ピアスは宝石が紫で髪の色判定に、輪が耳の領域に入りやすいので、どちらからも外す
hair_all &= ~dilate(earring, S)
ear &= ~dilate(earring, S // 2)

# ---------- 髪の分け目 ----------
braid_zone = poly([(560, 330), (600, 318), (650, 360), (705, 430), (742, 515), (740, 585), (712, 575), (676, 500), (630, 430), (585, 380), (556, 352)])
front_zone = poly([(390, 255), (470, 238), (560, 250), (600, 300), (575, 335), (562, 560), (522, 620), (474, 712), (430, 706), (402, 600), (372, 525), (346, 420), (350, 330)])
side_r_zone = poly([(100, 290), (390, 255), (350, 330), (346, 420), (372, 525), (345, 620), (340, 700), (380, 760), (470, 820), (470, 905), (90, 905)])
side_l_zone = poly([(600, 300), (920, 300), (920, 905), (560, 905), (622, 820), (690, 700), (745, 585), (720, 500)])

braid = (hair_all & braid_zone) | upin
hair = hair_all & ~ahoge & ~braid & ~ribbon & ~ear & ~earring
hair_front = hair & front_zone
hair_side_r = hair & side_r_zone & ~front_zone
hair_side_l = hair & side_l_zone & ~braid_zone
# 目や額にかかる半透明の前髪（肌と混ざってマゼンタ寄りに見える）も前髪に含める
translucent_bangs = front_zone & (HUE >= 200) & (HUE <= 246) & (SAT >= 20) & (VAL >= 170) & ~ribbon & ~braid
# 瞳の明るい部分も同じ色相なので除く
translucent_bangs &= ~ellipse((597, 633), 37, 36) & ~ellipse((410, 658), 36, 35)
hair_front |= close(translucent_bangs, S)
# 髪の輪郭線（暗い線）は手前側の髪に含める
dark_line = (VAL < 150) & foreground
eye_boxes = poly([(325, 590), (475, 590), (475, 705), (325, 705)]) | poly([(540, 575), (695, 575), (695, 680), (540, 680)])
hair_front |= dilate(hair_front, 2 * S) & dark_line & ~eye_boxes & ~ribbon & ~braid
hair_side_r |= dilate(hair_side_r, 2 * S) & dark_line & ~eye_boxes & ~hair_front
hair_back_visible = hair & ~hair_front & ~hair_side_r & ~hair_side_l

# ---------- 目 ----------
EYES = {
    "L": {"center": (597, 633), "rx": 34, "ry": 33, "lid_mid_y": 618},
    "R": {"center": (410, 658), "rx": 33, "ry": 32, "lid_mid_y": 643},
}
# 半透明の前髪に重なったまつ毛・白目・瞳は目のパーツへ戻す（目を閉じたとき前髪に残らないように）
for side in EYES:
    box = dilate(eye_sam[side], 3 * S)
    sclera_tone = (rgb.min(axis=2) > 235) & ((rgb[..., 0].astype(np.int16) - rgb[..., 2]) < 7)
    iris_tone = (HUE >= 180) & (HUE <= 215) & (SAT > 50) & (VAL < 235)
    eye_content = box & ((VAL < 130) | sclera_tone | iris_tone)
    hair_front &= ~close(eye_content, S)
eye_layers = {}
for side, eye in EYES.items():
    region = dilate(eye_sam[side], 5 * S) & ~hair_front
    dark = region & (VAL < 120)
    # 赤茶のアイラインは色相が赤の両端（0 付近と 255 付近）にまたがる
    liner = region & ((HUE <= 30) | (HUE >= 230)) & (SAT > 60) & (VAL < 215)
    iris_shape = ellipse(eye["center"], eye["rx"] + 1, eye["ry"] + 1)
    cy = eye["center"][1] * S
    rows = np.arange(H)[:, None]
    # 瞳の上側も暗いので、瞳の楕円の中はまつ毛らしいごく暗い画素だけを拾う
    very_dark = region & (VAL < 70)
    upper_lash = ((dark | liner) & ~iris_shape | very_dark & iris_shape & (rows < (eye["lid_mid_y"] + 2) * S)) & (rows < cy)
    upper_lash = close(upper_lash, 2) & region
    lower_lash = (dark | liner | ((HUE <= 25) & (SAT > 40) & (VAL < 235))) & region & (rows > cy + eye["ry"] * S * 0.55) & ~iris_shape
    # 白目は肌とほぼ同じ色なので、白目らしい画素と瞳を列ごとに上下でつないで開口部の形を作る
    sclera_like = region & (rgb.min(axis=2) > 235) & ((rgb[..., 0].astype(np.int16) - rgb[..., 2]) < 7)
    seed = (sclera_like | (iris_shape & region & ~upper_lash)) & ~upper_lash & ~lower_lash
    seed &= rows > (eye["lid_mid_y"] - 8) * S
    seed = cv2.morphologyEx(seed.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2 * S, 2 * S), np.uint8)).astype(bool)
    opening = np.zeros((H, W), bool)
    cols = np.where(seed.any(axis=0))[0]
    for x in cols:
        ys = np.where(seed[:, x])[0]
        opening[ys.min():ys.max() + 1, x] = True
    opening = close(opening, 3 * S) & ~upper_lash
    iris_visible = iris_shape & region & ~upper_lash
    eye_layers[side] = {
        "upper": upper_lash,
        "lower": lower_lash,
        "opening": opening,
        "iris_visible": iris_visible,
        "iris_shape": iris_shape,
        "region": region,
    }
    for key, value in eye_layers[side].items():
        save_debug(f"eye_{side}_{key}", value)

# 眉は本人の左だけ見えている。右は前髪の下にあるので左を左右反転して置く
brow_l = sam(box=(555, 538, 662, 566)) & ~hair_front & (VAL < 235)
save_debug("brow_L", brow_l)

mouth = sam(box=(495, 752, 540, 768)) & (VAL < 230)
save_debug("mouth", mouth)

# 顔: 肌のうち、目・眉・口・耳を除いたもの
face_visible = (face_sam | close(face_sam & ~hair_all, 4 * S)) & ~hair_all & ~ear & ~earring
# 目のまわりの二重線や影は顔に残し、動く部品（白目・瞳・まつ毛）だけ抜く
eye_parts = np.zeros((H, W), bool)
for side in EYES:
    layer = eye_layers[side]
    eye_parts |= layer["opening"] | layer["upper"] | layer["lower"] | layer["iris_visible"]
face_visible = (face_visible | (dilate(face_sam, S) & ~hair_all & foreground & poly([(300, 560), (720, 560), (720, 720), (300, 720)]))) & ~eye_parts & ~ear & ~earring

body_visible = foreground & ~hair_all & ~face_sam & ~ear & ~earring & ~ahoge & ~ribbon & ~braid & ~tie & ~brooch & poly([(0, 760), (1024, 760), (1024, 1536), (0, 1536)])
body_visible &= ~eye_parts
tie_layer = close(tie | brooch, 2 * S) & foreground
body_visible &= ~tie_layer
# どのパーツにも入らなかった前景は、下半分なら体、上なら後ろ髪へ寄せる
assigned = hair_all | ahoge | ribbon | braid | ear | earring | face_visible | body_visible | tie_layer | brow_l | mouth
assigned |= eye_parts
leftover = foreground & ~assigned
body_visible |= leftover & poly([(0, 760), (1024, 760), (1024, 1536), (0, 1536)])
hair_back_visible |= leftover & ~poly([(0, 760), (1024, 760), (1024, 1536), (0, 1536)])

# どのパーツにも入らなかった頭まわりの画素（髪と肌の境目の半透明な毛先など）は、
# 元の色のまま最も近いパーツに含める
skin_like = ((HUE <= 30) | (HUE >= 245)) & (SAT < 45) & (VAL > 220)
face_visible &= skin_like | ~dilate(hair_all, 6 * S)
head_area = foreground & poly([(60, 150), (960, 150), (960, 900), (60, 900)])
claimed = ahoge | ribbon | braid | ear | earring | brow_l | mouth | eye_parts | tie_layer | body_visible
candidates = {"hair_front": hair_front, "hair_side_R": hair_side_r, "hair_side_L": hair_side_l,
              "hair_back_visible": hair_back_visible, "face_visible": face_visible}
unclaimed = head_area & ~claimed
for value in candidates.values():
    unclaimed &= ~value
best_distance = np.full((H, W), np.inf, np.float32)
best_name = np.full((H, W), "", object)
for name, value in candidates.items():
    distance = cv2.distanceTransform((~value).astype(np.uint8), cv2.DIST_L2, 3)
    closer = unclaimed & (distance < best_distance)
    best_distance[closer] = distance[closer]
    best_name[closer] = name
hair_front |= unclaimed & (best_name == "hair_front")
hair_side_r |= unclaimed & (best_name == "hair_side_R")
hair_side_l |= unclaimed & (best_name == "hair_side_L")
hair_back_visible |= unclaimed & (best_name == "hair_back_visible")
face_visible |= unclaimed & (best_name == "face_visible")
hair_all |= unclaimed & (best_name != "face_visible")
# 顔の上にかかっている髪は、顔より奥の後ろ髪ではなく手前の前髪・横髪に入れる
hull = cv2.convexHull(np.argwhere(face_sam)[:, ::-1].astype(np.int32))
face_zone = np.zeros((H, W), np.uint8)
cv2.fillPoly(face_zone, [hull], 1)
face_zone = face_zone.astype(bool) | poly([(350, 610), (355, 480), (410, 425), (510, 405), (605, 420), (660, 470), (690, 560), (700, 640)])
over_face = hair_back_visible & face_zone
front_parts = {"front": hair_front, "side_r": hair_side_r, "side_l": hair_side_l}
best_distance = np.full((H, W), np.inf, np.float32)
owner = np.full((H, W), "", object)
for name, value in front_parts.items():
    distance = cv2.distanceTransform((~value).astype(np.uint8), cv2.DIST_L2, 3)
    closer = over_face & (distance < best_distance)
    best_distance[closer] = distance[closer]
    owner[closer] = name
hair_front |= over_face & (owner == "front")
hair_side_r |= over_face & (owner == "side_r")
hair_side_l |= over_face & (owner == "side_l")
hair_back_visible &= ~over_face
# 耳より上でこめかみに重なる横髪 L は顔より手前なので前髪側に移す
temple = hair_side_l & face_zone & poly([(0, 0), (1024, 0), (1024, 585), (0, 585)])
hair_front |= temple
hair_side_l &= ~temple
print("hair over face moved to front", int(over_face.sum()))
print("unclaimed pixels reassigned", int(unclaimed.sum()))

# 顔の範囲にあるのに髪の色ではない画素（肌・目もとの影）は、髪ではなく顔に戻す
hairish = (HUE >= 165) & (HUE <= 246) & (SAT >= 18)
not_hair_on_face = face_zone & ~hairish & (VAL >= 130)
for part in (hair_front, hair_side_r, hair_side_l):
    moved = part & not_hair_on_face
    face_visible |= moved
    part &= ~moved

# 最寄り割り当てなどで髪や顔に入った目のまわりの暗い画素は、上まつ毛に戻す
rows = np.arange(H)[:, None]
for side, eye in EYES.items():
    zone = dilate(eye_sam[side], 8 * S)
    # まつ毛の先は髪と重なって少し明るく灰色に見えるので、しきい値を高めにとる
    stray = zone & (((VAL < 165) & (SAT < 90)) | ((SAT < 35) & (VAL < 215))) & (rows < (eye["center"][1] + eye["ry"] * 0.5) * S) & ~eye_layers[side]["iris_shape"]
    stray &= hair_front | hair_side_r | hair_side_l | hair_back_visible | face_visible
    eye_layers[side]["upper"] |= stray
    for part in (hair_front, hair_side_r, hair_side_l, hair_back_visible, face_visible):
        part &= ~stray
    print(side, "stray lash pixels", int(stray.sum()))

# 肩より上で首まわり以外にある体の画素は毛先の縁なので、左右の横髪に移す
above_shoulder = poly([(0, 0), (1024, 0), (1024, 868), (0, 868)]) & ~poly([(405, 760), (635, 760), (635, 900), (405, 900)])
tip_edges = body_visible & above_shoulder
hair_side_r |= tip_edges & poly([(0, 0), (512, 0), (512, 1536), (0, 1536)])
hair_side_l |= tip_edges & ~poly([(0, 0), (512, 0), (512, 1536), (0, 1536)])
hair_all |= tip_edges
body_visible &= ~tip_edges

# 腕: 肩のケープの脇と袖。肩を支点に回すので、胴との境目は肩から袖の内側の線に沿って切る
arm_r_zone = poly([(0, 900), (205, 945), (262, 1150), (300, 1340), (292, 1536), (0, 1536)])
arm_l_zone = poly([(1024, 900), (835, 940), (778, 1150), (750, 1340), (752, 1536), (1024, 1536)])
arm_r = body_visible & arm_r_zone
arm_l = body_visible & arm_l_zone
body_visible &= ~(arm_r | arm_l)

masks = {
    "hair_all": hair_all, "hair_front": hair_front, "hair_side_R": hair_side_r, "hair_side_L": hair_side_l,
    "hair_back_visible": hair_back_visible, "braid_L": braid, "ahoge": ahoge, "ribbon_L": ribbon, "ear_L": ear,
    "earring_L": earring, "face_visible": face_visible, "body": body_visible, "tie": tie_layer,
    "arm_L": arm_l, "arm_R": arm_r,
}
for name, value in masks.items():
    save_debug(name, value)

np.savez_compressed(WORK / "seg/masks4x.npz", **{k: v for k, v in masks.items()},
                    **{f"eye_{s}_{k}": v for s, d in eye_layers.items() for k, v in d.items()},
                    brow_L=brow_l, mouth=mouth, fg_alpha=fg_alpha,
                    translucent_bangs=translucent_bangs & hair_front)
print("masks saved")
