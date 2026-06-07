export function formatPrefectureJumpLabel({ prefecture }: { prefecture: string }): string {
  if (prefecture === "北海道") {
    return "北海道";
  }

  if (prefecture.endsWith("県") || prefecture.endsWith("府") || prefecture.endsWith("都")) {
    return prefecture.slice(0, -1);
  }

  return prefecture;
}
