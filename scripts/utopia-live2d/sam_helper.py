"""SAM 2.1 で、元絵（1x 座標で指定）の点・枠から 4x のマスクを得る補助。"""
from pathlib import Path

import numpy as np
from PIL import Image
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor

SCALE = 4
_predictor = None

def predictor(image_path):
    global _predictor
    if _predictor is None:
        model = build_sam2("configs/sam2.1/sam2.1_hiera_b+.yaml",
                           str(Path(__file__).resolve().parents[2] / "tmp/utopia-puppet-work/tools/models/sam2.1_hiera_base_plus.pt"),
                           device="mps")
        _predictor = SAM2ImagePredictor(model)
        _predictor.set_image(np.array(Image.open(image_path).convert("RGB")))
    return _predictor

def segment(image_path, pos=(), neg=(), box=None, pick=None):
    p = predictor(image_path)
    pts = [(x * SCALE, y * SCALE) for x, y in pos] + [(x * SCALE, y * SCALE) for x, y in neg]
    labels = [1] * len(pos) + [0] * len(neg)
    kwargs = {}
    if pts:
        kwargs["point_coords"] = np.array(pts, dtype=np.float32)
        kwargs["point_labels"] = np.array(labels)
    if box is not None:
        kwargs["box"] = np.array([v * SCALE for v in box], dtype=np.float32)
    masks, scores, _ = p.predict(multimask_output=True, **kwargs)
    index = int(np.argmax(scores)) if pick is None else pick
    return masks[index] > 0, scores
