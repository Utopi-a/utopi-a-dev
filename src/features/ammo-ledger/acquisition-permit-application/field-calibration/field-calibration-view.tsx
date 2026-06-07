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
  removeCalibrationFields,
  resolveDeletableCalibrationFieldIds,
} from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/delete-calibration-fields";
import {
  buildEvenYDistributionPatches,
  computeRowHeightFromFieldAnchors,
} from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/distribute-calibration-layout/distribute-calibration-layout";
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
  buildGroupMoveOrigins,
  reorderSelectionPrimary,
  resolveGroupMoveIds,
} from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/move-selected-fields";
import {
  applyCalibrationFieldPatch,
  applyCalibrationFieldPatches,
  applyGroupMoveDeltaToCalibration,
} from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/repeating-rows-calibration/apply-repeating-column-patch";
import { cloneRepeatingRows } from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/repeating-rows-calibration/clone-repeating-rows";
import {
  buildCalibrationPageFields,
  findCalibrationFieldDef,
} from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/repeating-rows-calibration/expand-repeating-row-columns";
import {
  isRepeatingCalibrationFieldId,
  parseRepeatingCalibrationColumnId,
} from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/repeating-rows-calibration/repeating-rows-calibration-ids";
import { serializeRepeatingRows } from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/repeating-rows-calibration/serialize-repeating-rows";
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

function resolveCalibrationPreviewValue({
  field,
  previewValues,
}: {
  field: OverlayFieldDef;
  previewValues: Record<string, string>;
}): string {
  const columnId = parseRepeatingCalibrationColumnId({ fieldId: field.id });
  if (columnId) {
    return previewValues[columnId] ?? "";
  }
  return previewValues[field.id] ?? "";
}

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
  const [evenDistributionCount, setEvenDistributionCount] = useState(2);
  const [rowSpacingCount, setRowSpacingCount] = useState(10);
  const [isApplying, setIsApplying] = useState(false);

  const {
    fields,
    repeatingRows,
    replaceFields,
    replaceRepeatingRows,
    replaceSnapshot,
    resetHistory,
    beginInteraction,
    endInteraction,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCalibrationHistory({
    initialSnapshot: { fields: [], repeatingRows: null },
  });

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
    const initialFields = saved?.fields ?? cloneCalibrationFields({ fields: template.fields });
    const initialRepeatingRows = saved?.repeatingRows
      ? cloneRepeatingRows({ repeatingRows: saved.repeatingRows })
      : template.repeatingRows
        ? cloneRepeatingRows({ repeatingRows: template.repeatingRows })
        : null;
    resetHistory({
      snapshot: {
        fields: initialFields,
        repeatingRows: initialRepeatingRows,
      },
    });
    setPreviewValues(savedPreview ?? { ...calibrationSampleFieldValues });
    setBackgroundScale(loadCalibrationBackgroundScale({ templateId: template.id }));
    setLayoutRepeatOffsetY(template.repeatingRows?.rowHeight ?? 19);
    setPageIndex(0);
    const initialPageFields = buildCalibrationPageFields({
      fields: initialFields,
      repeatingRows: initialRepeatingRows,
      pageIndex: 0,
    });
    setSelectedFieldIds(initialPageFields[0] ? [initialPageFields[0].id] : []);
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
    saveCalibrationFieldOverrides({ templateId: template.id, fields, repeatingRows });
  }, [fields, repeatingRows, template]);

  useEffect(() => {
    if (!template) {
      return;
    }
    saveCalibrationPreviewText({ templateId: template.id, values: previewValues });
  }, [previewValues, template]);

  useEffect(() => {
    if (selectedFieldIds.length >= 2) {
      setEvenDistributionCount(selectedFieldIds.length);
    }
  }, [selectedFieldIds]);

  useEffect(() => {
    if (repeatingRows) {
      setRowSpacingCount(repeatingRows.maxRowsPerPage);
    }
  }, [repeatingRows]);

  const calibrationPageFields = useMemo(
    () => buildCalibrationPageFields({ fields, repeatingRows, pageIndex }),
    [fields, repeatingRows, pageIndex],
  );

  const calibrationPageFieldIdsKey = useMemo(
    () => calibrationPageFields.map((field) => field.id).join("\0"),
    [calibrationPageFields],
  );

  const orderedCalibrationPageFields = useMemo(() => {
    const selectedIdSet = new Set(selectedFieldIds);
    return [...calibrationPageFields].sort((left, right) => {
      const leftSelected = selectedIdSet.has(left.id) ? 1 : 0;
      const rightSelected = selectedIdSet.has(right.id) ? 1 : 0;
      return leftSelected - rightSelected;
    });
  }, [calibrationPageFields, selectedFieldIds]);

  const allCalibrationFields = useMemo(
    () =>
      Array.from({ length: pageCount }, (_, index) =>
        buildCalibrationPageFields({ fields, repeatingRows, pageIndex: index }),
      ).flat(),
    [fields, pageCount, repeatingRows],
  );

  useEffect(() => {
    setSelectedFieldIds((current) => {
      const validIds = new Set(
        calibrationPageFieldIdsKey.split("\0").filter((id) => id.length > 0),
      );
      const onPage = current.filter((id) => validIds.has(id));
      if (onPage.length > 0) {
        if (
          onPage.length === current.length &&
          onPage.every((id, index) => id === current[index])
        ) {
          return current;
        }
        return onPage;
      }
      if (current.length === 0) {
        return current;
      }
      const firstId = calibrationPageFieldIdsKey.split("\0")[0];
      return firstId ? [firstId] : [];
    });
  }, [calibrationPageFieldIdsKey]);

  const primaryFieldId = selectedFieldIds[selectedFieldIds.length - 1] ?? null;
  const selectedField =
    primaryFieldId && template
      ? findCalibrationFieldDef({
          fields,
          repeatingRows,
          pageCount,
          fieldId: primaryFieldId,
        })
      : null;

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
      replaceSnapshot({
        updater: (current) => {
          const result = applyCalibrationFieldPatch({
            fields: current.fields,
            repeatingRows: current.repeatingRows,
            fieldId: id,
            patch,
          });
          return { fields: result.fields, repeatingRows: result.repeatingRows };
        },
        recordHistory,
      });
    },
    [replaceSnapshot],
  );

  const updateSelectedFields = useCallback(
    ({
      patch,
      recordHistory = true,
    }: {
      patch: Partial<OverlayFieldDef> | ((field: OverlayFieldDef) => Partial<OverlayFieldDef>);
      recordHistory?: boolean;
    }) => {
      const selectedIds = selectedFieldIdsRef.current;
      if (selectedIds.length === 0 || !template) {
        return;
      }

      replaceSnapshot({
        updater: (current) => {
          let nextFields = current.fields;
          let nextRepeatingRows = current.repeatingRows;

          for (const fieldId of selectedIds) {
            const fieldDef = findCalibrationFieldDef({
              fields: current.fields,
              repeatingRows: current.repeatingRows,
              pageCount,
              fieldId,
            });
            if (!fieldDef) {
              continue;
            }
            const resolvedPatch = typeof patch === "function" ? patch(fieldDef) : patch;
            const result = applyCalibrationFieldPatch({
              fields: nextFields,
              repeatingRows: nextRepeatingRows,
              fieldId,
              patch: resolvedPatch,
            });
            nextFields = result.fields;
            nextRepeatingRows = result.repeatingRows;
          }

          return { fields: nextFields, repeatingRows: nextRepeatingRows };
        },
        recordHistory,
      });
    },
    [pageCount, replaceSnapshot, template],
  );

  const nudgeField = useCallback(
    ({ id, dx, dy }: { id: string; dx: number; dy: number }) => {
      const moveIds = resolveGroupMoveIds({
        fieldId: id,
        selectedIds: selectedFieldIdsRef.current,
      });

      replaceSnapshot({
        updater: (current) => {
          const patches = moveIds
            .map((fieldId) => {
              const fieldDef = findCalibrationFieldDef({
                fields: current.fields,
                repeatingRows: current.repeatingRows,
                pageCount,
                fieldId,
              });
              if (!fieldDef) {
                return null;
              }
              return {
                fieldId,
                patch: {
                  x: roundMm({ value: fieldDef.x + dx }),
                  y: roundMm({ value: fieldDef.y + dy }),
                },
              };
            })
            .filter((patch): patch is { fieldId: string; patch: Partial<OverlayFieldDef> } =>
              Boolean(patch),
            );

          const result = applyCalibrationFieldPatches({
            fields: current.fields,
            repeatingRows: current.repeatingRows,
            patches,
          });
          return { fields: result.fields, repeatingRows: result.repeatingRows };
        },
      });
    },
    [pageCount, replaceSnapshot],
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
      dragOriginsRef.current = buildGroupMoveOrigins({ fields: allCalibrationFields, moveIds });
      beginInteraction();
      return true;
    },
    [allCalibrationFields, beginInteraction],
  );

  const handleDragMove = useCallback(
    ({ dx, dy }: { dx: number; dy: number }) => {
      replaceSnapshot({
        updater: (current) =>
          applyGroupMoveDeltaToCalibration({
            fields: current.fields,
            repeatingRows: current.repeatingRows,
            origins: dragOriginsRef.current,
            dx,
            dy,
          }),
        recordHistory: false,
      });
    },
    [replaceSnapshot],
  );

  const handleDragEnd = useCallback(() => {
    dragOriginsRef.current = {};
    endInteraction();
  }, [endInteraction]);

  const handleDuplicate = useCallback(() => {
    const staticSelectedIds = selectedFieldIds.filter(
      (id) => !isRepeatingCalibrationFieldId({ id }),
    );
    if (staticSelectedIds.length === 0) {
      return;
    }
    const result = duplicateSelectedFields({
      fields,
      selectedIds: staticSelectedIds,
    });
    replaceFields({ fields: result.fields });
    setSelectedFieldIds(result.newIds);
    toast.success(`${result.newIds.length} 件を複製しました`);
  }, [fields, replaceFields, selectedFieldIds]);

  const handleRepeatLayout = useCallback(() => {
    const staticSelectedIds = selectedFieldIds.filter(
      (id) => !isRepeatingCalibrationFieldId({ id }),
    );
    if (staticSelectedIds.length === 0 || layoutRepeatCount < 1) {
      return;
    }
    const result = repeatSelectedFieldLayout({
      fields,
      selectedIds: staticSelectedIds,
      repeatCount: layoutRepeatCount,
      offsetY: layoutRepeatOffsetY,
    });
    replaceFields({ fields: result.fields });
    setSelectedFieldIds(result.newIds);
    toast.success(`レイアウトを ${layoutRepeatCount} 回繰り返しました`);
  }, [fields, layoutRepeatCount, layoutRepeatOffsetY, replaceFields, selectedFieldIds]);

  const handleDeleteSelected = useCallback(() => {
    const deletableIds = resolveDeletableCalibrationFieldIds({ selectedIds: selectedFieldIds });
    if (deletableIds.length === 0) {
      toast.error("削除できるフィールドが選択されていません（紫枠は削除不可）");
      return;
    }

    let nextFields = fields;
    replaceFields({
      updater: (current) => {
        nextFields = removeCalibrationFields({ fields: current, fieldIds: deletableIds });
        return nextFields;
      },
    });

    const nextPageFields = buildCalibrationPageFields({
      fields: nextFields,
      repeatingRows,
      pageIndex,
    });
    setSelectedFieldIds(nextPageFields[0] ? [nextPageFields[0].id] : []);
    toast.success(`${deletableIds.length} 件を削除しました`);
  }, [fields, pageIndex, repeatingRows, replaceFields, selectedFieldIds]);

  const handleEvenDistribution = useCallback(() => {
    const patches = buildEvenYDistributionPatches({
      fields: allCalibrationFields,
      selectedIds: selectedFieldIds,
      count: evenDistributionCount,
    });
    if (!patches) {
      toast.error(
        `${evenDistributionCount} 件選択してください（現在 ${selectedFieldIds.length} 件）`,
      );
      return;
    }

    replaceSnapshot({
      updater: (current) => {
        const result = applyCalibrationFieldPatches({
          fields: current.fields,
          repeatingRows: current.repeatingRows,
          patches,
        });
        return { fields: result.fields, repeatingRows: result.repeatingRows };
      },
    });
    toast.success(`${evenDistributionCount} 件を均等配置しました`);
  }, [allCalibrationFields, evenDistributionCount, replaceSnapshot, selectedFieldIds]);

  const handleComputeRowHeightFromAnchors = useCallback(() => {
    if (!repeatingRows) {
      return;
    }

    const result = computeRowHeightFromFieldAnchors({
      fields: allCalibrationFields,
      selectedIds: selectedFieldIds,
      rowCount: rowSpacingCount,
    });
    if (!result) {
      toast.error("上下2点を選択し、行数は2以上にしてください");
      return;
    }

    replaceRepeatingRows({
      updater: (current) =>
        current
          ? {
              ...current,
              startY: result.startY,
              rowHeight: result.rowHeight,
            }
          : current,
    });
    setLayoutRepeatOffsetY(result.rowHeight);
    toast.success(`startY ${result.startY}mm · rowHeight ${result.rowHeight}mm`);
  }, [
    allCalibrationFields,
    repeatingRows,
    replaceRepeatingRows,
    rowSpacingCount,
    selectedFieldIds,
  ]);

  function handleAlign({ mode }: { mode: AlignMode }) {
    const aligned = alignCalibrationFields({
      fields: allCalibrationFields,
      selectedIds: selectedFieldIds,
      mode,
    });
    const patches = selectedFieldIds
      .map((fieldId) => {
        const before = allCalibrationFields.find((field) => field.id === fieldId);
        const after = aligned.find((field) => field.id === fieldId);
        if (!before || !after) {
          return null;
        }
        return {
          fieldId,
          patch: {
            x: after.x,
            y: after.y,
          },
        };
      })
      .filter((patch): patch is { fieldId: string; patch: Partial<OverlayFieldDef> } =>
        Boolean(patch),
      );

    replaceSnapshot({
      updater: (current) => {
        const result = applyCalibrationFieldPatches({
          fields: current.fields,
          repeatingRows: current.repeatingRows,
          patches,
        });
        return { fields: result.fields, repeatingRows: result.repeatingRows };
      },
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
        repeatingRows,
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
    const serializedFields = serializeOverlayFields({ fields });
    const serializedRepeatingRows = repeatingRows
      ? `\n\n${serializeRepeatingRows({ repeatingRows })}`
      : "";
    await navigator.clipboard.writeText(`${serializedFields}${serializedRepeatingRows}`);
    toast.success("テンプレート定義をクリップボードにコピーしました");
  }

  function handleResetToTemplate() {
    if (!template) {
      return;
    }
    resetHistory({
      snapshot: {
        fields: cloneCalibrationFields({ fields: template.fields }),
        repeatingRows: template.repeatingRows
          ? cloneRepeatingRows({ repeatingRows: template.repeatingRows })
          : null,
      },
    });
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
        return;
      }
      if (
        event.key === "Delete" ||
        event.key === "Backspace" ||
        ((event.metaKey || event.ctrlKey) && (event.key === "Delete" || event.key === "Backspace"))
      ) {
        event.preventDefault();
        handleDeleteSelected();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDeleteSelected, handleDuplicate, redo, undo]);

  if (!template || !templateEntry) {
    return <p className="text-sm text-muted-foreground">テンプレートが見つかりません。</p>;
  }

  const page = template.pages[pageIndex];
  const previewTextKey =
    selectedField && isRepeatingCalibrationFieldId({ id: selectedField.id })
      ? (parseRepeatingCalibrationColumnId({ fieldId: selectedField.id }) ?? selectedField.id)
      : (selectedField?.id ?? "");

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
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={
            resolveDeletableCalibrationFieldIds({ selectedIds: selectedFieldIds }).length === 0
          }
          onClick={handleDeleteSelected}
        >
          削除
        </Button>
      </div>

      <CalibrationAlignToolbar selectedCount={selectedFieldIds.length} onAlign={handleAlign} />

      <p className="text-xs text-muted-foreground">
        空白をドラッグで範囲選択 · Cmd/Ctrl+クリックで複数選択 · 複数選択中はドラッグで一緒に移動 ·
        Cmd/Ctrl+Z/Y で Undo/Redo · Cmd/Ctrl+D で複製 · Delete/Backspace で削除 ·
        均等配置は最上/最下を基準に個数指定
        {repeatingRows ? " · 紫枠は表行（repeatingRows）の列" : ""}
      </p>

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

          <div className="space-y-2 rounded-md border p-2">
            <p className="text-xs font-medium">均等配置</p>
            <p className="text-[11px] text-muted-foreground">
              最上と最下の選択を端に、個数ぶん y を等分します
            </p>
            <div className="space-y-1">
              <Label htmlFor="even-distribution-count">個数</Label>
              <Input
                id="even-distribution-count"
                type="number"
                min={2}
                max={30}
                step={1}
                value={evenDistributionCount}
                onChange={(event) =>
                  setEvenDistributionCount(
                    Math.max(2, parseNumberInput({ value: event.target.value, fallback: 2 })),
                  )
                }
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={selectedFieldIds.length < 2}
              onClick={handleEvenDistribution}
            >
              選択を均等配置
            </Button>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">フィールド</p>
            <ul className="max-h-[480px] space-y-0.5 overflow-y-auto text-xs">
              {calibrationPageFields.map((field) => (
                <li key={field.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded px-1.5 py-0.5 text-left hover:bg-muted",
                      selectedFieldIds.includes(field.id) && "bg-muted font-medium",
                      primaryFieldId === field.id && "ring-1 ring-blue-500",
                      isRepeatingCalibrationFieldId({ id: field.id }) && "text-violet-700",
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

          {repeatingRows ? (
            <div className="space-y-1 rounded border border-dashed border-violet-300 p-2">
              <p className="text-xs font-medium text-violet-800">表行レイアウト</p>
              {(
                [
                  { key: "startY", label: "startY" },
                  { key: "rowHeight", label: "rowHeight" },
                  { key: "maxRowsPerPage", label: "maxRowsPerPage" },
                ] as const
              ).map(({ key, label }) => (
                <div key={key} className="space-y-0.5">
                  <Label htmlFor={`repeating-${key}`}>{label}</Label>
                  <Input
                    id={`repeating-${key}`}
                    type="number"
                    step={key === "maxRowsPerPage" ? 1 : 0.01}
                    value={repeatingRows[key]}
                    onFocus={beginInteraction}
                    onBlur={endInteraction}
                    onChange={(event) => {
                      const fallback = repeatingRows[key];
                      const parsed = parseNumberInput({ value: event.target.value, fallback });
                      replaceRepeatingRows({
                        recordHistory: false,
                        updater: (current) => {
                          if (!current) {
                            return current;
                          }
                          return {
                            ...current,
                            [key]:
                              key === "maxRowsPerPage"
                                ? Math.max(1, Math.round(parsed))
                                : roundMm({ value: parsed }),
                          };
                        },
                      });
                    }}
                  />
                </div>
              ))}
              <div className="space-y-1 pt-1">
                <Label htmlFor="row-spacing-count">行数（2点間を等分）</Label>
                <Input
                  id="row-spacing-count"
                  type="number"
                  min={2}
                  max={30}
                  step={1}
                  value={rowSpacingCount}
                  onChange={(event) =>
                    setRowSpacingCount(
                      Math.max(2, parseNumberInput({ value: event.target.value, fallback: 2 })),
                    )
                  }
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={selectedFieldIds.length !== 2}
                onClick={handleComputeRowHeightFromAnchors}
              >
                2点から rowHeight 算出
              </Button>
              <p className="text-[11px] text-muted-foreground">
                表の横線に合わせて仮フィールドを2点置き、ちょうど2件だけ選択。行数=2
                なら1〜2行目の間隔、行数=10 なら1〜10行目全体を等分（紫枠は使わない）
              </p>
            </div>
          ) : null}
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
                  pageFields={calibrationPageFields}
                  onSelectFields={selectFields}
                />
                {repeatingRows && pageIndex === 0
                  ? Array.from(
                      { length: Math.min(2, repeatingRows.maxRowsPerPage - 1) },
                      (_, index) => {
                        const rowNumber = index + 1;
                        return repeatingRows.columns.map((column) => (
                          <div
                            key={`ghost-row-${rowNumber}-${column.id}`}
                            className="pointer-events-none absolute z-[1] box-border border border-dashed border-violet-300/60 bg-violet-200/5"
                            style={{
                              left: `${(column.x / template.pageWidthMm) * 100}%`,
                              top: `${((repeatingRows.startY + rowNumber * repeatingRows.rowHeight + (column.yOffset ?? 0)) / template.pageHeightMm) * 100}%`,
                              width: `${(column.width / template.pageWidthMm) * 100}%`,
                              height: `${((column.height ?? column.fontSize * 1.4) / template.pageHeightMm) * 100}%`,
                            }}
                          />
                        ));
                      },
                    )
                  : null}
                {orderedCalibrationPageFields.map((field) => (
                  <CalibrationFieldOverlay
                    key={field.id}
                    field={field}
                    value={resolveCalibrationPreviewValue({ field, previewValues })}
                    pageWidthMm={template.pageWidthMm}
                    pageHeightMm={template.pageHeightMm}
                    isSelected={selectedFieldIds.includes(field.id)}
                    isPrimary={primaryFieldId === field.id}
                    isRepeatingRowColumn={isRepeatingCalibrationFieldId({ id: field.id })}
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
                    onFocus={beginInteraction}
                    onBlur={endInteraction}
                    onChange={(event) => {
                      const pt = parseNumberInput({
                        value: event.target.value,
                        fallback: ptFromMm({ mm: selectedField.fontSize }),
                      });
                      updateSelectedFields({
                        patch: { fontSize: mmFromPt({ pt }) },
                        recordHistory: false,
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
                  value={previewValues[previewTextKey] ?? ""}
                  onChange={(event) =>
                    setPreviewValues((current) => ({
                      ...current,
                      [previewTextKey]: event.target.value,
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
