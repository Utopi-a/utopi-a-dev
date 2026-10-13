import { EntryRow } from "@/features/portfolio/entry-row/entry-row";
import { PageHeader } from "@/features/portfolio/page-header/page-header";
import { workItems } from "@/features/portfolio/works";

export function WorksView() {
  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      <PageHeader title="制作物" />

      <ul className="-my-3">
        {workItems.map((work) => (
          <li key={work.id}>
            <EntryRow title={work.title} description={work.description} href={work.href} />
          </li>
        ))}
      </ul>
    </div>
  );
}
