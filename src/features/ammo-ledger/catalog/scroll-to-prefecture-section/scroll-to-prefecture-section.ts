export function scrollToPrefectureSection({
  container,
  prefecture,
}: {
  container: HTMLElement | null;
  prefecture: string;
}) {
  if (!container) {
    return;
  }

  const section = container.querySelector(`[data-prefecture="${prefecture}"]`);
  if (!(section instanceof HTMLElement)) {
    return;
  }

  const containerTop = container.getBoundingClientRect().top;
  const sectionTop = section.getBoundingClientRect().top;
  const nextScrollTop = container.scrollTop + (sectionTop - containerTop);

  container.scrollTo({ top: nextScrollTop, behavior: "smooth" });
}
