"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AcquisitionPermitApplicationStyles } from "@/features/ammo-ledger/acquisition-permit-application/documents/acquisition-permit-application-styles/acquisition-permit-application-styles";
import {
  type AlignMode,
  alignCalibrationFields,
} from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/align-calibration-fields";
import { applyTemplateFieldsToSource } from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/apply-template-fields-to-source";
import { CalibrationAlignToolbar } from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/calibration-align-toolbar";
import { CalibrationFieldOverlay } from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/calibration-field-overlay";
import {
  clearCalibrationFieldOverrides,
  loadCalibrationFieldOverrides,
  saveCalibrationFieldOverrides,
} from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/calibration-field-storage";
import {
  loadCalibrationPreviewText,
  saveCalibrationPreviewText,
} from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/calibration-preview-text-storage";
import { calibrationSampleFieldValues } from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/calibration-sample-field-values";
import {
  calibrationTemplateRegistry,
  findCalibrationTemplate,
} from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/calibration-template-registry";
import {
  mmFromPt,
  ptFromMm,
  stepFontSizePt,
} from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/font-size-units";
import { serializeOverlayFields } from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/serialize-overlay-fields";
import type {
  FieldAlign,
  OverlayFieldDef,
  OverlayFieldVariant,
} from "@/features/ammo-ledger/acquisition-permit-application/form-template/form-template-types";
import { cn } from "@/lib/cn";

function cloneFields({ fields }: { fields: OverlayFieldDef[] }): OverlayFieldDef[] {
  return fields.map((field) => ({ ...field }));
}

function roundMm({ value }: { value: number }): number {
  return Math.round(value * 100) / 100;
}

function parseNumberInput({ value, fallback }: { value: string; fallback: number }): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type NumericFieldKey = "x" | "y" | "width" | "height";

export function FieldCalibrationView() {
  const [templateId, setTemplateId] = useState(calibrationTemplateRegistry[0]?.id ?? "");
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const [fields, setFields] = useState<OverlayFieldDef[]>([]);
  const [previewValues, setPreviewValues] = useState<Record<string, string>>(
    calibrationSampleFieldValues,
  );
  const [previewScale, setPreviewScale] = useState(0.85);
  const [isApplying, setIsApplying] = useState(false);

  const templateEntry = findCalibrationTemplate({ id: templateId });
  const template = templateEntry?.template;
  const pageCount = template?.pages.length ?? 0;

  useEffect(() => {
    if (!template) {
      return;
    }

    const saved = loadCalibrationFieldOverrides({ templateId: template.id });
    const savedPreview = loadCalibrationPreviewText({ templateId: template.id });
    setFields(saved ?? cloneFields({ fields: template.fields }));
    setPreviewValues(savedPreview ?? { ...calibrationSampleFieldValues });
    setPageIndex(0);
    setSelectedFieldIds(template.fields[0] ? [template.fields[0].id] : []);
  }, [template]);

  useEffect(() => {
    if (!template || fields.length === 0) {
      return;
    }
    saveCalibrationFieldOverrides({ templateId: template.id, fields });
  }, [fields, template]);

  useEffect(() => {
    if (!template) {
      return;
    }
    saveCalibrationPreviewText({ templateId: template.id, values: previewValues });
  }, [previewValues, template]);

  const pageFields = useMemo(
    () => fields.filter((field) => field.page === pageIndex),
    [fields, pageIndex],
  );

  useEffect(() => {
    setSelectedFieldIds((current) => {
      const onPage = current.filter((id) => pageFields.some((field) => field.id === id));
      if (onPage.length > 0) {
        return onPage;
      }
      return pageFields[0] ? [pageFields[0].id] : [];
    });
  }, [pageFields]);

  const primaryFieldId = selectedFieldIds[selectedFieldIds.length - 1] ?? null;
  const selectedField = fields.find((field) => field.id === primaryFieldId) ?? null;

  const selectField = useCallback(
    ({ fieldId, additive }: { fieldId: string; additive: boolean }) => {
      setSelectedFieldIds((current) => {
        if (additive) {
          if (current.includes(fieldId)) {
            return current.filter((id) => id !== fieldId);
          }
          return [...current, fieldId];
        }
        return [fieldId];
      });
    },
    [],
  );

  const updateField = useCallback(
    ({ id, patch }: { id: string; patch: Partial<OverlayFieldDef> }) => {
      setFields((current) =>
        current.map((field) => (field.id === id ? { ...field, ...patch } : field)),
      );
    },
    [],
  );

  const nudgeField = useCallback(({ id, dx, dy }: { id: string; dx: number; dy: number }) => {
    setFields((current) =>
      current.map((field) =>
        field.id === id
          ? {
              ...field,
              x: roundMm({ value: field.x + dx }),
              y: roundMm({ value: field.y + dy }),
            }
          : field,
      ),
    );
  }, []);

  function handleAlign({ mode }: { mode: AlignMode }) {
    setFields((current) =>
      alignCalibrationFields({
        fields: current,
        selectedIds: selectedFieldIds,
        mode,
      }),
    );
  }

  function handleNumericChange({ key, value }: { key: NumericFieldKey; value: string }) {
    if (!selectedField) {
      return;
    }

    if (value === "" && (key === "width" || key === "height")) {
      updateField({ id: selectedField.id, patch: { [key]: undefined } });
      return;
    }

    const parsed = parseNumberInput({ value, fallback: selectedField[key] ?? 0 });
    updateField({ id: selectedField.id, patch: { [key]: roundMm({ value: parsed }) } });
  }

  async function handleApplyToSource() {
    if (!template || !templateEntry.sourceFilePath) {
      toast.error("このテンプレートはソースファイルへの書き込みに未対応です");
      return;
    }

    setIsApplying(true);
    try {
      const result = await applyTemplateFieldsToSource({
        templateId: template.id,
        fields,
      });
      clearCalibrationFieldOverrides({ templateId: template.id });
      toast.success(`${result.filePath} に ${result.fieldCount} 件反映しました`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "反映に失敗しました");
    } finally {
      setIsApplying(false);
    }
  }

  async function handleCopyTypeScript() {
    const serialized = serializeOverlayFields({ fields });
    await navigator.clipboard.writeText(serialized);
    toast.success("fields 配列をクリップボードにコピーしました");
  }

  function handleResetToTemplate() {
    if (!template) {
      return;
    }
    setFields(cloneFields({ fields: template.fields }));
    clearCalibrationFieldOverrides({ templateId: template.id });
    toast.message("テンプレート定義に戻しました");
  }

  if (!template || !templateEntry) {
    return <p className="text-sm text-muted-foreground">テンプレートが見つかりません。</p>;
  }

  const page = template.pages[pageIndex];

  return (
    <div className="space-y-2">
      <AcquisitionPermitApplicationStyles />

      <div className="no-print flex flex-wrap items-center gap-1">
        <Link
          href="/lab/ammo-ledger/applications/acquisition-permit/print"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← 印刷プレビュー
        </Link>
        <Button type="button" variant="outline" size="sm" onClick={handleCopyTypeScript}>
          TypeScript をコピー
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isApplying || !templateEntry.sourceFilePath}
          onClick={handleApplyToSource}
        >
          {isApplying ? "反映中…" : "ソースに反映"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleResetToTemplate}>
          定義に戻す
        </Button>
      </div>

      <CalibrationAlignToolbar selectedCount={selectedFieldIds.length} onAlign={handleAlign} />

      <p className="text-xs text-muted-foreground">
        Cmd/Ctrl+クリックで複数選択。枠をドラッグ・リサイズし、整列ボタンで横/縦に揃えられます。
      </p>

      {templateEntry.supportsRepeatingRows ? (
        <p className="text-sm text-amber-700">
          このテンプレートは repeatingRows（別紙の表行）があります。現状は static fields
          のみ編集できます。
        </p>
      ) : null}

      <div className="grid gap-1 lg:grid-cols-[190px_minmax(0,1fr)_250px]">
        <aside className="space-y-2 rounded-md border p-2">
          <div className="space-y-2">
            <Label htmlFor="calibration-template">テンプレート</Label>
            <select
              id="calibration-template"
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
            >
              {calibrationTemplateRegistry.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>

          {pageCount > 1 ? (
            <div className="space-y-2">
              <Label htmlFor="calibration-page">ページ</Label>
              <select
                id="calibration-page"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={pageIndex}
                onChange={(event) => setPageIndex(Number(event.target.value))}
              >
                {template.pages.map((pageOption, index) => (
                  <option key={pageOption.imagePath} value={index}>
                    {index + 1} / {pageCount}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="calibration-scale">プレビュー倍率</Label>
            <Input
              id="calibration-scale"
              type="number"
              min={0.3}
              max={1.2}
              step={0.05}
              value={previewScale}
              onChange={(event) =>
                setPreviewScale(parseNumberInput({ value: event.target.value, fallback: 0.72 }))
              }
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">フィールド</p>
            <ul className="max-h-[480px] space-y-0.5 overflow-y-auto text-xs">
              {pageFields.map((field) => (
                <li key={field.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded px-1.5 py-0.5 text-left hover:bg-muted",
                      selectedFieldIds.includes(field.id) && "bg-muted font-medium",
                      primaryFieldId === field.id && "ring-1 ring-blue-500",
                    )}
                    onClick={(event) =>
                      selectField({
                        fieldId: field.id,
                        additive: event.metaKey || event.ctrlKey,
                      })
                    }
                  >
                    {field.id}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="overflow-auto rounded-md border bg-muted/10 p-0.5">
          <div
            style={{
              width: `${template.pageWidthMm * previewScale}mm`,
              height: `${template.pageHeightMm * previewScale}mm`,
            }}
          >
            <section
              data-calibration-page
              className="application-form-page origin-top-left"
              style={{
                width: `${template.pageWidthMm}mm`,
                height: `${template.pageHeightMm}mm`,
                transform: `scale(${previewScale})`,
                backgroundImage: `url(${page.imagePath})`,
              }}
            >
              <div className="application-form-page__overlay">
                {pageFields.map((field) => (
                  <CalibrationFieldOverlay
                    key={field.id}
                    field={field}
                    value={previewValues[field.id] ?? ""}
                    pageWidthMm={template.pageWidthMm}
                    pageHeightMm={template.pageHeightMm}
                    isSelected={selectedFieldIds.includes(field.id)}
                    isPrimary={primaryFieldId === field.id}
                    onMakePrimary={() => selectField({ fieldId: field.id, additive: false })}
                    onSelect={(event) =>
                      selectField({
                        fieldId: field.id,
                        additive: event.metaKey || event.ctrlKey,
                      })
                    }
                    onFieldChange={({ patch }) => {
                      updateField({ id: field.id, patch });
                    }}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>

        <aside className="space-y-2 rounded-md border p-2">
          <p className="text-sm font-medium">選択中フィールド</p>
          {selectedField ? (
            <>
              <p className="break-all text-xs text-muted-foreground">
                {selectedField.id}
                {selectedFieldIds.length > 1 ? `（他 ${selectedFieldIds.length - 1} 件）` : ""}
              </p>

              <div className="grid grid-cols-2 gap-1.5">
                {(["x", "y", "width", "height"] as const).map((key) => (
                  <div key={key} className="space-y-0.5">
                    <Label htmlFor={`field-${key}`}>{key}</Label>
                    <Input
                      id={`field-${key}`}
                      type="number"
                      step={0.1}
                      value={selectedField[key] ?? ""}
                      onChange={(event) => handleNumericChange({ key, value: event.target.value })}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <Label htmlFor="field-font-size-pt">fontSize (pt)</Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() =>
                      updateField({
                        id: selectedField.id,
                        patch: {
                          fontSize: stepFontSizePt({
                            fontSizeMm: selectedField.fontSize,
                            deltaPt: -0.5,
                          }),
                        },
                      })
                    }
                  >
                    −0.5
                  </Button>
                  <Input
                    id="field-font-size-pt"
                    type="number"
                    step={0.5}
                    min={0.5}
                    className="h-8"
                    value={ptFromMm({ mm: selectedField.fontSize })}
                    onChange={(event) => {
                      const pt = parseNumberInput({
                        value: event.target.value,
                        fallback: ptFromMm({ mm: selectedField.fontSize }),
                      });
                      updateField({
                        id: selectedField.id,
                        patch: { fontSize: mmFromPt({ pt }) },
                      });
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() =>
                      updateField({
                        id: selectedField.id,
                        patch: {
                          fontSize: stepFontSizePt({
                            fontSizeMm: selectedField.fontSize,
                            deltaPt: 0.5,
                          }),
                        },
                      })
                    }
                  >
                    +0.5
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  保存値: {selectedField.fontSize} mm
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="field-align">align</Label>
                <select
                  id="field-align"
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  value={selectedField.align ?? "left"}
                  onChange={(event) =>
                    updateField({
                      id: selectedField.id,
                      patch: { align: event.target.value as FieldAlign },
                    })
                  }
                >
                  <option value="left">left</option>
                  <option value="center">center</option>
                  <option value="right">right</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="field-preview-text">プレビュー文字</Label>
                <Textarea
                  id="field-preview-text"
                  rows={4}
                  value={previewValues[selectedField.id] ?? ""}
                  onChange={(event) =>
                    setPreviewValues((current) => ({
                      ...current,
                      [selectedField.id]: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="field-fit-text">fitText（枠内で自動調整）</Label>
                <select
                  id="field-fit-text"
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  value={selectedField.fitText === false ? "off" : "on"}
                  onChange={(event) =>
                    updateField({
                      id: selectedField.id,
                      patch: { fitText: event.target.value === "on" },
                    })
                  }
                >
                  <option value="on">ON（改行・縮小）</option>
                  <option value="off">OFF（fontSize 固定）</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="field-variant">variant</Label>
                <select
                  id="field-variant"
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  value={selectedField.variant ?? "text"}
                  onChange={(event) => {
                    const variant = event.target.value as OverlayFieldVariant;
                    updateField({
                      id: selectedField.id,
                      patch: { variant: variant === "text" ? undefined : variant },
                    });
                  }}
                >
                  <option value="text">text</option>
                  <option value="checkbox">checkbox</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => nudgeField({ id: selectedField.id, dx: 0, dy: -0.5 })}
                >
                  ↑ 0.5mm
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => nudgeField({ id: selectedField.id, dx: 0, dy: 0.5 })}
                >
                  ↓ 0.5mm
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => nudgeField({ id: selectedField.id, dx: -0.5, dy: 0 })}
                >
                  ← 0.5mm
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => nudgeField({ id: selectedField.id, dx: 0.5, dy: 0 })}
                >
                  → 0.5mm
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">フィールドを選択してください。</p>
          )}
        </aside>
      </div>
    </div>
  );
}
