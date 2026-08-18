export type ApplicationPrintSection =
  | "main"
  | "supplement"
  | "resume"
  | "cohabitants"
  | "duplex-bundle";

const printSectionClassNames: Record<ApplicationPrintSection, string> = {
  main: "printing-application-main",
  supplement: "printing-application-supplement",
  resume: "printing-application-resume",
  cohabitants: "printing-application-cohabitants",
  "duplex-bundle": "printing-application-duplex-bundle",
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
