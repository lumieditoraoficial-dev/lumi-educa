export const STUDENT_BREAK_START_AT = new Date("2026-07-13T00:00:00-03:00");
export const STUDENT_BREAK_END_AT = new Date("2026-07-17T23:59:59-03:00");
export const STUDENT_BREAK_LABEL = "Ferias escolares";
export const STUDENT_BREAK_DESCRIPTION =
  "De 13/07 a 17/07/2026 os alunos ficam sem cobranca de acesso e sem registro de falta. A plataforma permanece liberada.";

export function isStudentBreakDate(date = new Date()) {
  const timestamp = date.getTime();
  return timestamp >= STUDENT_BREAK_START_AT.getTime() && timestamp <= STUDENT_BREAK_END_AT.getTime();
}

export const STUDENTS_ON_BREAK = isStudentBreakDate();
