export const unauthenticatedMutationMessage =
  "ログインの有効期限が切れました。ログインし直してから保存してください。";

/** 画面側でログインし直す導線を出せるよう、ほかの失敗と `code` で区別する。 */
export function unauthenticatedMutationResult() {
  return {
    ok: false as const,
    code: "unauthenticated" as const,
    error: unauthenticatedMutationMessage,
  };
}
