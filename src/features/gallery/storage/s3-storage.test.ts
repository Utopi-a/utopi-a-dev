// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createS3Storage } from "@/features/gallery/storage/s3-storage";

const config = {
  endpoint: "https://account.r2.cloudflarestorage.com",
  bucket: "gallery",
  accessKeyId: "test-access-key",
  secretAccessKey: "test-secret-key",
  publicUrl: "https://photos.example.com",
};

function storageWith({ response }: { response: () => Response }) {
  const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => response());
  return { storage: createS3Storage({ config, fetch }), fetch };
}

function sentRequest({ fetch }: { fetch: ReturnType<typeof vi.fn<typeof globalThis.fetch>> }) {
  const [input] = fetch.mock.calls[0];
  if (!(input instanceof Request)) {
    throw new Error("署名済みの Request が送られていません");
  }
  return input;
}

describe("createS3Storage", () => {
  it("署名付きの PUT で、変わらない画像としてキャッシュさせる見出しを付けて置く", async () => {
    const { storage, fetch } = storageWith({ response: () => new Response(null, { status: 200 }) });
    const body = new Uint8Array([1, 2, 3, 4]);

    await storage.put({ key: "photos/abc/640.webp", body, contentType: "image/webp" });

    expect(fetch).toHaveBeenCalledTimes(1);
    const request = sentRequest({ fetch });
    expect(request.method).toBe("PUT");
    expect(request.url).toBe(
      "https://account.r2.cloudflarestorage.com/gallery/photos/abc/640.webp",
    );
    expect(request.headers.get("Authorization")).toMatch(
      /^AWS4-HMAC-SHA256 Credential=test-access-key\/\d{8}\/auto\/s3\/aws4_request, /,
    );
    expect(request.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    expect(request.headers.get("Content-Type")).toBe("image/webp");
    expect(new Uint8Array(await request.arrayBuffer())).toEqual(body);
  });

  it("キーごとに署名付きの DELETE を送る", async () => {
    const { storage, fetch } = storageWith({ response: () => new Response(null, { status: 204 }) });

    await storage.remove({ keys: ["photos/abc/640.webp", "photos/abc/1280.webp"] });

    const requests = fetch.mock.calls.map(([input]) => input as Request);
    // 並行に送るので、届く順は問わない
    expect(requests.map((request) => `${request.method} ${request.url}`).sort()).toEqual([
      "DELETE https://account.r2.cloudflarestorage.com/gallery/photos/abc/1280.webp",
      "DELETE https://account.r2.cloudflarestorage.com/gallery/photos/abc/640.webp",
    ]);
    for (const request of requests) {
      expect(request.headers.get("Authorization")).toMatch(/^AWS4-HMAC-SHA256 /);
    }
  });

  it("2xx 以外が返ったら、再送せずに例外にする", async () => {
    const { storage, fetch } = storageWith({
      response: () => new Response("denied", { status: 403 }),
    });

    await expect(
      storage.put({
        key: "photos/abc/640.webp",
        body: new Uint8Array([1]),
        contentType: "image/webp",
      }),
    ).rejects.toThrow("403");
    await expect(storage.remove({ keys: ["photos/abc/640.webp"] })).rejects.toThrow("403");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("公開 URL は公開用のドメインとキーから作る", () => {
    const { storage } = storageWith({ response: () => new Response(null) });
    expect(storage.publicUrl({ key: "photos/abc/640.webp" })).toBe(
      "https://photos.example.com/photos/abc/640.webp",
    );
  });
});
