export const DEFAULT_SCHOOL_ID = 1;
export const SCHOOL_IDS = [1, 2] as const;

export type SchoolId = (typeof SCHOOL_IDS)[number];

export function normalizeSchoolId(value: unknown): SchoolId {
  const parsed = Number(value);
  return SCHOOL_IDS.includes(parsed as SchoolId) ? (parsed as SchoolId) : DEFAULT_SCHOOL_ID;
}

export function canSeeAllSchools(user: { id?: number | null; role?: string | null }) {
  return (user.id ?? 0) < 0 || user.role === "admin" || user.role === "editor";
}

export function sameSchool(
  left: { schoolId?: number | null },
  right: { schoolId?: number | null }
) {
  return normalizeSchoolId(left.schoolId) === normalizeSchoolId(right.schoolId);
}
