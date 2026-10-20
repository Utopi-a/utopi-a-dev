import { EntryRow } from "@/features/portfolio/entry-row/entry-row";
import { workItems } from "@/features/portfolio/works";

export function WorksView() {
  return (
    <>
      <h1 className="pf-title">制作物</h1>
      <ul className="pf-list">
        {workItems.map((work) => (
          <li key={work.id}>
            <EntryRow title={work.title} description={work.description} href={work.href} />
          </li>
        ))}
      </ul>
    </>
  );
}
