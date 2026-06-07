export type ApplicationPrintSection = "main" | "supplement";

const printSectionClassNames: Record<ApplicationPrintSection, string> = {
  main: "printing-application-main",
  supplement: "printing-application-supplement",
};

export function printApplicationSection({ section }: { section: ApplicationPrintSection }): void {
  const className = printSectionClassNames[section];
  const root = document.documentElement;

  root.classList.remove(...Object.values(printSectionClassNames));

  const cleanup = () => {
    root.classList.remove(className);
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  root.classList.add(className);
  window.print();
}
