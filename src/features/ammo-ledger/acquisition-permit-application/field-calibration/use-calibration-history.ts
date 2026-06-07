"use client";

import { useCallback, useRef, useState } from "react";
import type { OverlayFieldDef, RepeatingRowMap } from "../form-template/form-template-types";
import { cloneCalibrationFields } from "./clone-calibration-fields";
import { cloneRepeatingRows } from "./repeating-rows-calibration/clone-repeating-rows";

const MAX_HISTORY = 50;

export type CalibrationSnapshot = {
  fields: OverlayFieldDef[];
  repeatingRows: RepeatingRowMap | null;
};

function cloneSnapshot({ snapshot }: { snapshot: CalibrationSnapshot }): CalibrationSnapshot {
  return {
    fields: cloneCalibrationFields({ fields: snapshot.fields }),
    repeatingRows: snapshot.repeatingRows
      ? cloneRepeatingRows({ repeatingRows: snapshot.repeatingRows })
      : null,
  };
}

export function useCalibrationHistory({
  initialSnapshot,
}: {
  initialSnapshot: CalibrationSnapshot;
}) {
  const [past, setPast] = useState<CalibrationSnapshot[]>([]);
  const [present, setPresent] = useState(initialSnapshot);
  const [future, setFuture] = useState<CalibrationSnapshot[]>([]);
  const presentRef = useRef(present);
  presentRef.current = present;
  const transactionSnapshotRef = useRef<CalibrationSnapshot | null>(null);

  const resetHistory = useCallback(({ snapshot }: { snapshot: CalibrationSnapshot }) => {
    transactionSnapshotRef.current = null;
    setPast([]);
    setFuture([]);
    setPresent(snapshot);
  }, []);

  const pushPast = useCallback((snapshot: CalibrationSnapshot) => {
    setPast((current) => [...current.slice(-(MAX_HISTORY - 1)), snapshot]);
    setFuture([]);
  }, []);

  const replaceSnapshot = useCallback(
    ({
      snapshot,
      updater,
      recordHistory = true,
    }: {
      snapshot?: CalibrationSnapshot;
      updater?: (current: CalibrationSnapshot) => CalibrationSnapshot;
      recordHistory?: boolean;
    }) => {
      const next = snapshot ?? updater?.(presentRef.current) ?? presentRef.current;
      if (recordHistory) {
        pushPast(cloneSnapshot({ snapshot: presentRef.current }));
      }
      setPresent(next);
    },
    [pushPast],
  );

  const replaceFields = useCallback(
    ({
      fields,
      updater,
      recordHistory = true,
    }: {
      fields?: OverlayFieldDef[];
      updater?: (current: OverlayFieldDef[]) => OverlayFieldDef[];
      recordHistory?: boolean;
    }) => {
      replaceSnapshot({
        updater: (current) => ({
          ...current,
          fields: fields ?? updater?.(current.fields) ?? current.fields,
        }),
        recordHistory,
      });
    },
    [replaceSnapshot],
  );

  const replaceRepeatingRows = useCallback(
    ({
      repeatingRows,
      updater,
      recordHistory = true,
    }: {
      repeatingRows?: RepeatingRowMap | null;
      updater?: (current: RepeatingRowMap | null) => RepeatingRowMap | null;
      recordHistory?: boolean;
    }) => {
      replaceSnapshot({
        updater: (current) => ({
          ...current,
          repeatingRows: repeatingRows ?? updater?.(current.repeatingRows) ?? current.repeatingRows,
        }),
        recordHistory,
      });
    },
    [replaceSnapshot],
  );

  const beginInteraction = useCallback(() => {
    if (!transactionSnapshotRef.current) {
      transactionSnapshotRef.current = cloneSnapshot({ snapshot: presentRef.current });
    }
  }, []);

  const endInteraction = useCallback(() => {
    const snapshot = transactionSnapshotRef.current;
    transactionSnapshotRef.current = null;
    if (!snapshot) {
      return;
    }
    const changed =
      JSON.stringify(snapshot) !== JSON.stringify(cloneSnapshot({ snapshot: presentRef.current }));
    if (changed) {
      pushPast(snapshot);
    }
  }, [pushPast]);

  const undo = useCallback(() => {
    setPast((currentPast) => {
      if (currentPast.length === 0) {
        return currentPast;
      }
      const previous = currentPast[currentPast.length - 1];
      setFuture((currentFuture) => [
        cloneSnapshot({ snapshot: presentRef.current }),
        ...currentFuture,
      ]);
      setPresent(previous);
      return currentPast.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((currentFuture) => {
      if (currentFuture.length === 0) {
        return currentFuture;
      }
      const [next, ...rest] = currentFuture;
      setPast((currentPast) => [...currentPast, cloneSnapshot({ snapshot: presentRef.current })]);
      setPresent(next);
      return rest;
    });
  }, []);

  return {
    fields: present.fields,
    repeatingRows: present.repeatingRows,
    replaceFields,
    replaceRepeatingRows,
    replaceSnapshot,
    resetHistory,
    beginInteraction,
    endInteraction,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
