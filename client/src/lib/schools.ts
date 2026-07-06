export const ALL_SCHOOLS = "all";

export const SCHOOL_OPTIONS = [
  { id: 1, label: "Santissima Trindade" },
  { id: 2, label: "Nova escola" },
] as const;

export type SchoolFilter = typeof ALL_SCHOOLS | "1" | "2";

export function normalizeSchoolId(value: unknown) {
  const parsed = Number(value);
  return parsed === 2 ? 2 : 1;
}

export function getSchoolLabel(value: unknown) {
  const id = normalizeSchoolId(value);
  return SCHOOL_OPTIONS.find((school) => school.id === id)?.label ?? "Santissima Trindade";
}

export function matchesSchool(value: unknown, filter: SchoolFilter) {
  return filter === ALL_SCHOOLS || normalizeSchoolId(value) === Number(filter);
}
