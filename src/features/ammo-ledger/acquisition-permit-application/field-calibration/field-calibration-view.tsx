"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  loadCalibrationBackgroundScale,
  saveCalibrationBackgroundScale,
} from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/calibration-background-scale-storage";
import { CalibrationFieldOverlay } from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/calibration-field-overlay";
import {
  clearCalibrationFieldOverrides,
  loadCalibrationFieldOverrides,
  saveCalibrationFieldOverrides,
} from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/calibration-field-storage";
import { CalibrationMarqueeLayer } from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/calibration-marquee-layer";
import {
  loadCalibrationPreviewText,
  saveCalibrationPreviewText,
} from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/calibration-preview-text-storage";
import { calibrationSampleFieldValues } from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/calibration-sample-field-values";
import {
  calibrationTemplateRegistry,
  findCalibrationTemplate,
} from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/calibration-template-registry";
import { cloneCalibrationFields } from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/clone-calibration-fields";
import {
  duplicateSelectedFields,
  repeatSelectedFieldLayout,
} from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/duplicate-calibration-fields";
import {
  mmFromPt,
  ptFromMm,
  stepFontSizePt,
} from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/font-size-units";
import {
  applyGroupMoveDelta,
  applyGroupNudge,
  buildGroupMoveOrigins,
  reorderSelectionPrimary,
  resolveGroupMoveIds,
} from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/move-selected-fields";
import { serializeOverlayFields } from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/serialize-overlay-fields";
import { useCalibrationHistory } from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/use-calibration-history";
import type {
  FieldAlign,
  FieldVerticalAlign,
  OverlayFieldDef,
  OverlayFieldVariant,
} from "@/features/ammo-ledger/acquisition-permit-application/form-template/form-template-types";
import { cn } from "@/lib/cn";

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
  const [previewValues, setPreviewValues] = useState<Record<string, string>>(
    calibrationSampleFieldValues,
  );
  const [previewScale, setPreviewScale] = useState(0.85);
  const [backgroundScale, setBackgroundScale] = useState(1);
  const [layoutRepeatCount, setLayoutRepeatCount] = useState(1);
  const [layoutRepeatOffsetY, setLayoutRepeatOffsetY] = useState(19);
  const [isApplying, setIsApplying] = useState(false);

  const {
    fields,
    replaceFields,
    resetHistory,
    beginInteraction,
    endInteraction,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCalibrationHistory({ initialFields: [] });

  const selectedFieldIdsRef = useRef(selectedFieldIds);
  selectedFieldIdsRef.current = selectedFieldIds;

  const dragOriginsRef = useRef<Record<string, { x: number; y: number }>>({});

  const templateEntry = findCalibrationTemplate({ id: templateId });
  const template = templateEntry?.template;
  const pageCount = template?.pages.length ?? 0;

  useEffect(() => {
    if (!template) {
      return;
    }

    const saved = loadCalibrationFieldOverrides({ templateId: template.id });
    const savedPreview = loadCalibrationPreviewText({ templateId: template.id });
    resetHistory({
      fields: saved ?? cloneCalibrationFields({ fields: template.fields }),
    });
    setPreviewValues(savedPreview ?? { ...calibrationSampleFieldValues });
    setBackgroundScale(loadCalibrationBackgroundScale({ templateId: template.id }));
    setPageIndex(0);
    setSelectedFieldIds(template.fields[0] ? [template.fields[0].id] : []);
  }, [template, resetHistory]);

  useEffect(() => {
    if (!template) {
      return;
    }
    saveCalibrationBackgroundScale({ templateId: template.id, scale: backgroundScale });
  }, [backgroundScale, template]);

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

  const selectFields = useCallback(
    ({ fieldIds, additive }: { fieldIds: string[]; additive: boolean }) => {
      if (fieldIds.length === 0) {
        if (!additive) {
          setSelectedFieldIds([]);
        }
        return;
      }
      setSelectedFieldIds((current) => {
        if (additive) {
          return [...new Set([...current, ...fieldIds])];
        }
        return fieldIds;
      });
    },
    [],
  );

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
    ({
      id,
      patch,
      recordHistory = true,
    }: {
      id: string;
      patch: Partial<OverlayFieldDef>;
      recordHistory?: boolean;
    }) => {
      replaceFields({
        updater: (current) =>
          current.map((field) => (field.id === id ? { ...field, ...patch } : field)),
        recordHistory,
      });
    },
    [replaceFields],
  );

  const updateSelectedFields = useCallback(
    ({
      patch,
      recordHistory = true,
    }: {
      patch: Partial<OverlayFieldDef> | ((field: OverlayFieldDef) => Partial<OverlayFieldDef>);
      recordHistory?: boolean;
    }) => {
      const selectedIds = new Set(selectedFieldIdsRef.current);
      if (selectedIds.size === 0) {
        return;
      }

      replaceFields({
        updater: (current) =>
          current.map((field) => {
            if (!selectedIds.has(field.id)) {
              return field;
            }
            const resolvedPatch = typeof patch === "function" ? patch(field) : patch;
            return { ...field, ...resolvedPatch };
          }),
        recordHistory,
      });
    },
    [replaceFields],
  );

  const nudgeField = useCallback(
    ({ id, dx, dy }: { id: string; dx: number; dy: number }) => {
      const moveIds = resolveGroupMoveIds({
        fieldId: id,
        selectedIds: selectedFieldIdsRef.current,
      });
      replaceFields({
        updater: (current) => applyGroupNudge({ fields: current, moveIds, dx, dy }),
      });
    },
    [replaceFields],
  );

  const prepareFieldDrag = useCallback(
    ({ fieldId, additive }: { fieldId: string; additive: boolean }) => {
      let nextSelection = selectedFieldIdsRef.current;

      if (additive) {
        nextSelection = nextSelection.includes(fieldId)
          ? nextSelection.filter((selectedId) => selectedId !== fieldId)
          : [...nextSelection, fieldId];
        setSelectedFieldIds(nextSelection);
        return false;
      }

      if (nextSelection.includes(fieldId) && nextSelection.length > 1) {
        nextSelection = reorderSelectionPrimary({
          selectedIds: nextSelection,
          primaryId: fieldId,
        });
      } else {
        nextSelection = [fieldId];
      }
      setSelectedFieldIds(nextSelection);

      const moveIds = resolveGroupMoveIds({ fieldId, selectedIds: nextSelection });
      dragOriginsRef.current = buildGroupMoveOrigins({ fields, moveIds });
      beginInteraction();
      return true;
    },
    [beginInteraction, fields],
  );

  const handleDragMove = useCallback(
    ({ dx, dy }: { dx: number; dy: number }) => {
      replaceFields({
        updater: (current) =>
          applyGroupMoveDelta({
            fields: current,
            origins: dragOriginsRef.current,
            dx,
            dy,
          }),
        recordHistory: false,
      });
    },
    [replaceFields],
  );

  const handleDragEnd = useCallback(() => {
    dragOriginsRef.current = {};
    endInteraction();
  }, [endInteraction]);

  const handleDuplicate = useCallback(() => {
    if (selectedFieldIds.length === 0) {
      return;
    }
    const result = duplicateSelectedFields({
      fields,
      selectedIds: selectedFieldIds,
    });
    replaceFields({ fields: result.fields });
    setSelectedFieldIds(result.newIds);
    toast.success(`${result.newIds.length} 件を複製しました`);
  }, [fields, replaceFields, selectedFieldIds]);

  const handleRepeatLayout = useCallback(() => {
    if (selectedFieldIds.length === 0 || layoutRepeatCount < 1) {
      return;
    }
    const result = repeatSelectedFieldLayout({
      fields,
      selectedIds: selectedFieldIds,
      repeatCount: layoutRepeatCount,
      offsetY: layoutRepeatOffsetY,
    });
    replaceFields({ fields: result.fields });
    setSelectedFieldIds(result.newIds);
    toast.success(`レイアウトを ${layoutRepeatCount} 回繰り返しました`);
  }, [fields, layoutRepeatCount, layoutRepeatOffsetY, replaceFields, selectedFieldIds]);

  function handleAlign({ mode }: { mode: AlignMode }) {
    replaceFields({
      fields: alignCalibrationFields({
        fields,
        selectedIds: selectedFieldIds,
        mode,
      }),
    });
  }

  function handleNumericChange({ key, value }: { key: NumericFieldKey; value: string }) {
    if (!selectedField) {
      return;
    }

    if (value === "" && (key === "width" || key === "height")) {
      updateSelectedFields({ patch: { [key]: undefined }, recordHistory: false });
      return;
    }

    const parsed = parseNumberInput({ value, fallback: selectedField[key] ?? 0 });
    updateSelectedFields({
      patch: { [key]: roundMm({ value: parsed }) },
      recordHistory: false,
    });
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
    resetHistory({ fields: cloneCalibrationFields({ fields: template.fields }) });
    clearCalibrationFieldOverrides({ templateId: template.id });
    toast.message("テンプレート定義に戻しました");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        (event.key === "y" || (event.key === "z" && event.shiftKey))
      ) {
        event.preventDefault();
        redo();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "d") {
        event.preventDefault();
        handleDuplicate();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDuplicate, redo, undo]);

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
        <Button type="button" variant="outline" size="sm" disabled={!canUndo} onClick={undo}>
          元に戻す
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!canRedo} onClick={redo}>
          やり直し
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={selectedFieldIds.length === 0}
          onClick={handleDuplicate}
        >
          複製
        </Button>
      </div>

      <CalibrationAlignToolbar selectedCount={selectedFieldIds.length} onAlign={handleAlign} />

      <p className="text-xs text-muted-foreground">
        空白をドラッグで範囲選択 · Cmd/Ctrl+クリックで複数選択 · 複数選択中はドラッグで一緒に移動 ·
        Cmd/Ctrl+Z/Y で Undo/Redo · Cmd/Ctrl+D で複製
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

          <div className="space-y-2">
            <Label htmlFor="calibration-background-scale">背景画像倍率（内部のみ）</Label>
            <Input
              id="calibration-background-scale"
              type="number"
              min={0.9}
              max={1.1}
              step={0.001}
              value={backgroundScale}
              onChange={(event) =>
                setBackgroundScale(parseNumberInput({ value: event.target.value, fallback: 1 }))
              }
            />
          </div>

          <div className="space-y-2 rounded-md border p-2">
            <p className="text-xs font-medium">レイアウト繰り返し</p>
            <div className="space-y-1">
              <Label htmlFor="layout-repeat-count">回数</Label>
              <Input
                id="layout-repeat-count"
                type="number"
                min={1}
                max={20}
                step={1}
                value={layoutRepeatCount}
                onChange={(event) =>
                  setLayoutRepeatCount(
                    Math.max(1, parseNumberInput({ value: event.target.value, fallback: 1 })),
                  )
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="layout-repeat-offset">縦間隔 (mm)</Label>
              <Input
                id="layout-repeat-offset"
                type="number"
                min={1}
                step={0.5}
                value={layoutRepeatOffsetY}
                onChange={(event) =>
                  setLayoutRepeatOffsetY(
                    parseNumberInput({ value: event.target.value, fallback: 19 }),
                  )
                }
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={selectedFieldIds.length === 0}
              onClick={handleRepeatLayout}
            >
              選択レイアウトを繰り返す
            </Button>
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
              className="application-form-page relative origin-top-left"
              style={{
                width: `${template.pageWidthMm}mm`,
                height: `${template.pageHeightMm}mm`,
                transform: `scale(${previewScale})`,
              }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: `url(${page.imagePath})`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  backgroundSize: `${backgroundScale * 100}% ${backgroundScale * 100}%`,
                }}
              />
              <div className="application-form-page__overlay relative">
                <CalibrationMarqueeLayer
                  pageWidthMm={template.pageWidthMm}
                  pageHeightMm={template.pageHeightMm}
                  pageFields={pageFields}
                  onSelectFields={selectFields}
                />
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
                    onPrepareDrag={({ additive }) =>
                      prepareFieldDrag({ fieldId: field.id, additive })
                    }
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                    onFieldChange={({ patch }) => {
                      updateField({ id: field.id, patch, recordHistory: false });
                    }}
                    onInteractionStart={beginInteraction}
                    onInteractionEnd={endInteraction}
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
                {selectedFieldIds.length > 1
                  ? `（他 ${selectedFieldIds.length - 1} 件 · 変更はすべてに反映）`
                  : ""}
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
                      onFocus={beginInteraction}
                      onBlur={endInteraction}
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
                      updateSelectedFields({
                        patch: (field) => ({
                          fontSize: stepFontSizePt({
                            fontSizeMm: field.fontSize,
                            deltaPt: -0.5,
                          }),
                        }),
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
                      updateSelectedFields({
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
                      updateSelectedFields({
                        patch: (field) => ({
                          fontSize: stepFontSizePt({
                            fontSizeMm: field.fontSize,
                            deltaPt: 0.5,
                          }),
                        }),
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
                <Label htmlFor="field-align">横位置（align）</Label>
                <select
                  id="field-align"
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  value={selectedField.align ?? "left"}
                  onChange={(event) =>
                    updateSelectedFields({
                      patch: { align: event.target.value as FieldAlign },
                    })
                  }
                >
                  <option value="left">左</option>
                  <option value="center">中央</option>
                  <option value="right">右</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="field-vertical-align">縦位置（verticalAlign）</Label>
                <select
                  id="field-vertical-align"
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  value={selectedField.verticalAlign ?? "top"}
                  onChange={(event) => {
                    const verticalAlign = event.target.value as FieldVerticalAlign;
                    updateSelectedFields({
                      patch: {
                        verticalAlign: verticalAlign === "top" ? undefined : verticalAlign,
                      },
                    });
                  }}
                >
                  <option value="top">上</option>
                  <option value="center">中央</option>
                  <option value="bottom">下</option>
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
                    updateSelectedFields({
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
                    updateSelectedFields({
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
