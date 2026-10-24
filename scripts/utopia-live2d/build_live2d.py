"""パーツの PSD から PSD2Live（MCP）で Live2D モデルを組み、Web 用に書き出す。

PSD2Live をヘッドレスの MCP サーバーとして起動しておき（README 参照）、
    python build_live2d.py <PSD の絶対パス> <書き出し先の絶対パス>
で実行する。自動リギングに加えて、揺れもの・頬染め・設定資料の表情 6 種をここで足す。
"""
import json
import sys
import uuid
from pathlib import Path

import cv2
import numpy as np

REPO = Path(__file__).resolve().parents[2]
# PSD2Live に同梱の MCP クライアント（README の手順で clone しておく）
sys.path.insert(0, str(REPO / "tmp/live2d-work/psd2live"))
from mcp_proxy import Client  # noqa: E402

# 揺れを付けるレイヤー名と揺れ方
SWINGS = [
    {"id": "ahoge", "layer": "front hair 4", "preset": "hair", "kind": "lateral", "magnitude": 0.2},
    {"id": "ribbon", "layer": "headwear", "preset": "accessory", "kind": "lateral", "magnitude": 0.3},
    {"id": "earring", "layer": "earwear-l", "preset": "accessory", "kind": "lateral", "magnitude": 0.45},
    {"id": "side_hair_r", "layer": "front hair 2", "preset": "hair", "kind": "lateral", "magnitude": 0.18},
    {"id": "side_hair_l", "layer": "back hair 2", "preset": "hair", "kind": "lateral", "magnitude": 0.18},
]

# 設定資料 00 の表情バリエーション。ID はページの表情ボタン（utopia-expressions.ts）と揃える
EXPRESSIONS = {
    "smile": [("ParamMouthForm", "ADD", 0.8), ("ParamEyeLOpen", "MULTIPLY", 0.85), ("ParamEyeROpen", "MULTIPLY", 0.85),
              ("ParamBrowLY", "ADD", 0.2), ("ParamBrowRY", "ADD", 0.2), ("ParamCheek", "ADD", 0.2)],
    "grin": [("ParamEyeLOpen", "MULTIPLY", 0.0), ("ParamEyeROpen", "MULTIPLY", 0.0), ("ParamMouthForm", "ADD", 1.0),
             ("ParamMouthOpenY", "ADD", 0.55), ("ParamBrowLY", "ADD", 0.35), ("ParamBrowRY", "ADD", 0.35),
             ("ParamCheek", "ADD", 0.35)],
    "surprised": [("ParamEyeLOpen", "OVERWRITE", 1.0), ("ParamEyeROpen", "OVERWRITE", 1.0), ("ParamBrowLY", "ADD", 0.9),
                  ("ParamBrowRY", "ADD", 0.9), ("ParamMouthOpenY", "ADD", 0.6), ("ParamMouthForm", "ADD", -0.5)],
    "shy": [("ParamCheek", "OVERWRITE", 1.0), ("ParamEyeLOpen", "MULTIPLY", 0.8), ("ParamEyeROpen", "MULTIPLY", 0.8),
            ("ParamEyeBallX", "ADD", -0.35), ("ParamEyeBallY", "ADD", -0.45), ("ParamMouthForm", "ADD", 0.35)],
    "pout": [("ParamBrowLY", "ADD", -0.5), ("ParamBrowRY", "ADD", -0.5), ("ParamEyeLOpen", "MULTIPLY", 0.72),
             ("ParamEyeROpen", "MULTIPLY", 0.72), ("ParamMouthForm", "ADD", -1.0), ("ParamCheek", "ADD", 0.45)],
}


def request_id():
    return f"build-{uuid.uuid4().hex}"


def edit(client: Client, operation: str, **request):
    request.setdefault("state", client.state())
    request.setdefault("request_id", request_id())
    return client.call(operation, request)[0]


def meshes_by_layer(client: Client):
    targets = {}
    offset = 0
    while True:
        data, _ = client.call("workspace_inspect", {"scope": "objects", "limit": 64, "offset": offset})
        for item in data.get("items", []):
            if item.get("target", "").startswith("mesh:") and item.get("name") not in targets:
                targets[item["name"]] = item["target"].removeprefix("mesh:")
        if not data.get("next"):
            return targets
        offset += 64


def layer_ids(client: Client):
    data, _ = client.call("workspace_inspect", {"scope": "layers", "limit": 64})
    return {item["name"]: item["id"] for item in data.get("items", [])}


def mesh_outline(client: Client, mesh: str):
    """メッシュの休止位置の頂点と、外周を一周たどった頂点の順番"""
    vertices = np.array([v[1:] for v in client.call("mesh_get_topology", {"target": mesh, "section": "vertices", "limit": 4096})[0]["items"]])
    edges = client.call("mesh_get_topology", {"target": mesh, "section": "outline", "limit": 4096})[0]["items"]
    neighbors = {}
    for a, b in edges:
        neighbors.setdefault(a, []).append(b)
        neighbors.setdefault(b, []).append(a)
    loop = [edges[0][0]]
    while True:
        following = [n for n in neighbors[loop[-1]] if len(loop) < 2 or n != loop[-2]]
        if not following or following[0] == loop[0]:
            break
        loop.append(following[0])
    return vertices, vertices[loop]


def column_bottom(polygon: np.ndarray, xs: np.ndarray, resolution: int = 4000):
    """多角形の各列の下端。目のデフォーマ内の 0〜1 の座標を細かい格子に描いて読む"""
    mask = np.zeros((resolution, resolution), np.uint8)
    cv2.fillPoly(mask, [np.round(polygon * resolution).astype(np.int32)], 1)
    bottoms = []
    for x in xs:
        rows = np.nonzero(mask[:, int(np.clip(round(x * resolution), 0, resolution - 1))])[0]
        bottoms.append(rows.max() / resolution if len(rows) else np.nan)
    return np.array(bottoms)


def write_closed_key(client: Client, mesh: str, parameter: str, rest: np.ndarray, closed: np.ndarray):
    """閉じたキーの各頂点の位置をそのまま書く。変形パスの点を全頂点に重ねると、各頂点は指定した位置へ動く"""
    # 点は三角形に結び付ける決まりなので、その頂点を含む三角形に重み 1 で結ぶ
    triangles = client.call("mesh_get_topology", {"target": mesh, "section": "triangles", "limit": 4096})[0]["items"]
    owner = {}
    for _, a, b, c in triangles:
        for v in (a, b, c):
            owner.setdefault(v, (a, b, c))
    points = []
    for i in range(len(rest)):
        a, b, c = owner[i]
        points.append({"a": a, "b": b, "c": c, "wa": float(i == a), "wb": float(i == b), "wc": float(i == c), "corner": True})
    path_id = f"close_{mesh.split(':')[1]}"
    edit(client, "path_put", target=mesh, id=path_id, points=points, closed=False)
    edit(client, "path_deform", target=mesh, path_id=path_id, key={parameter: 0}, moved_points=closed.tolist())


def close_eyes_on_lower_lash(client: Client):
    """閉じた目（開閉 0）で、上まつ毛の根元の線を下まつ毛の根元の線に重ねる。

    自動リグの閉じ目は白目の範囲から作る左右対称の放物線で、目尻の上がった左目に合わず、下まつ毛との間に
    隙間が残る。閉じ目では上まつ毛を下まつ毛の位置まで下ろすのが Live2D の基本なので、列ごとに
    上まつ毛の根元（まつ毛のメッシュの下端）を下まつ毛の根元（白目のメッシュの下端。fit_parts.py で
    下まつ毛の線までに揃えてある）へ下ろし、毛先側は自動リグと同じく 0.88 倍の厚みで根元の上に載せる。
    下まぶたも閉じるときわずかに上がるので、下まつ毛は根元どうしの距離の 1 割だけ上げ、そこで重ねる。
    白目の外へ伸びる目頭・目尻のまつ毛の跳ねも、閉じた線を延ばした位置へ下ろして一本の線につなげる。
    白目は根元の少し上で薄くつぶしてまつ毛の裏に隠す（瞳は白目でクリッピングされるので一緒に隠れる）。
    まつ毛と白目は同じ目のデフォーマの中にあり、座標（0〜1）がそろっているので、メッシュだけで計算できる。
    """
    meshes = meshes_by_layer(client)
    for side, parameter in (("R", "ParamEyeROpen"), ("L", "ParamEyeLOpen")):
        lash_mesh, white_mesh, lower_mesh = (f"mesh:{meshes[f'{name}-{side.lower()}']}" for name in ("eyelash", "eyewhite", "eyelash 2"))
        lash, lash_outline = mesh_outline(client, lash_mesh)
        white, white_outline = mesh_outline(client, white_mesh)
        lower, _ = mesh_outline(client, lower_mesh)
        # まつ毛の端（目頭・目尻の外へ伸びる跳ね）まで含めた全幅で、列ごとに根元の線を読む
        grid = np.linspace(lash_outline[:, 0].min(), lash_outline[:, 0].max(), 300)
        upper_root = column_bottom(lash_outline, grid)
        lower_root = column_bottom(white_outline, grid)
        has_lash = ~np.isnan(upper_root)
        grid, upper_root, lower_root = grid[has_lash], upper_root[has_lash], lower_root[has_lash]
        on_white = ~np.isnan(lower_root)
        white_x = grid[on_white]
        # 根元どうしの距離。下まつ毛と白目はこれの 1 割だけ上げる（下まぶたもわずかに上がる）
        gap = np.clip(np.nan_to_num(lower_root - upper_root), 0, None)
        rise = 0.1
        # 上まつ毛は下まつ毛の根元より少し下まで下ろし、下まつ毛の根元を不透明な帯の裏に潜らせる（隙間を残さない）
        overlap = 0.008
        # 閉じた根元の線。白目の幅では下まつ毛の根元をなめらかな曲線に当てはめ、目尻・目頭で折れないようにする
        inner = on_white & (grid > white_x.min() + 0.03 * np.ptp(white_x)) & (grid < white_x.max() - 0.03 * np.ptp(white_x))
        curve = np.poly1d(np.polyfit(grid[inner], (lower_root - gap * rise)[inner], 3))
        closed_root = curve(grid) + overlap
        # 白目の外（まつ毛の跳ね）は線を延ばしてつなぐ。3 次式の端は傾きが急になりやすいので傾きは半分にし、
        # 跳ねは開いたときの形の 15% だけ残して少し上げる
        tail_keep = 0.15
        for edge_x, outside in ((white_x.min(), grid < white_x.min()), (white_x.max(), grid > white_x.max())):
            slope = curve.deriv()(edge_x) * 0.5
            edge_root = np.interp(edge_x, grid, upper_root)
            closed_root[outside] = (curve(edge_x) + overlap + slope * (grid[outside] - edge_x)
                                    + (upper_root[outside] - edge_root) * tail_keep)
        shift = cv2.GaussianBlur((closed_root - upper_root).astype(np.float32).reshape(1, -1), (0, 0), 4).ravel()

        closed_lower = lower.copy()
        closed_lower[:, 1] -= np.interp(lower[:, 0], grid, gap) * rise

        # 根元を閉じた線へ下ろし、毛先側は自動リグと同じく 0.88 倍の厚みで根元の上に載せる
        squash = 0.88
        lash_root = np.interp(lash[:, 0], grid, upper_root)
        closed_lash = lash.copy()
        closed_lash[:, 1] = lash_root + np.interp(lash[:, 0], grid, shift) + (lash[:, 1] - lash_root) * squash
        # 白目は根元の境界ではなく、閉じたまつ毛の帯の内側（根元より少し上）へ細くつぶす
        line = np.interp(white[:, 0], grid, closed_root)
        closed_white = white.copy()
        closed_white[:, 1] = line - overlap - 0.025 + (white[:, 1] - line) * 0.03
        write_closed_key(client, lash_mesh, parameter, lash, closed_lash)
        write_closed_key(client, white_mesh, parameter, white, closed_white)
        write_closed_key(client, lower_mesh, parameter, lower, closed_lower)
        print("closed eye", side, "max gap", round(float(gap.max()), 4))


def main(psd: str, output: str):
    with Client(timeout=900) as client:
        edit(client, "project_import_psd", path=psd, discard_unsaved=True)
        edit(client, "settings_update", changes={"atlasSize": 2048})

        # 照れの頬染めは ParamCheek で出し入れする
        edit(client, "parameter_create", parameter_id="ParamCheek", name="照れ", min=0, max=1, default=0)
        layers = layer_ids(client)
        edit(client, "layer_set_variant", layer_id=layers["腮红"], variant="toggle", parameter="ParamCheek")
        # レイヤーの分類や差分の変更は、リグを生成し直したときに反映される
        edit(client, "rig_generate")

        # 読み込み中に出す静止画。口の差し替え設定の前に描く（設定後は描画機能が口のレイヤーを見つけられない）。既定のポーズを書き出す（物理演算の揺れは含まない）
        _, images = client.call("view_render_model", {
            "viewport": {"mode": "canvas_rect", "left": 0, "top": 0, "width": 2048, "height": 3072},
            "background": "transparent", "target_long_edge": 1350,
        })
        (Path(output) / "poster.png").write_bytes(images[0])

        # 開いた口は差し替えで出す。自動生成の唇の輪郭は閉じたとき閉じ口の線と二重に見えるため
        edit(client, "layer_set_variant", layer_id=layers["mouth open"], variant="toggle", parameter="ParamMouthOpenY")
        edit(client, "rig_generate")

        for preset in ["front_hair", "back_hair", "clothing"]:
            edit(client, "model_apply_preset", preset=preset)
            print("preset", preset)

        meshes = meshes_by_layer(client)
        for swing in SWINGS:
            edit(client, "swing_put", id=swing["id"], name=swing["id"], targets=[meshes[swing["layer"]]],
                 kind=swing["kind"], preset=swing["preset"], magnitude=swing["magnitude"])
            print("swing", swing["id"])

        # 自動生成の標準表情（笑顔・悲しみなど）は消し、設定資料の 6 種に置き換える
        existing, _ = client.call("expression_list", {})
        for item in existing.get("expressions", []):
            if item["id"] not in EXPRESSIONS:
                edit(client, "expression_delete", id=item["id"])
        for expression_id, entries in EXPRESSIONS.items():
            edit(client, "expression_put", expression={
                "id": expression_id, "name": expression_id, "fade_in": 0.4, "fade_out": 0.4,
                "entries": [{"parameter": p, "blend": b, "value": v} for p, b, v in entries],
            })
            print("expression", expression_id)

        close_eyes_on_lower_lash(client)

        result = edit(client, "project_export_model", output_directory=output)
        print(json.dumps(result, ensure_ascii=False)[:600])
        edit(client, "project_save_as", path=str(Path(output) / "utopia.psd2live"))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
