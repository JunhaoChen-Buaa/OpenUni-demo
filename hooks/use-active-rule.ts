"use client";

import { useCallback, useEffect, useState } from "react";
import type { CollegeRuleState } from "@/lib/college-rule-types";

const DEFAULT_RULE_STATE: CollegeRuleState = {
  has_rule: false,
  basis_label: "系统默认规则样本",
  rule: null,
};

export function useActiveRule() {
  const [state, setState] = useState<CollegeRuleState>(DEFAULT_RULE_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/rule", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Rule request failed with status ${response.status}`);
      }

      const data = (await response.json()) as CollegeRuleState;
      setState(data);
    } catch {
      setState(DEFAULT_RULE_STATE);
      setError("当前未能读取已导入规则，系统会继续使用默认规则样本。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...state,
    isLoading,
    error,
    refresh,
  };
}
