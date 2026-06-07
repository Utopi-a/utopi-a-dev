type PrefectureSectionHeadingProps = {
  prefecture: string;
  count?: number;
};

export function PrefectureSectionHeading({ prefecture, count }: PrefectureSectionHeadingProps) {
  return (
    <h3 className="sticky top-0 z-10 border-b border-border/50 bg-background/95 py-3 text-lg font-semibold backdrop-blur-sm">
      {prefecture}
      {count !== undefined ? (
        <span className="ml-2 text-sm font-normal text-muted-foreground">{count}件</span>
      ) : null}
    </h3>
  );
}
