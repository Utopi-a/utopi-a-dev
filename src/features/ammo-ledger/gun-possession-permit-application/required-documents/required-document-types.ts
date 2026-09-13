export type RequiredDocumentSource = "generated" | "external" | "present_only";

export type RequiredDocumentStatus = "required" | "optional" | "omittable" | "omitted";

export type RequiredDocumentItem = {
  id: string;
  label: string;
  description: string;
  source: RequiredDocumentSource;
  status: RequiredDocumentStatus;
  formKind?: string;
  note?: string;
};
