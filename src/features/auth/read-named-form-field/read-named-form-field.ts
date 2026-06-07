export function readNamedFormField({
  form,
  name,
}: {
  form: HTMLFormElement;
  name: string;
}): string {
  const value = new FormData(form).get(name);
  return typeof value === "string" ? value : "";
}
