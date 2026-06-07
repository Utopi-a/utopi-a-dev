"use client";

import { useCallback, useRef, useState } from "react";
import type { OverlayFieldDef } from "../form-template/form-template-types";
import { cloneCalibrationFields } from "./clone-calibration-fields";

const MAX_HISTORY = 50;

export function useCalibrationHistory({ initialFields }: { initialFields: OverlayFieldDef[] }) {
  const [past, setPast] = useState<OverlayFieldDef[][]>([]);
  const [present, setPresent] = useState(initialFields);
  const [future, setFuture] = useState<OverlayFieldDef[][]>([]);
  const presentRef = useRef(present);
  presentRef.current = present;
  const transactionSnapshotRef = useRef<OverlayFieldDef[] | null>(null);

  const resetHistory = useCallback(({ fields }: { fields: OverlayFieldDef[] }) => {
    transactionSnapshotRef.current = null;
    setPast([]);
    setFuture([]);
    setPresent(fields);
  }, []);

  const pushPast = useCallback((snapshot: OverlayFieldDef[]) => {
    setPast((current) => [...current.slice(-(MAX_HISTORY - 1)), snapshot]);
    setFuture([]);
  }, []);

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
      const next = fields ?? updater?.(presentRef.current) ?? presentRef.current;
      if (recordHistory) {
        pushPast(cloneCalibrationFields({ fields: presentRef.current }));
      }
      setPresent(next);
    },
    [pushPast],
  );

  const beginInteraction = useCallback(() => {
    if (!transactionSnapshotRef.current) {
      transactionSnapshotRef.current = cloneCalibrationFields({ fields: presentRef.current });
    }
  }, []);

  const endInteraction = useCallback(() => {
    const snapshot = transactionSnapshotRef.current;
    transactionSnapshotRef.current = null;
    if (!snapshot) {
      return;
    }
    const changed =
      JSON.stringify(snapshot) !==
      JSON.stringify(cloneCalibrationFields({ fields: presentRef.current }));
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
        cloneCalibrationFields({ fields: presentRef.current }),
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
      setPast((currentPast) => [
        ...currentPast,
        cloneCalibrationFields({ fields: presentRef.current }),
      ]);
      setPresent(next);
      return rest;
    });
  }, []);

  return {
    fields: present,
    replaceFields,
    resetHistory,
    beginInteraction,
    endInteraction,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
