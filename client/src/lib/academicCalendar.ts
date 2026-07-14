export const STUDENT_BREAK_END_AT = new Date("2026-07-24T23:59:59-03:00");
export const STUDENTS_ON_BREAK = Date.now() <= STUDENT_BREAK_END_AT.getTime();
export const STUDENT_BREAK_LABEL = "Ferias escolares";
export const STUDENT_BREAK_DESCRIPTION =
  "Ate 24/07/2026 os alunos estao em ferias, mas a plataforma continua liberada para escrita, leitura, mensagens e acompanhamento.";
