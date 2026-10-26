"""GPT で描き直したパーツを、Live2D で動かしたときに破綻しない形に整える（評価で出た指摘への対処）。

- 白目・瞳: 目は下まつ毛の線までと決め、元絵からたどった目の輪郭（EYE_OUTLINE）と上まつ毛の裏の範囲に収める。
  GPT の白目は丸い楕円で下まぶたより下まで広がり、目を閉じても白い帯が残るため
- 下まつ毛: GPT の下まつ毛は元絵の位置からずれる（瞳を横切る）ので、元絵の下まつ毛を輪郭の下端から切り出す
- 目尻: 目尻では上まつ毛と下まつ毛がつながっている。上まぶたの弧が下まぶた側へ折り返す所より外
  （目尻の跳ねと、下まつ毛へ下りる線）を上まつ毛から外し、閉じても動かない下まつ毛側に移す
- 顔: GPT の顔にも小さな口が描かれていて、閉じ口の線と二重に見えるので口の赤みを消す
  （閉じ口の線は draw_mouth_line.py で描く）
- 腕: GPT が描き足した袖山が、胴の肩線の手前に二重の山として見える。元絵で腕が見えていた範囲
  （少し広げたもの）に収め、肩の継ぎ目の袖は元絵の画素にする。胴も見えている所は元絵の画素にして肩の線を
  一本につなぎ、袖の下に隠れる胴は袖ぐりの輪郭線を消して布の色で埋める
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
master_rgb = np.array(Image.open(WORK / "master/master_b_4x.png").convert("RGB")).astype(np.float32)


def disk(px: int) -> np.ndarray:
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * px + 1, 2 * px + 1))


def load(name: str) -> np.ndarray:
    return np.array(Image.open(LAYERS / f"{name}.png").convert("RGBA")).astype(np.float32)


def save(name: str, rgba: np.ndarray):
    Image.fromarray(rgba.clip(0, 255).astype(np.uint8), "RGBA").save(LAYERS / f"{name}.png", compress_level=3)
    print("fitted", name)


def soft(mask: np.ndarray, px: float) -> np.ndarray:
    return cv2.GaussianBlur(mask.astype(np.float32), (0, 0), px)


# 目の輪郭（4 倍の座標）。元絵の上まつ毛の下端と下まつ毛の線をたどったもの。
# SAM の開口部マスクは瞳のまわりしか取れず、目頭・目尻の白目が抜けるため手でたどる
EYE_OUTLINE = {
    "R": [(1393, 2640), (1403, 2600), (1460, 2560), (1513, 2533), (1560, 2520), (1660, 2517), (1727, 2527),
          (1760, 2545), (1800, 2590), (1820, 2640), (1793, 2680), (1753, 2707), (1693, 2727), (1620, 2743),
          (1560, 2747), (1513, 2743), (1460, 2727), (1413, 2707)],
    "L": [(2247, 2540), (2265, 2500), (2287, 2473), (2340, 2440), (2407, 2430), (2513, 2433), (2573, 2437),
          (2640, 2458), (2690, 2474), (2712, 2478), (2673, 2507), (2633, 2560), (2593, 2607), (2540, 2640), (2473, 2653),
          (2407, 2657), (2340, 2653), (2290, 2635), (2265, 2600)],
}
master = np.array(Image.open(WORK / "master/master_b_4x.png").convert("RGB"))
master_hsv = cv2.cvtColor(master, cv2.COLOR_RGB2HSV_FULL).astype(np.int16)
# 目尻の切れ目（4 倍の座標）。上まぶたの弧が下まぶた側へ折り返す点から、外側の跳ねと跳ねの間のくぼみへ引いた線。
# この線より目の外側にある上まつ毛は目尻として扱う（Codex に元絵を見せて決めた初期案）
EYE_CORNER_CUT = {"R": ((1350, 2570), (1405, 2615)), "L": ((2640, 2480), (2695, 2435))}
# 下まつ毛は赤みのある細い線。周りの肌より彩度が高いことで見分ける（頬の赤みは周りとの差が小さい）
saturation = master_hsv[..., 1].astype(np.float32)
lash_contrast = saturation - cv2.medianBlur(master_hsv[..., 1].astype(np.uint8), 31).astype(np.float32)
lash_colored = ((master_hsv[..., 0] >= 230) | (master_hsv[..., 0] <= 25)) & (lash_contrast > 20)

for side in ("L", "R"):
    outline = np.zeros(master.shape[:2], np.uint8)
    cv2.fillPoly(outline, [np.array(EYE_OUTLINE[side], np.int32)], 1)
    upper = load(f"eyelash_upper_{side}")[..., 3] > 40
    # 上へは上まつ毛の裏まで、横と下へは 1px（元絵の解像度）だけ広げて、まつ毛の下に潜らせる
    allowed = cv2.dilate(outline, disk(S)).astype(bool) | (cv2.dilate(outline, disk(10 * S)).astype(bool) & upper)
    # 上まつ毛の跳ねに沿って横へはみ出さないよう、輪郭の左右幅に収める（白目の範囲が閉じる位置の基準になる）
    xs = np.nonzero(outline.any(axis=0))[0]
    allowed[:, : xs.min() - S] = False
    allowed[:, xs.max() + S :] = False
    iris = load(f"iris_{side}")
    iris[..., 3] *= soft(allowed, S / 2)
    save(f"iris_{side}", iris)
    # GPT の白目は目頭・目尻の角まで届かないことがあるので、輪郭の中の足りない所を周りの白目の色で埋める
    white = load(f"eye_white_{side}")
    # 白目の画素だけを重みにしてぼかした色で埋める（透明な画素の黒を混ぜない）
    valid = (white[..., 3] > 200).astype(np.float32)
    filled = soft(valid[..., None] * white[..., :3], 12 * S) / np.maximum(soft(valid, 12 * S), 1e-4)[..., None]
    white[..., :3] = np.where(valid[..., None] > 0, white[..., :3], filled)
    white[..., 3] = 255 * soft(allowed, S / 2)
    save(f"eye_white_{side}", white)

    # 輪郭の下端から下 8px（元絵）までの帯にある下まつ毛の色を切り出す
    ys, xs = np.nonzero(outline)
    bottom = np.full(master.shape[1], -1)
    np.maximum.at(bottom, xs, ys)
    rows = np.arange(master.shape[0])[:, None]
    band = (bottom[None, :] >= 0) & (rows >= bottom[None, :] - 3 * S) & (rows <= bottom[None, :] + 8 * S)
    lash = band & lash_colored & ~upper
    alpha = np.clip((lash_contrast - 12) / 40, 0, 1) * soft(lash, S / 4)
    lower = np.zeros((*master.shape[:2], 4), np.float32)
    lower[..., :3] = master * (alpha[..., None] > 0)
    lower[..., 3] = alpha * 255

    # 目尻: 切れ目の線より目の外側（目の中心と反対側）で、線の近くにある上まつ毛を下まつ毛側へ移す
    (ax, ay), (bx, by) = EYE_CORNER_CUT[side]
    length = np.hypot(bx - ax, by - ay)
    rows, cols = np.mgrid[0 : master.shape[0], 0 : master.shape[1]]
    signed = ((bx - ax) * (rows - ay) - (by - ay) * (cols - ax)) / length
    center_y, center_x = np.nonzero(outline)
    if ((bx - ax) * (center_y.mean() - ay) - (by - ay) * (center_x.mean() - ax)) > 0:
        signed = -signed
    near = np.hypot(cols - (ax + bx) / 2, rows - (ay + by) / 2) < 300
    corner = np.clip(signed / (2 * S) + 0.5, 0, 1) * near
    upper_rgba = load(f"eyelash_upper_{side}")
    moved = upper_rgba[..., 3] * corner
    lower[..., :3] = np.where((moved > lower[..., 3])[..., None], upper_rgba[..., :3], lower[..., :3])
    lower[..., 3] = np.maximum(lower[..., 3], moved)
    upper_rgba[..., 3] *= 1 - corner
    save(f"eyelash_upper_{side}", upper_rgba)
    save(f"eyelash_lower_{side}", lower)

face = load("face")
hsv = cv2.cvtColor(face[..., :3].clip(0, 255).astype(np.uint8), cv2.COLOR_RGB2HSV_FULL).astype(np.int16)
mouth_area = np.zeros(face.shape[:2], bool)
mouth_area[730 * S:800 * S, 455 * S:575 * S] = True
reddish = mouth_area & ((hsv[..., 0] <= 20) | (hsv[..., 0] >= 235)) & (hsv[..., 1] > 50)
reddish = cv2.dilate(reddish.astype(np.uint8), disk(3)).astype(bool)
face[..., :3] = cv2.inpaint(face[..., :3].clip(0, 255).astype(np.uint8), reddish.astype(np.uint8) * 255, 6, cv2.INPAINT_TELEA)
# GPT の顔は頬の横（耳の手前）で元絵より細く、そこから後ろ髪が見えて頬が髪で隠れたように見えていた。
# 元絵で顔が見えている所は、元絵の画素で顔を補う
# 顔のレイヤーのすぐ近く（6px（元絵）以内）だけを補う。離れた所（髪のすき間から見える右耳など）を足すと、
# 顔から浮いた切れ端になる
near_face_layer = cv2.dilate((face[..., 3] > 200).astype(np.uint8), disk(6 * S)).astype(bool)
face_shown = masks["face_visible"] & (face[..., 3] < 200) & near_face_layer
weight = soft(face_shown, S / 2)
face[..., :3] = np.where((weight > 0)[..., None], face[..., :3] * (1 - weight[..., None]) + master_rgb * weight[..., None], face[..., :3])
face[..., 3] = np.maximum(face[..., 3], weight * 255)
save("face", face)

torso = load("torso")
hair = masks["hair_all"]
rows = np.arange(master.shape[0])[:, None]
# 人物の形。SAM の前景は白い布を背景と見分けられず、輪郭線の内側でも値が低い。輪郭線（前景の濃い所）で
# 囲まれた内側を塗りつぶして作る
line = cv2.morphologyEx((masks["fg_alpha"] > 0.5).astype(np.uint8), cv2.MORPH_CLOSE, disk(2 * S))
outside = line.copy()
outside = np.pad(outside, 1)
cv2.floodFill(outside, None, (0, 0), 2)
figure = outside[1:-1, 1:-1] != 2
arms = masks["arm_L"] | masks["arm_R"]
for side in ("L", "R"):
    arm_mask = masks[f"arm_{side}"]
    visible_arm = cv2.dilate(arm_mask.astype(np.uint8), disk(6 * S)).astype(bool)
    rgba = load(f"arm_{side}")
    rgba[..., 3] *= soft(visible_arm, S)
    # 見えている袖は元絵の画素と不透明度にする（GPT の袖は形と陰影が元絵と少しずれ、肩の線ともつながらない）。
    # 一部だけ元絵にすると境目が水平の線になって見えるので、見えている所は全体を差し替える
    # 袖と胴の境目の縫い目の線は袖に持たせる（胴に残すと、腕が動いたとき袖の縁と二重になる）。
    # 胸のベルト（線より暗い）は袖に入れない（袖の内側に切れ端として残っていた）
    luma = master.astype(np.float32) @ np.array([0.299, 0.587, 0.114], np.float32)
    # 輪郭線は鮮やかな紫（青が緑より大きく上回る）。ベルトは彩度の低い暗い色
    violet = (master[..., 2].astype(np.int16) - master[..., 1].astype(np.int16)) > 50
    belt_color = (luma < 100) & ~violet
    seam = cv2.dilate(arm_mask.astype(np.uint8), disk(3 * S)).astype(bool) & (luma < 190) & violet
    sleeve = (arm_mask | seam) & figure
    # 暗い所のうち、袖口の帯（大きくつながっている）は残し、袖の縁にかかる小さな切れ端（ベルト）だけ除く
    dark = (sleeve & belt_color).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(dark, connectivity=8)
    small = np.zeros(count, bool)
    small[1:] = stats[1:, cv2.CC_STAT_AREA] < 20000
    # 袖の縁（腕のマスクの内側 6px（元絵）以内）にかかるものだけ
    rim = arm_mask & ~cv2.erode(arm_mask.astype(np.uint8), disk(6 * S)).astype(bool) | seam
    on_rim = np.zeros(count, bool)
    on_rim[np.unique(labels[rim & (labels > 0)])] = True
    sleeve &= ~cv2.dilate((small & on_rim)[labels].astype(np.uint8), disk(2 * S)).astype(bool)
    weight = soft(cv2.dilate(sleeve.astype(np.uint8), disk(2 * S)).astype(bool), S / 2)
    rgba[..., :3] = rgba[..., :3] * (1 - weight[..., None]) + master * weight[..., None]
    rgba[..., 3] = np.maximum(rgba[..., 3] * (1 - soft(sleeve, S)), soft(sleeve, S / 2) * 255)
    # 肩の上端では、元絵の袖の外にはみ出す GPT の袖山を消す（胴の肩の線と二重の弧に見える）
    arm_top = np.nonzero(arm_mask.any(axis=1))[0].min()
    cap = (rows < arm_top + 120 * S) & ~sleeve
    rgba[..., 3] *= 1 - soft(cap, S)
    save(f"arm_{side}", rgba)

# 胴: 見えている所は元絵の画素にする。GPT の胴は肩の線が元絵より 30px ほど低く、元絵の肩・袖とつながらない。
# GPT の絵は、袖の下に隠れる所（体を回して袖がずれたときに見える）にだけ使う
# 胴として扱うのは、GPT の胴（肩の線が元絵より低いので少し広げる）の範囲で、顔と首（顔のパーツ）に重ならない所。
# 髪の毛先のすき間や、あごの線を胴に取り込まないように
gpt_torso = cv2.dilate((torso[..., 3] > 128).astype(np.uint8), disk(40 * S)).astype(bool)
face_and_neck = cv2.dilate((load("face")[..., 3] > 0).astype(np.uint8), disk(2 * S)).astype(bool)
# タイの下はタイの輪郭線ごと除く（取り込むとタイが揺れたとき服に枠が残る）
under_tie = cv2.dilate(masks["tie"].astype(np.uint8), disk(6 * S)).astype(bool)
torso_visible = figure & gpt_torso & ~arms & ~hair & ~face_and_neck & ~under_tie & (rows > 3000)
# 袖の輪郭のすぐ外に残る細い欠片は除く（体を回すと袖の外に浮いて見える）
torso_visible = cv2.morphologyEx(torso_visible.astype(np.uint8), cv2.MORPH_OPEN, disk(3 * S)).astype(bool)
# 胴本体につながった、いちばん大きいかたまりだけ残す（髪の毛先に囲まれたすき間を取り込まない）
count, labels, stats, _ = cv2.connectedComponentsWithStats(torso_visible.astype(np.uint8), connectivity=8)
torso_visible = labels == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
# 色は範囲の少し外まで元絵にし（端で GPT の色と混ぜると肩の輪郭線が薄くなる）、透明度だけをなめらかにする
weight = soft(cv2.dilate(torso_visible.astype(np.uint8), disk(2 * S)).astype(bool), S / 2)
torso[..., :3] = torso[..., :3] * (1 - weight[..., None]) + master * weight[..., None]
torso[..., 3] = np.maximum(torso[..., 3] * (1 - soft(torso_visible, S)), soft(torso_visible, S / 2) * 255)
# 袖の下に隠れる胴（脇・脇の下）は、GPT が袖を取り除いて描き足した胴（gpt_parts.py の torso_under_sleeves）で埋める。
# 体を回して袖がずれたとき、肩から脇まで布が続いて見えるように。縫い目の線は袖に持たせたので胴には描かない
sleeve_art = load("torso_under_sleeves")
art_rgb = sleeve_art[..., :3]
art_body = np.abs(art_rgb - np.array([254, 253, 254], np.float32)).max(axis=2) > 6
art_body = cv2.morphologyEx(art_body.astype(np.uint8), cv2.MORPH_CLOSE, disk(4 * S))
art_flood = np.pad(art_body.copy(), 1)
cv2.floodFill(art_flood, None, (0, 0), 2)
art_body = (art_flood[1:-1, 1:-1] != 2) & (rows > 3300)
seams = np.zeros(master.shape[:2], bool)
for side in ("L", "R"):
    luma = master.astype(np.float32) @ np.array([0.299, 0.587, 0.114], np.float32)
    seams |= cv2.dilate(masks[f"arm_{side}"].astype(np.uint8), disk(3 * S)).astype(bool) & (luma < 190) & ((master[..., 2].astype(np.int16) - master[..., 1].astype(np.int16)) > 50)
under_sleeves = art_body & (arms | seams | ~figure | ~torso_visible) & ~(under_tie & figure) & ~face_and_neck & (rows > 3300)
under_sleeves &= cv2.dilate((arms | seams).astype(np.uint8), disk(40 * S)).astype(bool)
weight = soft(under_sleeves, S)[..., None]
torso[..., :3] = torso[..., :3] * (1 - weight) + art_rgb * weight
torso[..., 3] = np.maximum(torso[..., 3], soft(under_sleeves, S / 2) * 255)
# 見えている胴に残る縫い目の線も、GPT の胴の布で置き換える
seam_on_torso = seams & torso_visible
torso[..., :3] = np.where(seam_on_torso[..., None], art_rgb, torso[..., :3])
# タイの下は、周りのシャツの色で埋める（タイが揺れて見えても線や枠が出ないように）
under = (under_tie & figure & ~face_and_neck) & ~torso_visible
torso[..., 3] = np.where(under_tie & figure & ~face_and_neck, 255, torso[..., 3])
# 白い布の明るい所だけを使う（袖の黒い帯やベルトの色まで混ざると、体を回したとき灰色の帯に見える）
luma_torso = torso[..., :3] @ np.array([0.299, 0.587, 0.114], np.float32)
known = ((torso[..., 3] > 200) & torso_visible & (luma_torso > 215)).astype(np.float32)
cloth = np.median(master[torso_visible & (master.min(axis=2) > 215)], axis=0) * np.ones_like(torso[..., :3])
for sigma in (60 * S, 20 * S):
    blur = soft(known, sigma)
    blurred = soft(known[..., None] * torso[..., :3], sigma) / np.maximum(blur, 1e-6)[..., None]
    cloth = np.where((blur > 0.05)[..., None], blurred, cloth)
torso[..., :3] = np.where(under[..., None], cloth, torso[..., :3])
# タイの下は、GPT がタイとブローチを取り除いて襟とシャツを描き足した絵（gpt_parts.py の under_tie）で埋める。
# 元絵の周りを延ばすだけでは、襟とシャツの形にならずぼやけた塊になった
tie_fill = under_tie & figure & ~face_and_neck
gpt_under = load("under_tie")
filled = gpt_under[..., :3]
# タイの縁から 40px（元絵）までは GPT の絵をそのまま使う。元絵と混ぜる幅は細くする（広く混ぜると、
# GPT が描き変えた襟の端と元絵の襟が重なってにじむ）
gpt_zone = cv2.dilate(masks["tie"].astype(np.uint8), disk(40 * S)).astype(bool) & figure & ~face_and_neck
# タイの羽の先は SAM のマスクから少し外れる。タイのまわりで元絵と GPT の絵が大きく違う所（タイが描かれていた所）も含める
differs = np.abs(filled - master.astype(np.float32)).max(axis=2) > 40
differs = cv2.morphologyEx(differs.astype(np.uint8), cv2.MORPH_OPEN, disk(S)).astype(bool)
leftover = cv2.dilate(differs.astype(np.uint8), disk(6 * S)).astype(bool) & cv2.dilate(masks["tie"].astype(np.uint8), disk(60 * S)).astype(bool)
gpt_zone |= leftover & figure & ~face_and_neck
tie_fill |= leftover & figure & ~face_and_neck
blend = soft(gpt_zone, S)[..., None] * (gpt_under[..., 3:] / 255)
torso[..., :3] = torso[..., :3] * (1 - blend) + filled * blend
# 胴は、見えている胴から 25px（元絵）以内に限る。袖の外側に胴の布や輪郭がはみ出さないように
torso[..., 3] *= np.maximum(soft(cv2.dilate(torso_visible.astype(np.uint8), disk(25 * S)).astype(bool) | (under_tie & figure) | under_sleeves, 2 * S), torso_visible)
# タイの下と、見えている胴との継ぎ目は不透明にそろえる（透明度のわずかなへこみが細い枠の線に見える）
solid = cv2.dilate(tie_fill.astype(np.uint8), disk(4 * S)).astype(bool) & cv2.erode(figure.astype(np.uint8), disk(2 * S)).astype(bool) & ~face_and_neck
torso[..., 3] = np.where(solid, 255, torso[..., 3])
# 首の上端: GPT の胴は首の上端（あごの下に隠れる所）にあごの線の跡が残っていて、顔が動くとあご下に波打つ帯が
# 見えていた。GPT に顔を取り除いて首を上へ伸ばさせた絵（gpt_parts.py の neck_under_chin）で、あごの下に隠れる所と
# あご下 20px（元絵）を埋める。元絵で見えているあご下の影はそれより下に残る
face_alpha = load("face")[..., 3] > 128
neck_art = load("neck_under_chin")
neck_skin = (neck_art[..., 3] > 250) & (neck_art[..., 0] - neck_art[..., 2] > 20) & (neck_art[..., :3].min(axis=2) > 140)
under_face = cv2.dilate(face_alpha.astype(np.uint8), disk(20 * S)).astype(bool)
neck_fill = neck_skin & under_face
weight = soft(neck_fill, 4 * S)[..., None] * neck_skin[..., None]
torso[..., :3] = torso[..., :3] * (1 - weight) + neck_art[..., :3] * weight
torso[..., 3] = np.maximum(torso[..., 3], neck_fill * 255.0)
save("torso", torso)

for part in ("hair_front", "hair_side_L", "hair_side_R", "hair_back"):
    rgba = load(part)
    alpha = rgba[..., 3] / 255
    solid = (alpha > 0.5).astype(np.uint8)
    interior = cv2.erode(solid, disk(2 * S)).astype(bool)
    # 縁から 2px より内側は不透明、縁はなめらかに
    alpha = np.where(interior, 1.0, np.clip((alpha - 0.2) / 0.6, 0, 1))
    rgba[..., 3] = alpha * 255
    save(part, rgba)
