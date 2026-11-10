import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GalleryPhoto } from "@/features/gallery/photo";
import { GalleryView } from "./gallery-view";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

function buildPhoto({
  id,
  caption = null,
  takenAt = null,
  width = 1600,
  height = 1200,
}: {
  id: string;
  caption?: string | null;
  takenAt?: string | null;
  width?: number;
  height?: number;
}): GalleryPhoto {
  return {
    id,
    caption,
    takenAt,
    exif: null,
    width,
    height,
    variants: [640, 1280].map((variantWidth) => ({
      url: `https://cdn.example/${id}-${variantWidth}.webp`,
      width: variantWidth,
      height: Math.round((variantWidth * height) / width),
    })),
  };
}

describe("GalleryView", () => {
  it("見出しを「写真」にする", () => {
    render(<GalleryView photos={[]} />);

    expect(screen.getByRole("heading", { level: 1, name: "写真" })).toBeInTheDocument();
  });

  it("写真が無ければその旨を出す", () => {
    render(<GalleryView photos={[]} />);

    expect(screen.getByText("まだ写真がありません。")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("写真を渡した順に並べ、alt と srcset を付ける", () => {
    render(
      <GalleryView
        photos={[
          buildPhoto({ id: "a", caption: "朝の海" }),
          // 2026-11-10 00:30 (JST)。UTC ではまだ 11 月 9 日なので、日本時間で日付を出していることも確かめる
          buildPhoto({ id: "b", takenAt: "2026-11-09T15:30:00.000Z", width: 900, height: 1600 }),
          buildPhoto({ id: "c" }),
        ]}
      />,
    );

    const images = screen.getAllByRole("img");
    expect(images.map((image) => image.getAttribute("alt"))).toEqual([
      "朝の海",
      "2026年11月10日の写真",
      "写真",
    ]);
    expect(images[0]).toHaveAttribute(
      "srcset",
      "https://cdn.example/a-640.webp 640w, https://cdn.example/a-1280.webp 1280w",
    );
    expect(images[1]).toHaveAttribute("width", "900");
    expect(images[1]).toHaveAttribute("height", "1600");
    expect(images[0]).toHaveAttribute("loading", "lazy");

    const links = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("?photo="));
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "?photo=a",
      "?photo=b",
      "?photo=c",
    ]);
  });
});
