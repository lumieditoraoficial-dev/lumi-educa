import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STUDENT_BREAK_DESCRIPTION, STUDENT_BREAK_LABEL, STUDENTS_ON_BREAK } from "@/lib/academicCalendar";
import { buildClassInsights, buildStudentInsights, formatLastAccess, formatScore, isWeekend, toDate } from "@/lib/insights";
import { ALL_SCHOOLS, getSchoolLabel, matchesSchool, normalizeSchoolId, type SchoolFilter } from "@/lib/schools";
import { useSelectedSchoolFilter } from "@/lib/selectedSchool";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock3,
  FileDown,
  GraduationCap,
  LibraryBig,
  LineChart,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Wifi,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Enviado",
  under_review: "Em avaliacao",
  approved: "Aprovado",
  published: "Publicado",
  rejected: "Devolvido",
};

const staffRoleLabels: Record<string, string> = {
  educator: "Educador",
  coordinator: "Coordenador",
  editor: "Editor",
  admin: "Administrador",
};

function percent(value: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function newestDate(values: Array<string | Date | null | undefined>) {
  return values
    .map((value) => toDate(value))
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0];
}

function formatDate(value?: string | Date | null) {
  const date = toDate(value);
  if (!date) return "Sem registro";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function DashboardSchool() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const { schoolFilter } = useSelectedSchoolFilter();
  const [now, setNow] = useState(() => new Date());
  const { data: schools = [] } = trpc.schools.listSchools.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const { data: rawUsers = [] } = trpc.users.listUsers.useQuery(undefined, {
    enabled: Boolean(user && ["admin", "editor", "coordinator"].includes(user.role ?? "")),
    refetchInterval: 20_000,
  });
  const { data: rawStudents = [] } = trpc.users.listStudents.useQuery(undefined, {
    enabled: Boolean(user && ["educator", "coordinator", "editor", "admin"].includes(user.role ?? "")),
    refetchInterval: 20_000,
  });
  const { data: rawBooks = [] } = trpc.books.listBooks.useQuery(undefined, {
    enabled: Boolean(user && ["educator", "coordinator", "editor", "admin"].includes(user.role ?? "")),
    refetchInterval: 25_000,
  });
  const { data: rawEvaluations = [] } = trpc.evaluations.listEvaluations.useQuery(undefined, {
    enabled: Boolean(user && ["educator", "coordinator", "editor", "admin"].includes(user.role ?? "")),
    refetchInterval: 25_000,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const canSeeAll = user?.role === "admin" || user?.role === "editor";
  const effectiveSchoolFilter = (canSeeAll ? schoolFilter : String(normalizeSchoolId(user?.schoolId))) as SchoolFilter;
  const selectedSchoolId = effectiveSchoolFilter === ALL_SCHOOLS ? null : normalizeSchoolId(effectiveSchoolFilter);
  const selectedSchool = selectedSchoolId
    ? schools.find((school) => normalizeSchoolId(school.id) === selectedSchoolId)
    : undefined;
  const schoolName =
    effectiveSchoolFilter === ALL_SCHOOLS
      ? "Rede completa"
      : selectedSchool?.name ?? getSchoolLabel(effectiveSchoolFilter);
  const schoolLocation =
    [selectedSchool?.city, selectedSchool?.state].filter(Boolean).join(" - ") ||
    selectedSchool?.address ||
    selectedSchool?.description ||
    "Ambiente oficial Lumi Educa";

  const users = useMemo(
    () => rawUsers.filter((item) => matchesSchool(item.schoolId, effectiveSchoolFilter)),
    [effectiveSchoolFilter, rawUsers]
  );
  const students = useMemo(
    () => rawStudents.filter((item) => matchesSchool(item.schoolId, effectiveSchoolFilter)),
    [effectiveSchoolFilter, rawStudents]
  );
  const studentById = useMemo(() => new Map(rawStudents.map((student) => [student.id, student])), [rawStudents]);
  const books = useMemo(
    () => rawBooks.filter((book) => matchesSchool(studentById.get(book.authorId)?.schoolId, effectiveSchoolFilter)),
    [effectiveSchoolFilter, rawBooks, studentById]
  );
  const bookIds = useMemo(() => new Set(books.map((book) => book.id)), [books]);
  const evaluations = useMemo(
    () => rawEvaluations.filter((evaluation) => bookIds.has(evaluation.bookId)),
    [bookIds, rawEvaluations]
  );

  const studentInsights = useMemo(() => buildStudentInsights(students, books, evaluations, now), [books, evaluations, now, students]);
  const classInsights = useMemo(() => buildClassInsights(studentInsights), [studentInsights]);
  const educators = users.filter((item) => item.role === "educator");
  const staff = users.filter((item) => item.role !== "student");
  const scoredStudents = studentInsights.filter((item) => item.avgScore !== null);
  const averageScore = scoredStudents.length
    ? scoredStudents.reduce((sum, item) => sum + (item.avgScore ?? 0), 0) / scoredStudents.length
    : null;
  const onlineStudents = studentInsights.filter((item) => item.online);
  const accessedToday = studentInsights.filter((item) => item.accessedToday);
  const missingAccess = studentInsights.filter((item) => item.dailyAccess.required && !item.dailyAccess.ok);
  const attentionStudents = studentInsights
    .filter((item) => item.needsAttention)
    .sort((a, b) => (a.avgScore ?? 99) - (b.avgScore ?? 99));
  const publishedBooks = books.filter((book) => book.status === "published");
  const pendingBooks = books.filter((book) => ["submitted", "under_review", "approved"].includes(book.status ?? ""));
  const draftBooks = books.filter((book) => book.status === "draft" || book.status === "rejected");
  const totalPages = studentInsights.reduce((sum, item) => sum + item.totalPages, 0);
  const totalWords = studentInsights.reduce((sum, item) => sum + item.totalWords, 0);
  const lastActivity = newestDate([
    ...students.map((student) => student.lastSeenAt ?? student.lastSignedIn),
    ...books.map((book) => book.updatedAt),
    ...evaluations.map((evaluation) => evaluation.updatedAt),
  ]);
  const reportUrl =
    effectiveSchoolFilter === ALL_SCHOOLS ? "/api/reports/monthly.pdf" : `/api/reports/monthly.pdf?schoolId=${effectiveSchoolFilter}`;

  const topStudents = studentInsights
    .map((item) => {
      const score = item.avgScore ?? 5;
      const writing = Math.min(3, item.totalPages / 3) + Math.min(2, item.totalWords / 1000);
      const access = item.accessedToday ? 1.5 : item.online ? 1 : 0;
      const published = Math.min(1.5, item.publishedBooks * 0.75);
      return {
        ...item,
        index: Math.min(10, Math.max(0, score * 0.45 + writing + access + published)),
      };
    })
    .sort((a, b) => b.index - a.index)
    .slice(0, 5);

  const teamLoad = educators
    .map((educator) => {
      const assignedStudents = students.filter((student) => student.assignedEducatorId === educator.id);
      const assignedInsights = studentInsights.filter((item) => item.student.assignedEducatorId === educator.id);
      const assignedBooks = books.filter((book) => assignedStudents.some((student) => student.id === book.authorId));
      const assignedScored = assignedInsights.filter((item) => item.avgScore !== null);
      const educatorScore = assignedScored.length
        ? assignedScored.reduce((sum, item) => sum + (item.avgScore ?? 0), 0) / assignedScored.length
        : null;

      return {
        educator,
        students: assignedStudents.length,
        books: assignedBooks.length,
        accessedToday: assignedInsights.filter((item) => item.accessedToday).length,
        score: educatorScore,
      };
    })
    .sort((a, b) => b.students - a.students);

  const directorAlerts = [
    missingAccess.length
      ? {
          title: "Acesso diario",
          text: `${missingAccess.length} aluno(s) ainda precisam entrar hoje.`,
          icon: Clock3,
          className: "border-amber-200 bg-amber-50 text-amber-900",
        }
      : {
          title: "Acesso diario",
          text: isWeekend(now) ? "Fim de semana sem cobranca obrigatoria." : "Meta de acesso diario em bom andamento.",
          icon: CheckCircle2,
          className: "border-emerald-200 bg-emerald-50 text-emerald-900",
        },
    attentionStudents.length
      ? {
          title: "Acompanhamento pedagogico",
          text: `${attentionStudents.length} aluno(s) merecem olhar mais proximo da equipe.`,
          icon: AlertTriangle,
          className: "border-amber-200 bg-amber-50 text-amber-900",
        }
      : {
          title: "Acompanhamento pedagogico",
          text: "Nenhum alerta critico de desempenho registrado agora.",
          icon: ShieldCheck,
          className: "border-emerald-200 bg-emerald-50 text-emerald-900",
        },
    pendingBooks.length
      ? {
          title: "Fluxo editorial",
          text: `${pendingBooks.length} obra(s) aguardam avaliacao, aprovacao ou publicacao.`,
          icon: BookOpen,
          className: "border-sky-200 bg-sky-50 text-sky-900",
        }
      : {
          title: "Fluxo editorial",
          text: "Sem pendencias urgentes na fila de livros.",
          icon: Trophy,
          className: "border-emerald-200 bg-emerald-50 text-emerald-900",
        },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="overflow-hidden rounded-xl border border-[#0F3D2E]/10 bg-[#0F3D2E] text-white shadow-xl">
          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_22rem] lg:p-8">
            <div>
              <Badge className="border border-[#F4C430]/40 bg-[#F4C430]/15 text-[#F4C430] hover:bg-[#F4C430]/15">
                Portal Escola
              </Badge>
              <h1 className="mt-4 text-4xl font-black tracking-normal md:text-5xl">Visao da direcao</h1>
              <p className="mt-3 max-w-3xl text-lg leading-8 text-white/78">
                Tudo que a escola precisa acompanhar: uso da plataforma, desempenho, turmas, equipe, livros, pendencias e relatorios.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["Acesso real", "Dados por escola", "Relatorios para CP", "Fluxo de publicacao"].map((item) => (
                  <span key={item} className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em]">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/15 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/18 bg-white/12">
                  {selectedSchool?.logoUrl ? (
                    <img src={selectedSchool.logoUrl} alt={schoolName} className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-9 w-9 text-[#F4C430]" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#F4C430]">Escola</p>
                  <p className="mt-1 truncate text-xl font-black">{schoolName}</p>
                  <p className="mt-1 text-sm text-white/65">{schoolLocation}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white/10 p-3">
                  <p className="text-xs text-white/58">Ultima atividade</p>
                  <p className="mt-1 font-bold">{formatDate(lastActivity)}</p>
                </div>
                <div className="rounded-lg bg-white/10 p-3">
                  <p className="text-xs text-white/58">{STUDENTS_ON_BREAK ? "Usaram hoje" : "Acesso hoje"}</p>
                  <p className="mt-1 font-bold">{percent(accessedToday.length, students.length)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {STUDENTS_ON_BREAK ? (
          <Card className="border-sky-200 bg-sky-50">
            <CardContent className="flex flex-col gap-2 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-black text-sky-950">{STUDENT_BREAK_LABEL}</p>
                <p className="mt-1 text-sm leading-6 text-sky-800">{STUDENT_BREAK_DESCRIPTION}</p>
              </div>
              <Badge className="w-fit bg-sky-100 text-sky-800">Sem cobranca de acesso diario</Badge>
            </CardContent>
          </Card>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Alunos", value: students.length, detail: `${classInsights.length} turmas`, icon: GraduationCap },
            { label: "Equipe", value: staff.length, detail: `${educators.length} educadores`, icon: Users },
            { label: "Online agora", value: onlineStudents.length, detail: "uso real no momento", icon: Wifi },
            { label: "Media geral", value: formatScore(averageScore), detail: `${scoredStudents.length} alunos avaliados`, icon: LineChart },
            { label: "Livros", value: books.length, detail: `${publishedBooks.length} publicados`, icon: LibraryBig },
            { label: "Paginas", value: totalPages, detail: `${totalWords} palavras`, icon: BookOpen },
            { label: "Pendencias", value: pendingBooks.length, detail: "avaliacao/publicacao", icon: Activity },
            { label: "Rascunhos", value: draftBooks.length, detail: "em producao", icon: Target },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="rounded-lg border-[#0F3D2E]/10 bg-white shadow-sm">
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                    <p className="mt-1 text-3xl font-black text-slate-950">{stat.value}</p>
                    <p className="mt-1 text-xs text-slate-500">{stat.detail}</p>
                  </div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#fff8d7] text-[#0F3D2E]">
                    <Icon className="h-6 w-6" />
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {directorAlerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <Card key={alert.title} className={`rounded-lg ${alert.className}`}>
                <CardContent className="flex items-start gap-3 p-5">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-black">{alert.title}</p>
                    <p className="mt-1 text-sm leading-6">{alert.text}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-lg">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Turmas e desempenho</CardTitle>
                <p className="mt-1 text-sm text-slate-600">Leitura rapida para reuniao com CP e equipe pedagogica.</p>
              </div>
              <Button asChild className="bg-[#0F3D2E] hover:bg-[#174f3d]">
                <a href={reportUrl}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Baixar relatorio geral
                </a>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {classInsights.length === 0 ? (
                <p className="rounded-lg border border-dashed p-8 text-center text-slate-600">
                  Ainda nao ha turmas com alunos cadastrados nesta escola.
                </p>
              ) : (
                classInsights.map((item) => (
                  <div key={item.key} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div>
                        <p className="font-black text-slate-950">{item.className}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {item.students} alunos - {item.books} livros - {item.pages} paginas - {item.words} palavras
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Media {formatScore(item.avgScore)}</Badge>
                        <Badge className="bg-emerald-100 text-emerald-800">{item.accessedToday} acessos hoje</Badge>
                        {item.needsAttention > 0 ? (
                          <Badge className="bg-amber-100 text-amber-800">{item.needsAttention} alertas</Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-4">
                      {[
                        ["Online", item.online],
                        ["Publicados", item.publishedBooks],
                        ["Livros", item.books],
                        ["Paginas", item.pages],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md bg-white p-3">
                          <p className="text-xs text-slate-500">{label}</p>
                          <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/api/reports/class/${encodeURIComponent(item.className)}.pdf?schoolId=${item.schoolId}`}>
                          <FileDown className="mr-2 h-4 w-4" />
                          PDF da turma
                        </a>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>{STUDENTS_ON_BREAK ? "Uso nas ferias" : "Acesso obrigatorio"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {STUDENTS_ON_BREAK ? (
                  <p className="rounded-lg border border-sky-100 bg-sky-50 p-5 text-sm text-sky-800">
                    Periodo de ferias: os alunos podem continuar usando a plataforma, sem pendencia por falta de acesso diario.
                  </p>
                ) : isWeekend(now) ? (
                  <p className="rounded-lg border border-dashed p-5 text-sm text-slate-600">
                    Sabado e domingo ficam fora da cobranca diaria.
                  </p>
                ) : missingAccess.length === 0 ? (
                  <p className="rounded-lg border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-800">
                    A meta de acesso diario esta em dia.
                  </p>
                ) : (
                  missingAccess.slice(0, 8).map((item) => (
                    <div key={item.student.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div>
                        <p className="font-semibold text-slate-950">{item.student.name}</p>
                        <p className="text-sm text-slate-600">{item.student.className || "Sem turma"}</p>
                      </div>
                      <Badge className={item.dailyAccess.className}>{item.dailyAccess.label}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>Alunos em destaque</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topStudents.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-5 text-sm text-slate-600">
                    Ainda faltam dados para formar destaques.
                  </p>
                ) : (
                  topStudents.map((item, index) => (
                    <div key={item.student.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {index + 1}. {item.student.name}
                        </p>
                        <p className="text-sm text-slate-600">
                          Nota {formatScore(item.avgScore)} - {item.totalPages} paginas
                        </p>
                      </div>
                      <Badge className="bg-[#fff8d7] text-[#0F3D2E]">{item.index.toFixed(1)}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Equipe pedagogica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {teamLoad.length === 0 ? (
                <p className="rounded-lg border border-dashed p-8 text-center text-slate-600">
                  Nenhum educador vinculado nesta escola.
                </p>
              ) : (
                teamLoad.map((item) => (
                  <div key={item.educator.id} className="rounded-lg border p-4">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div>
                        <p className="font-black text-slate-950">{item.educator.name}</p>
                        <p className="text-sm text-slate-600">{item.educator.email}</p>
                      </div>
                      <Badge variant="outline">{staffRoleLabels[item.educator.role ?? "educator"] ?? "Equipe"}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-4">
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Alunos</p>
                        <p className="font-black text-slate-950">{item.students}</p>
                      </div>
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Livros</p>
                        <p className="font-black text-slate-950">{item.books}</p>
                      </div>
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Acesso hoje</p>
                        <p className="font-black text-slate-950">{item.accessedToday}</p>
                      </div>
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Media</p>
                        <p className="font-black text-slate-950">{formatScore(item.score)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Livros e publicacao</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {books.length === 0 ? (
                <p className="rounded-lg border border-dashed p-8 text-center text-slate-600">
                  Ainda nao ha livros criados nesta escola.
                </p>
              ) : (
                books
                  .slice()
                  .sort((a, b) => (toDate(b.updatedAt)?.getTime() ?? 0) - (toDate(a.updatedAt)?.getTime() ?? 0))
                  .slice(0, 10)
                  .map((book) => {
                    const author = studentById.get(book.authorId);
                    return (
                      <div key={book.id} className="rounded-lg border p-4">
                        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                          <div>
                            <p className="font-black text-slate-950">{book.title}</p>
                            <p className="text-sm text-slate-600">
                              {author?.name ?? "Aluno"} - {book.pageCount ?? 0} paginas - {book.wordCount ?? 0} palavras
                            </p>
                          </div>
                          <Badge variant="secondary">{statusLabels[book.status ?? "draft"] ?? book.status}</Badge>
                        </div>
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-lg border-[#0F3D2E]/10 bg-[#fbfaf2]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#F4C430]" />
              Leitura para direcao
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-white p-4">
              <BarChart3 className="h-5 w-5 text-[#0F3D2E]" />
              <p className="mt-3 font-black text-slate-950">Resultado pedagogico</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Media geral {formatScore(averageScore)}, {scoredStudents.length} alunos avaliados e {attentionStudents.length} em acompanhamento.
              </p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <Wifi className="h-5 w-5 text-[#0F3D2E]" />
              <p className="mt-3 font-black text-slate-950">Rotina de uso</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {accessedToday.length} de {students.length} alunos usaram hoje. Ultimo movimento: {formatLastAccess(lastActivity)}.
              </p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <LibraryBig className="h-5 w-5 text-[#0F3D2E]" />
              <p className="mt-3 font-black text-slate-950">Autoria estudantil</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {books.length} livros criados, {publishedBooks.length} publicados e {pendingBooks.length} no fluxo de avaliacao.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
