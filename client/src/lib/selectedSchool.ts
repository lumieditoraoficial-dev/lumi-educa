import { useEffect, useMemo, useState } from "react";
import { ALL_SCHOOLS, type SchoolFilter, normalizeSchoolId } from "./schools";

const SELECTED_SCHOOL_KEY = "lumi-selected-school-id";

export function getStoredSchoolFilter(): SchoolFilter {
  if (typeof window === "undefined") return ALL_SCHOOLS;
  const stored = window.localStorage.getItem(SELECTED_SCHOOL_KEY);
  return stored === "1" || stored === "2" ? stored : ALL_SCHOOLS;
}

export function setStoredSchoolFilter(value: SchoolFilter) {
  if (typeof window === "undefined") return;
  if (value === ALL_SCHOOLS) {
    window.localStorage.removeItem(SELECTED_SCHOOL_KEY);
    return;
  }
  window.localStorage.setItem(SELECTED_SCHOOL_KEY, String(normalizeSchoolId(value)));
  window.dispatchEvent(new CustomEvent("lumi-school-change", { detail: value }));
}

export function useSelectedSchoolFilter(fallback: SchoolFilter = ALL_SCHOOLS) {
  const [schoolFilter, setSchoolFilter] = useState<SchoolFilter>(() => {
    const stored = getStoredSchoolFilter();
    return stored === ALL_SCHOOLS ? fallback : stored;
  });

  useEffect(() => {
    const sync = () => {
      const stored = getStoredSchoolFilter();
      setSchoolFilter(stored === ALL_SCHOOLS ? fallback : stored);
    };
    window.addEventListener("storage", sync);
    window.addEventListener("lumi-school-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("lumi-school-change", sync);
    };
  }, [fallback]);

  return useMemo(
    () => ({
      schoolFilter,
      setSchoolFilter: (value: SchoolFilter) => {
        setStoredSchoolFilter(value);
        setSchoolFilter(value);
      },
    }),
    [schoolFilter]
  );
}
