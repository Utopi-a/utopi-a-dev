import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { GalleryPhoto } from "@/features/gallery/photo";
import { PhotoGrid } from "./photo-grid";

// Next の App Router と同じく、pushState / replaceState / 戻るで useSearchParams が変わるようにする。
vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  const subscribe = (onChange: () => void) => {
    window.addEventListener("popstate", onChange);
    window.addEventListener("test:locationchange", onChange);
    return () => {
      window.removeEventListener("popstate", onChange);
      window.removeEventListener("test:locationchange", onChange);
    };
  };
  return {
    useSearchParams: () =>
      new URLSearchParams(useSyncExternalStore(subscribe, () => window.location.search)),
  };
});

const originalPushState = window.history.pushState;
const originalReplaceState = window.history.replaceState;
const dialogPrototype = HTMLDialogElement.prototype;
const originalShowModal = dialogPrototype.showModal;
const originalClose = dialogPrototype.close;

beforeAll(() => {
  window.history.pushState = function pushState(...args) {
    originalPushState.apply(this, args);
    window.dispatchEvent(new Event("test:locationchange"));
  };
  window.history.replaceState = function replaceState(...args) {
    originalReplaceState.apply(this, args);
    window.dispatchEvent(new Event("test:locationchange"));
  };
  // jsdom には showModal / close が無いので、開閉と close イベントだけを補う。
  if (!originalShowModal) {
    dialogPrototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
  }
  if (!originalClose) {
    dialogPrototype.close = function close(this: HTMLDialogElement) {
      if (!this.hasAttribute("open")) {
        return;
      }
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
});

afterAll(() => {
  window.history.pushState = originalPushState;
  window.history.replaceState = originalReplaceState;
  dialogPrototype.showModal = originalShowModal;
  dialogPrototype.close = originalClose;
});

beforeEach(() => {
  originalReplaceState.call(window.history, null, "", "/gallery");
});

function buildPhoto({
  id,
  caption,
  takenAt = null,
  exif = null,
}: {
  id: string;
  caption: string;
  takenAt?: string | null;
  exif?: GalleryPhoto["exif"];
}): GalleryPhoto {
  return {
    id,
    caption,
    takenAt,
    exif,
    width: 1600,
    height: 1200,
    variants: [{ url: `https://cdn.example/${id}.webp`, width: 1600, height: 1200 }],
  };
}

const photos = [
  buildPhoto({ id: "a", caption: "朝の海" }),
  buildPhoto({ id: "b", caption: "昼の山" }),
  buildPhoto({ id: "c", caption: "夜の街" }),
];

function viewer() {
  return screen.getByRole("dialog", { hidden: true });
}

function viewerIsOpen() {
  return viewer().hasAttribute("open");
}

describe("PhotoLightbox", () => {
  it("写真を押すとその写真を開き、URL に ?photo= が付く", async () => {
    const user = userEvent.setup();
    render(<PhotoGrid photos={photos} />);
    expect(viewerIsOpen()).toBe(false);

    await user.click(screen.getByRole("link", { name: "昼の山" }));

    expect(window.location.search).toBe("?photo=b");
    expect(viewerIsOpen()).toBe(true);
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByText("昼の山", { selector: "p" })).toBeInTheDocument();
  });

  it("次へ・前へのボタンと ← → で写真を移り、端ではボタンを出さない", async () => {
    const user = userEvent.setup();
    render(<PhotoGrid photos={photos} />);
    await user.click(screen.getByRole("link", { name: "朝の海" }));

    expect(screen.queryByRole("button", { name: "前の写真" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "次の写真" }));
    expect(window.location.search).toBe("?photo=b");
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    fireEvent.keyDown(viewer(), { key: "ArrowRight" });
    expect(window.location.search).toBe("?photo=c");
    expect(screen.queryByRole("button", { name: "次の写真" })).not.toBeInTheDocument();

    fireEvent.keyDown(viewer(), { key: "ArrowLeft" });
    expect(window.location.search).toBe("?photo=b");

    await user.click(screen.getByRole("button", { name: "前の写真" }));
    expect(window.location.search).toBe("?photo=a");
  });

  it("一覧から開いて閉じると、戻って URL から ?photo= が消える", async () => {
    const user = userEvent.setup();
    render(<PhotoGrid photos={photos} />);
    await user.click(screen.getByRole("link", { name: "朝の海" }));
    await user.click(screen.getByRole("button", { name: "次の写真" }));

    await user.click(screen.getByRole("button", { name: "閉じる" }));

    await waitFor(() => expect(window.location.search).toBe(""));
    expect(window.location.pathname).toBe("/gallery");
    expect(viewerIsOpen()).toBe(false);
  });

  it("?photo=<id> 付きで描くと最初から開き、閉じると一覧の URL に置き換える", async () => {
    const user = userEvent.setup();
    originalReplaceState.call(window.history, null, "", "/gallery?photo=c");

    render(<PhotoGrid photos={photos} />);

    expect(viewerIsOpen()).toBe(true);
    expect(screen.getByText("3 / 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "閉じる" }));

    expect(window.location.pathname).toBe("/gallery");
    expect(window.location.search).toBe("");
    expect(viewerIsOpen()).toBe(false);
  });

  it("存在しない id は無視する", () => {
    originalReplaceState.call(window.history, null, "", "/gallery?photo=missing");

    render(<PhotoGrid photos={photos} />);

    expect(viewerIsOpen()).toBe(false);
  });

  it("撮影情報つきの写真は、写真の下の帯にカメラ名・レンズ名・露出の値・撮影日を出す", () => {
    originalReplaceState.call(window.history, null, "", "/gallery?photo=x");
    render(
      <PhotoGrid
        photos={[
          buildPhoto({
            id: "x",
            caption: "港の灯り",
            takenAt: "2026-10-03T01:00:00.000Z",
            exif: {
              cameraMake: "FUJIFILM",
              cameraModel: "X-T5",
              lensModel: "XF23mmF1.4 R LM WR",
              focalLength: 23,
              aperture: 1.4,
              exposureTime: 1 / 250,
              iso: 160,
              exposureCompensation: -2 / 3,
            },
          }),
        ]}
      />,
    );

    const band = within(viewer()).getByRole("img", { name: "港の灯り" }).closest("figure");
    const caption = band?.querySelector("figcaption");
    expect(caption).not.toBeNull();
    const info = within(caption as HTMLElement);
    expect(info.getByText("FUJIFILM X-T5")).toBeInTheDocument();
    expect(info.getByText("XF23mmF1.4 R LM WR")).toBeInTheDocument();
    for (const value of ["23mm", "f/1.4", "1/250s", "ISO 160", "-0.7 EV"]) {
      expect(info.getByText(value)).toBeInTheDocument();
    }
    expect(
      info.getByText(
        "焦点距離 23mm、絞り f/1.4、シャッター速度 1/250 秒、ISO 160、露出補正 -0.7 EV",
      ),
    ).toBeInTheDocument();
    expect(info.getByText("2026年10月3日")).toBeInTheDocument();
    // キャプションは帯の外に出す
    expect(info.queryByText("港の灯り")).not.toBeInTheDocument();
    expect(screen.getByText("港の灯り", { selector: "p" })).toBeInTheDocument();
  });

  it("撮影日だけの写真は帯に撮影日だけを出す", () => {
    originalReplaceState.call(window.history, null, "", "/gallery?photo=x");
    render(
      <PhotoGrid
        photos={[buildPhoto({ id: "x", caption: "港の灯り", takenAt: "2026-10-03T01:00:00.000Z" })]}
      />,
    );

    const caption = viewer().querySelector("figcaption");
    expect(caption).toHaveTextContent(/^2026年10月3日$/);
  });

  it("撮影情報も撮影日も無い写真には帯を付けない", () => {
    originalReplaceState.call(window.history, null, "", "/gallery?photo=b");
    render(<PhotoGrid photos={photos} />);

    expect(viewerIsOpen()).toBe(true);
    expect(viewer().querySelector("figure")).not.toBeNull();
    expect(viewer().querySelector("figcaption")).toBeNull();
  });

  it("横に 48px を超えてスワイプすると前後へ移る", async () => {
    const user = userEvent.setup();
    render(<PhotoGrid photos={photos} />);
    await user.click(screen.getByRole("link", { name: "昼の山" }));
    const image = within(viewer()).getByRole("img", { name: "昼の山" });
    const swipeArea = image.parentElement as HTMLElement;

    act(() => {
      fireEvent.pointerDown(swipeArea, { clientX: 200, clientY: 300 });
      fireEvent.pointerUp(swipeArea, { clientX: 170, clientY: 300 });
    });
    expect(window.location.search).toBe("?photo=b");

    act(() => {
      fireEvent.pointerDown(swipeArea, { clientX: 200, clientY: 300 });
      fireEvent.pointerUp(swipeArea, { clientX: 120, clientY: 310 });
    });
    expect(window.location.search).toBe("?photo=c");
  });
});
