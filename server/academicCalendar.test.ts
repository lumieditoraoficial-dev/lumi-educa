import { describe, expect, it } from "vitest";
import { isStudentBreakDate } from "../shared/academicCalendar";

describe("calendario escolar", () => {
  it("isenta o acesso durante o recesso de 13 a 17 de julho", () => {
    expect(isStudentBreakDate(new Date("2026-07-13T12:00:00-03:00"))).toBe(true);
    expect(isStudentBreakDate(new Date("2026-07-17T18:00:00-03:00"))).toBe(true);
  });

  it("retoma a regra normal depois do recesso", () => {
    expect(isStudentBreakDate(new Date("2026-07-18T00:00:00-03:00"))).toBe(false);
    expect(isStudentBreakDate(new Date("2026-07-20T08:00:00-03:00"))).toBe(false);
  });
});
