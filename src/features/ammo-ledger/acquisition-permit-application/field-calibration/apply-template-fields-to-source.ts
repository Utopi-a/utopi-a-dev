export async function applyTemplateFieldsToSource({
  templateId,
  fields,
}: {
  templateId: string;
  fields: unknown[];
}): Promise<{ filePath: string; fieldCount: number }> {
  const response = await fetch("/api/dev/acquisition-permit-template", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ templateId, fields }),
  });

  const payload = (await response.json()) as {
    error?: string;
    filePath?: string;
    fieldCount?: number;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "テンプレートへの反映に失敗しました");
  }

  if (!payload.filePath || payload.fieldCount === undefined) {
    throw new Error("テンプレートへの反映に失敗しました");
  }

  return {
    filePath: payload.filePath,
    fieldCount: payload.fieldCount,
  };
}
