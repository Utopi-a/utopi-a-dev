import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deletePhotoAction } from "@/features/gallery/delete-photo/delete-photo-action";
import type { GalleryPhoto } from "@/features/gallery/photo";
import { updatePhotoAction } from "@/features/gallery/update-photo/update-photo-action";
import { GalleryManageView } from "./gallery-manage-view";
import { preparePhotoFile } from "./prepare-photo-file/prepare-photo-file";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/features/gallery/update-photo/update-photo-action", () => ({
  updatePhotoAction: vi.fn(),
}));
vi.mock("@/features/gallery/delete-photo/delete-photo-action", () => ({
  deletePhotoAction: vi.fn(),
}));
vi.mock("./prepare-photo-file/prepare-photo-file", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./prepare-photo-file/prepare-photo-file")>()),
  preparePhotoFile: vi.fn(),
}));

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
  vi.mocked(preparePhotoFile).mockImplementation(async () => ({
    ok: true,
    blob: new Blob(["jpeg"], { type: "image/jpeg" }),
    takenAt: "2026-11-10T03:00:00.000Z",
    exif: { cameraMake: "FUJIFILM", cameraModel: "X-T5", iso: 160 },
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function jsonResponse({ status, body }: { status: number; body: unknown }) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function photoFile({ name }: { name: string }) {
  return new File(["raw"], name, { type: "image/jpeg" });
}

const photo: GalleryPhoto = {
  id: "photo-1",
  caption: "朝の海",
  takenAt: null,
  exif: null,
  width: 1600,
  height: 1200,
  variants: [{ url: "https://cdn.example/photo-1-640.webp", width: 640, height: 480 }],
};

describe("GalleryManageView の投稿", () => {
  it("写真を選ぶと下ごしらえを通して /api/gallery/photos に送り、一覧を更新する", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({ status: 201, body: { photo } }));
    render(<GalleryManageView photos={[]} />);
    const file = photoFile({ name: "IMG_0001.HEIC" });

    await user.upload(screen.getByLabelText("写真を選ぶ"), file);

    await waitFor(() => expect(screen.getByText("完了")).toBeInTheDocument());
    expect(preparePhotoFile).toHaveBeenCalledWith({ file });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/gallery/photos");
    expect(init?.method).toBe("POST");
    const body = init?.body as FormData;
    const sentFile = body.get("file") as File;
    expect(sentFile.name).toBe("IMG_0001.jpg");
    expect(sentFile.type).toBe("image/jpeg");
    expect(body.get("takenAt")).toBe("2026-11-10T03:00:00.000Z");
    expect(JSON.parse(body.get("exif") as string)).toEqual({
      cameraMake: "FUJIFILM",
      cameraModel: "X-T5",
      iso: 160,
    });
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByText("1 枚中 1 枚完了")).toBeInTheDocument();
  });

  it("撮影情報が読めなかった写真は exif を送らない", async () => {
    const user = userEvent.setup();
    vi.mocked(preparePhotoFile).mockResolvedValue({
      ok: true,
      blob: new Blob(["jpeg"], { type: "image/jpeg" }),
      takenAt: null,
      exif: null,
    });
    fetchMock.mockResolvedValue(jsonResponse({ status: 201, body: { photo } }));
    render(<GalleryManageView photos={[]} />);

    await user.upload(screen.getByLabelText("写真を選ぶ"), photoFile({ name: "a.jpg" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = fetchMock.mock.calls[0][1]?.body as FormData;
    expect(body.has("exif")).toBe(false);
    expect(body.has("takenAt")).toBe(false);
  });

  it("同時に送るのは 2 枚までにする", async () => {
    const user = userEvent.setup();
    const pending: Array<(response: Response) => void> = [];
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          pending.push(resolve);
        }),
    );
    render(<GalleryManageView photos={[]} />);

    await user.upload(screen.getByLabelText("写真を選ぶ"), [
      photoFile({ name: "a.jpg" }),
      photoFile({ name: "b.jpg" }),
      photoFile({ name: "c.jpg" }),
    ]);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByText("待機中")).toBeInTheDocument();

    pending[0](jsonResponse({ status: 201, body: { photo } }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });

  it("失敗したら理由と再試行を出し、再試行で送り直す。ほかの写真は止めない", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ status: 400, body: { error: "画像を読み込めませんでした" } }),
      )
      .mockResolvedValue(jsonResponse({ status: 201, body: { photo } }));
    render(<GalleryManageView photos={[]} />);

    await user.upload(screen.getByLabelText("写真を選ぶ"), [
      photoFile({ name: "a.jpg" }),
      photoFile({ name: "b.jpg" }),
    ]);

    expect(await screen.findByText("失敗: 画像を読み込めませんでした")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("2 枚中 1 枚完了、1 枚失敗")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "再試行" }));

    await waitFor(() => expect(screen.getByText("2 枚中 2 枚完了")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("401 のときはログインし直すためのリンクを出す", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse({ status: 401, body: { error: "ログインしてください" } }),
    );
    render(<GalleryManageView photos={[]} />);

    await user.upload(screen.getByLabelText("写真を選ぶ"), photoFile({ name: "a.jpg" }));

    expect(await screen.findByRole("link", { name: "ログインし直してください" })).toHaveAttribute(
      "href",
      "/login?next=/lab/gallery/manage",
    );
  });

  it("下ごしらえで読めなかった写真は送らずに理由を出す", async () => {
    const user = userEvent.setup();
    vi.mocked(preparePhotoFile).mockResolvedValue({
      ok: false,
      error: "この形式の画像は読み込めません",
    });
    render(<GalleryManageView photos={[]} />);

    await user.upload(screen.getByLabelText("写真を選ぶ"), photoFile({ name: "a.jpg" }));

    expect(await screen.findByText("失敗: この形式の画像は読み込めません")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("GalleryManageView の投稿済みの一覧", () => {
  it("撮影情報があれば、カメラ名と露出の値を 1 行で出す", () => {
    render(
      <GalleryManageView
        photos={[
          {
            ...photo,
            exif: {
              cameraMake: "FUJIFILM",
              cameraModel: "X-T5",
              lensModel: "XF23mmF1.4 R LM WR",
              focalLength: 23,
              focalLength35mm: 35,
              aperture: 1.4,
              exposureTime: 1 / 250,
              iso: 160,
            },
          },
        ]}
      />,
    );

    // 既定の照合は空白類（区切りの EN SPACE も）を半角空白 1 つに詰めてから比べる
    expect(
      screen.getByText("FUJIFILM X-T5 23mm（35mm 判換算 35mm） f/1.4 1/250s ISO 160"),
    ).toBeInTheDocument();
  });

  it("撮影情報が無ければ何も足さない", () => {
    render(<GalleryManageView photos={[photo]} />);

    expect(screen.queryByText(/ISO/)).not.toBeInTheDocument();
  });

  it("キャプションを変えて保存すると updatePhotoAction に渡す", async () => {
    const user = userEvent.setup();
    vi.mocked(updatePhotoAction).mockResolvedValue({ ok: true });
    render(<GalleryManageView photos={[photo]} />);
    const save = screen.getByRole("button", { name: "保存" });
    expect(save).toBeDisabled();

    const caption = screen.getByRole("textbox", { name: "キャプション" });
    await user.clear(caption);
    await user.type(caption, "  夕方の海 ");
    await user.click(save);

    expect(updatePhotoAction).toHaveBeenCalledWith({
      id: "photo-1",
      caption: "夕方の海",
      takenAt: null,
    });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("撮影日を入れて保存すると、その日の 12:00 の現地時刻で送る", async () => {
    const user = userEvent.setup();
    vi.mocked(updatePhotoAction).mockResolvedValue({ ok: true });
    render(<GalleryManageView photos={[photo]} />);

    await user.type(screen.getByLabelText("撮影日"), "2026-11-10");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(updatePhotoAction).toHaveBeenCalledWith({
      id: "photo-1",
      caption: "朝の海",
      takenAt: new Date(2026, 10, 10, 12).toISOString(),
    });
  });

  it("保存に失敗したら理由を出す", async () => {
    const user = userEvent.setup();
    vi.mocked(updatePhotoAction).mockResolvedValue({ ok: false, error: "保存できませんでした" });
    render(<GalleryManageView photos={[photo]} />);

    await user.type(screen.getByRole("textbox", { name: "キャプション" }), "！");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("保存できませんでした");
  });

  it("削除は確認のあとで deletePhotoAction を呼ぶ", async () => {
    const user = userEvent.setup();
    vi.mocked(deletePhotoAction).mockResolvedValue({ ok: true });
    render(<GalleryManageView photos={[photo]} />);

    await user.click(screen.getByRole("button", { name: "削除" }));
    const dialog = await screen.findByRole("dialog", { name: "この写真を削除しますか？" });
    expect(deletePhotoAction).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "削除する" }));

    expect(deletePhotoAction).toHaveBeenCalledWith({ id: "photo-1" });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("確認でやめれば削除しない", async () => {
    const user = userEvent.setup();
    render(<GalleryManageView photos={[photo]} />);

    await user.click(screen.getByRole("button", { name: "削除" }));
    await user.click(await screen.findByRole("button", { name: "やめる" }));

    expect(deletePhotoAction).not.toHaveBeenCalled();
  });
});
