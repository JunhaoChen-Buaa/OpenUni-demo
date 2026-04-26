"use client";

import { useEffect, useState } from "react";
import {
  getStoredProductMode,
  saveProductMode,
  type ProductMode,
} from "@/lib/storage";

export function useProductMode() {
  const [mode, setModeState] = useState<ProductMode | null>(null);

  useEffect(() => {
    setModeState(getStoredProductMode());
  }, []);

  const setMode = (nextMode: ProductMode) => {
    saveProductMode(nextMode);
    setModeState(nextMode);
  };

  return {
    mode,
    setMode,
    hasChosenMode: mode !== null,
    isTutorialMode: mode === "tutorial",
    isFormalMode: mode === "formal",
  };
}
