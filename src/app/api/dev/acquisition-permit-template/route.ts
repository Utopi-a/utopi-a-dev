import { NextResponse } from "next/server";
import { findCalibrationTemplate } from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/calibration-template-registry";
import { writeFormTemplateFields } from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/write-form-template-fields";
import type { OverlayFieldDef } from "@/features/ammo-ledger/acquisition-permit-application/form-template/form-template-types";

type ApplyTemplateRequest = {
  templateId: string;
  fields: OverlayFieldDef[];
};

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "development 環境でのみ利用できます" }, { status: 403 });
  }

  let body: ApplyTemplateRequest;
  try {
    body = (await request.json()) as ApplyTemplateRequest;
  } catch {
    return NextResponse.json({ error: "JSON の解析に失敗しました" }, { status: 400 });
  }

  if (!body.templateId || !Array.isArray(body.fields)) {
    return NextResponse.json({ error: "templateId と fields が必要です" }, { status: 400 });
  }

  const entry = findCalibrationTemplate({ id: body.templateId });
  if (!entry?.sourceFilePath) {
    return NextResponse.json(
      { error: "書き込み対象のテンプレートが見つかりません" },
      { status: 404 },
    );
  }

  try {
    const result = await writeFormTemplateFields({
      projectRoot: process.cwd(),
      relativeFilePath: entry.sourceFilePath,
      fields: body.fields,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "書き込みに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
