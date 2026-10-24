"""build_layers.py のマスクから、4 倍キャンバスの RGBA パーツ画像を作る。

隠れていた部分の描き足し:
- 肌（顔・首）と瞳: 見えている同じパーツの画素だけから cv2.inpaint で延ばす（他パーツの色が混ざらない）
- 後ろ髪の顔の裏: 髪の画素から延ばし、少し暗くして奥にある髪に見せる
"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
# 中間生成物（4 倍の元絵・マスク・パーツ画像）は git に入れない作業フォルダに置く
WORK = REPO / "tmp/utopia-puppet-work"
OUT = WORK / "layers4x"
OUT.mkdir(exist_ok=True)
S = 4

rgb = np.array(Image.open(WORK / "master/master_b_4x.png").convert("RGB"))
H, W = rgb.shape[:2]
m = dict(np.load(WORK / "seg/masks4x.npz"))
fg_alpha = m["fg_alpha"]


def poly(points):
    mask = np.zeros((H, W), np.uint8)
    cv2.fillPoly(mask, [np.array([(x * S, y * S) for x, y in points], np.int32)], 1)
    return mask.astype(bool)


def ellipse_mask(center, rx, ry):
    mask = np.zeros((H, W), np.uint8)
    cv2.ellipse(mask, (int(center[0] * S), int(center[1] * S)), (int(rx * S), int(ry * S)), 0, 0, 360, 1, -1)
    return mask.astype(bool)


def morph(mask, px, op):
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * px + 1, 2 * px + 1))
    return cv2.morphologyEx(mask.astype(np.uint8), op, k).astype(bool)


def dilate(mask, px):
    return morph(mask, px, cv2.MORPH_DILATE)


def unmix_white(color, alpha):
    a = np.maximum(alpha, 1e-3)[..., None]
    return ((color.astype(np.float32) - 255 * (1 - a)) / a).clip(0, 255).astype(np.uint8)


color = rgb.copy()
edge = fg_alpha < 0.999
color[edge] = unmix_white(rgb, fg_alpha)[edge]


def extend_from(known, target, *, radius=6, downscale=4):
    """known の画素だけを手がかりに target 全体を塗る。大きな範囲は縮小して処理し、戻して重ねる"""
    ys, xs = np.where(target | known)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = color[y0:y1, x0:x1]
    k = known[y0:y1, x0:x1]
    small = cv2.resize(crop, ((x1 - x0) // downscale, (y1 - y0) // downscale), interpolation=cv2.INTER_AREA)
    small_known = cv2.resize(k.astype(np.uint8), small.shape[1::-1], interpolation=cv2.INTER_NEAREST).astype(bool)
    small_known = cv2.erode(small_known.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    filled = cv2.inpaint(small, (~small_known).astype(np.uint8) * 255, radius, cv2.INPAINT_TELEA)
    filled = cv2.resize(filled, (x1 - x0, y1 - y0), interpolation=cv2.INTER_CUBIC)
    result = color.copy()
    region = np.zeros((H, W), bool)
    region[y0:y1, x0:x1] = True
    paint = target & ~known & region
    result[paint] = filled[paint[y0:y1, x0:x1]]
    return result


def smooth_fill(source, target, *, sigmas=(4, 16, 64, 200)):
    """source の色を大きくぼかして target を塗る（正規化畳み込み）。近いところほど細かいぼかしを優先する"""
    ys, xs = np.where(target | source)
    pad = 40 * S
    y0, y1 = max(0, ys.min() - pad), min(H, ys.max() + pad)
    x0, x1 = max(0, xs.min() - pad), min(W, xs.max() + pad)
    d = 4
    size = ((x1 - x0) // d, (y1 - y0) // d)
    src = cv2.resize(source[y0:y1, x0:x1].astype(np.float32), size, interpolation=cv2.INTER_AREA)
    col = cv2.resize(color[y0:y1, x0:x1].astype(np.float32), size, interpolation=cv2.INTER_AREA)
    src = (src > 0.99).astype(np.float32)
    filled = np.zeros_like(col)
    done = np.zeros(src.shape, bool)
    for sigma in sigmas:
        num = cv2.GaussianBlur(col * src[..., None], (0, 0), sigma)
        den = cv2.GaussianBlur(src, (0, 0), sigma)
        ok = (den > 0.05) & ~done
        filled[ok] = num[ok] / den[ok][:, None]
        done |= ok
    filled = cv2.resize(filled, (x1 - x0, y1 - y0), interpolation=cv2.INTER_CUBIC)
    result = color.copy()
    paint = np.zeros((H, W), bool)
    paint[y0:y1, x0:x1] = target[y0:y1, x0:x1] & ~source[y0:y1, x0:x1]
    result[paint] = filled[paint[y0:y1, x0:x1]].clip(0, 255).astype(np.uint8)
    return result


def feather(mask, px=1.5):
    return cv2.GaussianBlur(mask.astype(np.float32), (0, 0), px * S / 2)


def save(name, pixels, alpha):
    rgba = np.dstack([pixels, (alpha.clip(0, 1) * 255).astype(np.uint8)])
    Image.fromarray(rgba, "RGBA").save(OUT / f"{name}.png", compress_level=3)
    print("saved", name)


def drop_stray_wisps(alpha, *, min_area=400 * S * S):
    """本体から離れた細切れの毛先（点線のように途切れて見える）を消す"""
    count, labels, stats, _ = cv2.connectedComponentsWithStats((alpha > 0.25).astype(np.uint8), connectivity=8)
    small = np.zeros(count, bool)
    small[1:] = stats[1:, cv2.CC_STAT_AREA] < min_area
    alpha = alpha.copy()
    alpha[small[labels]] = 0
    return alpha


# 髪の外側で細く飛び出した浮き毛は、切り出すと点線のように途切れて見えるので省く。
# 髪のかたまりを細い線が消える太さで開き、その少し外までだけを残す（顔にかかる前髪の筋は対象外）
_hair_solid = morph(m["hair_all"] & (fg_alpha > 0.5), 5 * S, cv2.MORPH_OPEN)
_keep_hair = cv2.GaussianBlur(dilate(_hair_solid, 2 * S).astype(np.float32), (0, 0), S)
_face_area = dilate(m["face_visible"], 12 * S)
hair_trim = np.where(_face_area, 1.0, _keep_hair)


def visible_layer(name, mask, *, soft=1.5):
    alpha = feather(mask, soft) * fg_alpha
    if name.startswith("hair") or name == "ahoge":
        alpha = drop_stray_wisps(alpha * (hair_trim if name.startswith("hair") else 1.0))
    save(name, color, alpha)


# ---------- 顔 ----------
eye_regions = m["eye_L_region"] | m["eye_R_region"]
eye_parts = np.zeros((H, W), bool)
for side in ("L", "R"):
    eye_parts |= m[f"eye_{side}_opening"] | m[f"eye_{side}_upper"] | m[f"eye_{side}_lower"] | m[f"eye_{side}_iris_visible"]
forehead = poly([(350, 610), (355, 480), (410, 425), (510, 405), (605, 420), (660, 470), (690, 560), (700, 640)])
jaw = cv2.convexHull(np.argwhere(m["face_visible"] | eye_regions)[:, ::-1].astype(np.int32))
face_hull = np.zeros((H, W), np.uint8)
cv2.fillPoly(face_hull, [jaw], 1)
face_full = (face_hull.astype(bool) | forehead) & ~m["ear_L"]
face_full &= ~poly([(0, 0), (1024, 0), (1024, 400), (0, 400)])
hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV_FULL).astype(np.int16)
skin_color = ((hsv[..., 0] <= 30) | (hsv[..., 0] >= 240)) & (hsv[..., 2] >= 225)
# 目を閉じたときに残骸が見えないよう、白目・まつ毛を囲む範囲は肌で塗る
sockets = np.zeros((H, W), bool)
for side in ("L", "R"):
    parts = m[f"eye_{side}_opening"] | m[f"eye_{side}_upper"] | m[f"eye_{side}_lower"]
    hull = cv2.convexHull(np.argwhere(parts)[:, ::-1].astype(np.int32))
    socket = np.zeros((H, W), np.uint8)
    cv2.fillPoly(socket, [hull], 1)
    sockets |= dilate(socket.astype(bool), 3 * S)
face_known = m["face_visible"] & skin_color & ~dilate(eye_parts | m["brow_L"] | m["mouth"], 4 * S) & ~sockets
face_known &= ~dilate(m["hair_front"] | m["hair_side_R"] | m["hair_side_L"], 2 * S)
face_pixels = smooth_fill(face_known, face_full | m["face_visible"])
# 見えている肌はそのまま残す
keep_face = m["face_visible"] & ~dilate(m["brow_L"] | m["mouth"], 2 * S) & ~sockets
# 髪の下にある肌色でない画素は、元絵で半透明の髪が重なっていた跡なので肌で塗り直す
# （髪のパーツを清書すると形が少し変わり、すき間から跡が見えるため）
under_hair_face = dilate(m["hair_front"] | m["hair_side_R"] | m["hair_side_L"], 6 * S) & ~skin_color
keep_face &= ~under_hair_face
face_pixels[keep_face] = color[keep_face]
save("face", face_pixels, feather(face_full | m["face_visible"], 0.6))

# ---------- 体（首を顎の下まで延ばし、髪の毛先の下も服で埋める） ----------
neck_extension = poly([(445, 745), (585, 745), (590, 840), (440, 840)])
under_hair = poly([(150, 780), (880, 780), (880, 940), (150, 940)]) & dilate(m["body"], 40 * S)
# 体より手前に描く横髪の下だけ服で埋める（後ろ髪は体の奥なので埋めない）
in_front_hair = m["hair_side_L"] | m["hair_side_R"] | m["hair_front"]
# 腕が動いたときに見える胴の脇も、シャツの色で埋めておく
under_arms = dilate(m["body"], 70 * S) & (m["arm_L"] | m["arm_R"])
# 毛先は肩より上の背景にもかかるので、胴の輪郭の内側だけを埋める
body_outline = morph(m["body"] | m["arm_L"] | m["arm_R"] | m["tie"], 30 * S, cv2.MORPH_CLOSE)
body_full = m["body"] | neck_extension | (under_hair & ~m["body"] & in_front_hair & body_outline) | m["tie"] | under_arms
neck_skin = m["body"] & skin_color & poly([(430, 760), (600, 760), (600, 900), (430, 900)])
body_pixels = smooth_fill(m["body"] & (fg_alpha > 0.99) & ~neck_skin, body_full & ~neck_extension)
neck_pixels = smooth_fill(neck_skin, neck_extension)
body_pixels[neck_extension & ~m["body"]] = neck_pixels[neck_extension & ~m["body"]]
body_pixels[m["body"]] = color[m["body"]]
body_alpha = np.where(m["body"], fg_alpha, 1.0) * feather(body_full, 1)
save("torso", body_pixels, body_alpha)
visible_layer("arm_L", m["arm_L"])
visible_layer("arm_R", m["arm_R"])

visible_layer("tie", m["tie"])

# ---------- 髪 ----------
hair_all = m["hair_all"]
head_silhouette = morph(hair_all | face_full | m["ear_L"] | m["braid_L"] | m["ribbon_L"], 12 * S, cv2.MORPH_CLOSE)
head_silhouette &= ~poly([(420, 840), (640, 840), (640, 1000), (420, 1000)])
# 顔の裏だけを髪で埋める。外側の毛先のすき間は埋めない
# あごより下へは広げない（首を傾けたとき首の横にはみ出して見えるため）
behind = dilate(face_full | m["ear_L"], 20 * S) & head_silhouette & ~hair_all & ~poly([(0, 815), (1024, 815), (1024, 1536), (0, 1536)])
# ピアスの裏は髪で埋める（ピアスを外した穴が見えないように）
earring_hole = dilate(m["earring_L"], 2 * S)
# 横髪・前髪の毛先のコピーは、揺れたとき二重に見えるので下敷きに含めない
lower_front_tips = (m["hair_side_L"] | m["hair_side_R"] | m["hair_front"]) & poly([(0, 760), (1024, 760), (1024, 1536), (0, 1536)])
head_silhouette = (hair_all & ~lower_front_tips) | behind | earring_hole
lavender = (hsv[..., 0] >= 165) & (hsv[..., 0] <= 225) & (hsv[..., 1] >= 18) & (hsv[..., 2] >= 150)
back_pixels = smooth_fill(hair_all & lavender & (fg_alpha > 0.99) & ~m["braid_L"], head_silhouette)
shade = np.ones((H, W), np.float32)
shade[behind] = 0.72
back_pixels = (back_pixels.astype(np.float32) * shade[..., None]).clip(0, 255).astype(np.uint8)
back_alpha = drop_stray_wisps(np.where(hair_all & ~earring_hole, fg_alpha, 1.0) * feather(head_silhouette, 1) * hair_trim)
save("hair_back", back_pixels, back_alpha)

# 横髪 L はピアスに隠れていた部分を髪で埋める
side_l_full = m["hair_side_L"] | (earring_hole & dilate(m["hair_side_L"], 6 * S))
side_l_pixels = smooth_fill(m["hair_side_L"] & (fg_alpha > 0.99), side_l_full)
save("hair_side_L", side_l_pixels, drop_stray_wisps(np.where(m["hair_side_L"], fg_alpha, 1.0) * feather(side_l_full, 0.6) * hair_trim))

for name in ["hair_side_R", "hair_front", "braid_L", "ribbon_L", "ear_L", "earring_L", "ahoge"]:
    visible_layer(name, m[name], soft=0.6)

# ---------- 目 ----------
EYES = {
    "L": {"center": (597, 633), "rx": 34, "ry": 33},
    "R": {"center": (410, 658), "rx": 33, "ry": 32},
}
for side, eye in EYES.items():
    opening = m[f"eye_{side}_opening"]
    upper = m[f"eye_{side}_upper"]
    # 白目は開口部をまつ毛の下へ少しだけ広げ、見えている白目の色で塗る（影は足さない。まぶたが下りたとき帯に見えるため）
    white_shape = morph(opening | (dilate(opening, 2 * S) & upper), S, cv2.MORPH_CLOSE)
    sclera = opening & ~m[f"eye_{side}_iris_shape"] & (rgb.min(axis=2) > 200)
    tone = np.median(rgb[sclera], axis=0) if sclera.any() else np.array([250, 248, 252])
    white = np.zeros_like(rgb)
    white[:] = tone.astype(np.uint8)
    white[sclera] = rgb[sclera]
    save(f"eye_white_{side}", white, feather(white_shape, 0.8))

    iris_shape = ellipse_mask(eye["center"], eye["rx"] + 1.5, eye["ry"] + 1.5)
    iris_pixels = extend_from(m[f"eye_{side}_iris_visible"] & ~dilate(upper, S), iris_shape, downscale=1, radius=4)
    save(f"iris_{side}", iris_pixels, feather(iris_shape, 0.6))

    visible_layer(f"eyelash_upper_{side}", upper, soft=0.6)
    visible_layer(f"eyelash_lower_{side}", m[f"eye_{side}_lower"], soft=0.6)

# ---------- 眉・口 ----------
visible_layer("brow_L", m["brow_L"], soft=0.6)
# 本人の右眉は前髪の下にあるので、左眉を顔の中心線で反転して置く
axis_x = int(503.5 * S)
brow_rgba = np.array(Image.open(OUT / "brow_L.png"))
mirrored = np.zeros_like(brow_rgba)
ys, xs = np.where(brow_rgba[..., 3] > 0)
new_xs = 2 * axis_x - xs
new_ys = ys + 25 * S
ok = (new_xs >= 0) & (new_xs < W) & (new_ys < H)
mirrored[new_ys[ok], new_xs[ok]] = brow_rgba[ys[ok], xs[ok]]
# 元絵では前髪に隠れて見えないので、前髪・横髪の下にある部分だけ残す
cover = cv2.GaussianBlur((m["hair_front"] | m["hair_side_R"]).astype(np.float32), (0, 0), S)
mirrored[..., 3] = (mirrored[..., 3] * cover).astype(np.uint8)
Image.fromarray(mirrored, "RGBA").save(OUT / "brow_R.png")
print("saved brow_R")

visible_layer("mouth_closed", m["mouth"], soft=0.6)

# ---------- 照れの頬染め（手描きの素材が届くまでの代わり） ----------
cheek = np.zeros((H, W), np.float32)
for cx, cy in [(425, 728), (612, 712)]:
    blob = np.zeros((H, W), np.uint8)
    cv2.ellipse(blob, (cx * S, cy * S), (34 * S, 16 * S), 0, 0, 360, 1, -1)
    cheek = np.maximum(cheek, cv2.GaussianBlur(blob.astype(np.float32), (0, 0), 10 * S))
blush = np.zeros_like(rgb)
blush[:] = (244, 140, 160)
save("cheek", blush, cheek * 0.55)
