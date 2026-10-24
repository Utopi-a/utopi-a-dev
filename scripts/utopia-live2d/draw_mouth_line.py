"""閉じた口を、元の線の位置に左右対称のなめらかな一本線として描き直す。

切り出しや GPT の口は細い線が途切れていて、表示サイズで点線に見える。GPT の口の画素から
中心・幅・反り具合を読み取り、中央が太く口角が細い線を描く。
"""
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
WORK = REPO / "tmp/utopia-puppet-work"
JOB = WORK / "gpt-parts/mouth_closed"
COLOR = (150, 72, 72)
SUPERSAMPLE = 8

x0, y0, x1, y1 = json.loads((JOB / "box.json").read_text())
source = np.array(Image.open(JOB / "out.png").convert("RGBA").resize((x1 - x0, y1 - y0), Image.LANCZOS))
ys, xs = np.nonzero(source[..., 3] > 80)
center_x = (xs.min() + xs.max()) / 2
half_width = (xs.max() - xs.min()) / 2
# 左右対称の弧 y = c + k (x - 中心)^2 で近似する
design = np.stack([np.ones_like(xs, dtype=float), (xs - center_x) ** 2], axis=1)
(c, k), *_ = np.linalg.lstsq(design, ys.astype(float), rcond=None)

height, width = (y1 - y0) * SUPERSAMPLE, (x1 - x0) * SUPERSAMPLE
stroke = np.zeros((height, width), np.uint8)
samples = np.linspace(center_x - half_width, center_x + half_width, 200)
for index in range(len(samples) - 1):
    t = index / (len(samples) - 2)
    thickness = 2.5 + 5.0 * np.sin(np.pi * t)  # 4 倍キャンバスの px。中央が太く口角は細い
    points = [(int(x * SUPERSAMPLE), int((c + k * (x - center_x) ** 2) * SUPERSAMPLE)) for x in samples[index:index + 2]]
    cv2.line(stroke, points[0], points[1], 255, int(thickness * SUPERSAMPLE), cv2.LINE_AA)
alpha = cv2.resize(stroke, (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA)

layer = np.zeros((6144, 4096, 4), np.uint8)
layer[y0:y1, x0:x1, :3] = COLOR
layer[y0:y1, x0:x1, 3] = alpha
Image.fromarray(layer, "RGBA").save(WORK / "layers4x/mouth_closed.png", compress_level=3)
print(f"mouth line: center {center_x + x0:.0f}, half width {half_width:.0f}, curve {k:.5f}")
