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
    "smile": [("ParamMouthForm", "ADD", 0.8), ("ParamEyeLSmile", "ADD", 0.8), ("ParamEyeRSmile", "ADD", 0.8),
              ("ParamBrowLY", "ADD", 0.2), ("ParamBrowRY", "ADD", 0.2), ("ParamCheek", "ADD", 0.2)],
    "grin": [("ParamEyeLOpen", "MULTIPLY", 0.0), ("ParamEyeROpen", "MULTIPLY", 0.0), ("ParamEyeLSmile", "ADD", 1.0),
             ("ParamEyeRSmile", "ADD", 1.0), ("ParamMouthForm", "ADD", 1.0), ("ParamMouthOpenY", "ADD", 0.55),
             ("ParamBrowLY", "ADD", 0.35), ("ParamBrowRY", "ADD", 0.35), ("ParamCheek", "ADD", 0.35)],
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


def write_key(client: Client, mesh: str, key: dict, rest: np.ndarray, shape: np.ndarray):
    """メッシュのキーの各頂点の位置をそのまま書く。変形パスの点を全頂点に重ねると、各頂点は指定した位置へ動く"""
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
    path_id = f"vertices_{mesh.split(':')[1]}"
    edit(client, "path_put", target=mesh, id=path_id, points=points, closed=False)
    edit(client, "path_deform", target=mesh, path_id=path_id, key=key, moved_points=shape.tolist())


def eye_shapes(client: Client, meshes: dict, side: str):
    """片目の閉じ目と笑い目の形を、まつ毛と白目のメッシュから作る。

    まつ毛・白目・下まつ毛は同じ目のデフォーマの中にあり、座標（0〜1）がそろっているので、メッシュだけで計算できる。
    上まつ毛の根元はまつ毛メッシュの下端、下まつ毛の根元は白目メッシュの下端（fit_parts.py で下まつ毛の線までに揃えてある）。
    """
    lash_mesh, white_mesh, lower_mesh = (f"mesh:{meshes[f'{name}-{side.lower()}']}" for name in ("eyelash", "eyewhite", "eyelash 2"))
    lash, lash_outline = mesh_outline(client, lash_mesh)
    white, white_outline = mesh_outline(client, white_mesh)
    lower, _ = mesh_outline(client, lower_mesh)
    grid = np.linspace(lash_outline[:, 0].min(), lash_outline[:, 0].max(), 300)
    upper_root = column_bottom(lash_outline, grid)
    lower_root = column_bottom(white_outline, grid)
    has_lash = ~np.isnan(upper_root)
    grid, upper_root, lower_root = grid[has_lash], upper_root[has_lash], lower_root[has_lash]
    on_white = ~np.isnan(lower_root)
    white_x = grid[on_white]
    # 白目の幅の外は端の高さで埋める（補間で値なしが混ざらないように）
    lower_fill = np.interp(grid, white_x, lower_root[on_white])
    # 根元どうしの距離。下まぶたは閉じるときこれの 1 割だけ上がる
    gap = np.clip(np.nan_to_num(lower_root - upper_root), 0, None)
    rise = 0.1
    # 上まつ毛は下まつ毛の根元より少し下まで下ろし、下まつ毛の根元を不透明な帯の裏に潜らせる（隙間を残さない）
    overlap = 0.008
    # 閉じた根元の線。白目の幅では下まつ毛の根元をなめらかな曲線に当てはめ、目尻・目頭で折れないようにする
    inner = on_white & (grid > white_x.min() + 0.03 * np.ptp(white_x)) & (grid < white_x.max() - 0.03 * np.ptp(white_x))
    curve = np.poly1d(np.polyfit(grid[inner], (lower_root - gap * rise)[inner], 3))
    closed_root = curve(np.clip(grid, white_x.min(), white_x.max())) + overlap
    # 笑い目の閉じた線: 目頭と目尻の閉じた位置を結ぶ線から、中央が持ち上がる「^」の弧
    nx = np.clip((grid - white_x.min()) / np.ptp(white_x) * 2 - 1, -1, 1)
    ends = np.interp(grid, [white_x.min(), white_x.max()], [curve(white_x.min()), curve(white_x.max())])
    smile_root = ends - 0.3 * gap.max() * (1 - nx * nx) + overlap
    # 上まつ毛の目尻側の端は、動かない目尻のパーツ（fit_parts.py で下まつ毛側に移したもの）とつながっているので
    # 端では動かさず、中央へ向かってなめらかに動きを大きくする。目頭側は分けていないので下まつ毛まで下ろす
    span = np.ptp(grid)
    # 画面上で右目は左端、左目は右端が目尻
    from_outer = grid - grid.min() if side == "R" else grid.max() - grid
    taper = np.clip(from_outer / (0.18 * span), 0, 1)
    taper = taper * taper * (3 - 2 * taper)
    squash = 0.88

    def lash_to(root):
        shift = cv2.GaussianBlur((root - upper_root).astype(np.float32).reshape(1, -1), (0, 0), 4).ravel() * taper
        lash_root = np.interp(lash[:, 0], grid, upper_root)
        weight = np.interp(lash[:, 0], grid, taper)
        moved = lash.copy()
        # 根元を新しい線へ下ろし、毛先側は自動リグと同じく 0.88 倍の厚みで根元の上に載せる
        moved[:, 1] = lash_root + np.interp(lash[:, 0], grid, shift) + (lash[:, 1] - lash_root) * (1 - (1 - squash) * weight)
        return moved

    def hide_under(points, root):
        # 根元の境界ではなく、閉じたまつ毛の帯の内側（根元より少し上）へ細くつぶして隠す
        line = np.interp(points[:, 0], grid, root)
        own = np.interp(points[:, 0], grid, lower_fill)
        hidden = points.copy()
        hidden[:, 1] = line - overlap - 0.025 + (points[:, 1] - own) * 0.03
        return hidden

    lift = np.interp(lower[:, 0], grid, gap)
    closed_lower = lower.copy()
    closed_lower[:, 1] -= lift * rise
    # 開いたままの笑い目: 下まぶた（下まつ毛と白目の下側）を、根元どうしの距離の 25% だけ押し上げる
    happy_lower = lower.copy()
    happy_lower[:, 1] -= lift * 0.25
    white_top = np.interp(white[:, 0], grid, upper_root)
    white_bottom = np.interp(white[:, 0], grid, lower_fill)
    share = np.clip((white[:, 1] - white_top) / np.maximum(white_bottom - white_top, 1e-6), 0, 1)
    happy_white = white.copy()
    happy_white[:, 1] -= np.interp(white[:, 0], grid, gap) * 0.25 * share
    return {
        "meshes": {"lash": lash_mesh, "white": white_mesh, "lower": lower_mesh},
        "rest": {"lash": lash, "white": white, "lower": lower},
        "closed": {"lash": lash_to(closed_root), "white": hide_under(white, closed_root), "lower": closed_lower},
        "smile_closed": {"lash": lash_to(smile_root), "white": hide_under(white, smile_root), "lower": hide_under(lower, smile_root)},
        "smile_open": {"lash": lash, "white": happy_white, "lower": happy_lower},
        "max_gap": float(gap.max()),
    }


def rig_eyes(client: Client):
    """閉じ目と笑い目を作る。

    閉じ目（開閉 0）: 上まつ毛の根元の線を下まつ毛の根元の線に重ねる。自動リグの閉じ目は白目の範囲から作る
    左右対称の放物線で、目尻の上がった左目に合わず隙間が残るため書き直す。Live2D の基本どおり上まつ毛を
    下まつ毛の位置まで下ろし、下まぶたもわずかに上げる。目尻で上下のまつ毛がつながる部分は下まつ毛側の
    パーツにしてあるので、上まつ毛の目尻側の端は動かさない。白目は帯の裏に隠す（瞳は白目でクリッピングされる）。
    笑い目（ParamEyeLSmile / ParamEyeRSmile）: 閉じたときは上まつ毛が「^」の弧になり、開いたままのときは
    下まぶたが押し上がる。にっこり・微笑みの表情で使う。
    """
    meshes = meshes_by_layer(client)
    for side, side_name in (("R", "右"), ("L", "左")):
        open_parameter, smile_parameter = f"ParamEye{side}Open", f"ParamEye{side}Smile"
        shapes = eye_shapes(client, meshes, side)
        targets = shapes["meshes"]
        for part, mesh in targets.items():
            write_key(client, mesh, {open_parameter: 0}, shapes["rest"][part], shapes["closed"][part])
        # 笑い目の軸を足す。いったん形を変えずにキーを作り、そのあと頂点の位置を書く
        edit(client, "author_axis", summary=f"{side_name}目の笑い目", parameter={"id": smile_parameter, "name": f"{side_name}目 笑顔", "min": 0, "max": 1, "default": 0},
             shapes=[{"target": mesh, "value": 1, "key": {open_parameter: openness}, "operations": [{"type": "translate", "delta": [0, 0]}]}
                     for mesh in targets.values() for openness in (0, 1)])
        for part, mesh in targets.items():
            write_key(client, mesh, {open_parameter: 0, smile_parameter: 1}, shapes["rest"][part], shapes["smile_closed"][part])
            write_key(client, mesh, {open_parameter: 1, smile_parameter: 1}, shapes["rest"][part], shapes["smile_open"][part])
        print("eye", side, "max gap", round(shapes["max_gap"], 4))


def rig_closed_mouth(client: Client):
    """閉じた口に口の形（ParamMouthForm）の変形を付ける。PSD2Live は閉じた口のレイヤーを変形させないため、
    微笑み（+1 で口角が上がる）とむすっ（-1 で口角が下がる）が出なかった"""
    meshes = meshes_by_layer(client)
    mesh = f"mesh:{meshes['mouth close']}"
    rest, outline = mesh_outline(client, mesh)
    layers, _ = client.call("workspace_inspect", {"scope": "layers", "limit": 64})
    bounds = next(item["bounds"] for item in layers["items"] if item["name"] == "mouth close")
    # メッシュの座標は口のデフォーマ内の値なので、PSD の座標での縦横比に直して形を決める
    to_y = (np.ptp(outline[:, 1]) / max(bounds[3] - bounds[1], 1)) * ((bounds[2] - bounds[0]) / max(np.ptp(outline[:, 0]), 1e-6))
    center = (outline[:, 0].min() + outline[:, 0].max()) / 2
    nx = np.clip((rest[:, 0] - center) / (np.ptp(outline[:, 0]) / 2), -1, 1)
    width = np.ptp(outline[:, 0])
    smile, frown = rest.copy(), rest.copy()
    # 口角を口の幅の 9% 上げ、中央をわずかに下げる（むすっは逆に口角を 7% 下げ、中央をわずかに上げる）
    smile[:, 1] += (-0.09 * nx * nx + 0.015) * width * to_y
    frown[:, 1] += (0.07 * nx * nx - 0.015) * width * to_y
    edit(client, "author_axis", summary="閉じた口の口角", parameter={"id": "ParamMouthForm"},
         shapes=[{"target": mesh, "value": v, "operations": [{"type": "translate", "delta": [0, 0]}]} for v in (1, -1)])
    write_key(client, mesh, {"ParamMouthForm": 1}, rest, smile)
    write_key(client, mesh, {"ParamMouthForm": -1}, rest, frown)
    print("closed mouth form")


def main(psd: str, output: str):
    with Client(timeout=900) as client:
        edit(client, "project_import_psd", path=psd, discard_unsaved=True)
        # 眉は前髪越しに見えるので、表情で上下したのが分かるよう動く量を大きくする（既定 12）
        edit(client, "settings_update", changes={"atlasSize": 2048, "rigTuning": {"browLift": 30}})

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

        rig_eyes(client)
        rig_closed_mouth(client)

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

        result = edit(client, "project_export_model", output_directory=output)
        print(json.dumps(result, ensure_ascii=False)[:600])
        edit(client, "project_save_as", path=str(Path(output) / "utopia.psd2live"))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
