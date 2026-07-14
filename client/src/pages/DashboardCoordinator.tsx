import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STUDENT_BREAK_DESCRIPTION, STUDENT_BREAK_LABEL, STUDENTS_ON_BREAK } from "@/lib/academicCalendar";
import { buildClassInsights, buildStudentInsights, formatLastAccess, formatScore, isWeekend, toDate } from "@/lib/insights";
import { ALL_SCHOOLS, SCHOOL_OPTIONS, type SchoolFilter, getSchoolLabel, matchesSchool, normalizeSchoolId } from "@/lib/schools";
import { useSelectedSchoolFilter } from "@/lib/selectedSchool";
import { trpc } from "@/lib/trpc";
import { Activity, AlertTriangle, BarChart3, BookOpen, CheckCircle, Eye, FileDown, TrendingUp, Users, Wifi, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Enviado",
  under_review: "Em revisao",
  approved: "Aprovado",
  published: "Publicado",
  rejected: "Rejeitado",
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function DashboardCoordinator() {
  const utils = trpc.useUtils();
  const [feedbackByBook, setFeedbackByBook] = useState<Record<number, string>>({});
  const [scoreByBook, setScoreByBook] = useState<Record<number, string>>({});
  const { schoolFilter, setSchoolFilter } = useSelectedSchoolFilter();
  const [now, setNow] = useState(() => new Date());
  const { data: rawBooks = [], isLoading } = trpc.books.listBooks.useQuery(undefined, { refetchInterval: 30_000 });
  const { data: rawStudents = [] } = trpc.users.listStudents.useQuery(undefined, { refetchInterval: 15_000 });
  const { data: rawEvaluations = [] } = trpc.evaluations.listEvaluations.useQuery(undefined, { refetchInterval: 30_000 });
  const { data: profile } = trpc.users.getProfile.useQuery();

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  const canChooseSchools = profile?.role === "admin" || profile?.role === "editor";
  const ownSchoolFilter = String(normalizeSchoolId(profile?.schoolId)) as SchoolFilter;
  const effectiveSchoolFilter = canChooseSchools ? schoolFilter : ownSchoolFilter;
  const availableSchoolOptions = canChooseSchools
    ? SCHOOL_OPTIONS
    : SCHOOL_OPTIONS.filter((school) => school.id === normalizeSchoolId(profile?.schoolId));

  const students = useMemo(
    () => rawStudents.filter((student) => matchesSchool(student.schoolId, effectiveSchoolFilter)),
    [rawStudents, effectiveSchoolFilter]
  );
  const studentById = useMemo(() => new Map(rawStudents.map((student) => [student.id, student])), [rawStudents]);
  const books = useMemo(
    () => rawBooks.filter((book) => matchesSchool(studentById.get(book.authorId)?.schoolId, effectiveSchoolFilter)),
    [rawBooks, studentById, effectiveSchoolFilter]
  );
  const bookIds = useMemo(() => new Set(books.map((book) => book.id)), [books]);
  const evaluations = useMemo(
    () => rawEvaluations.filter((evaluation) => bookIds.has(evaluation.bookId)),
    [rawEvaluations, bookIds]
  );

  const studentInsights = useMemo(() => buildStudentInsights(students, books, evaluations, now), [students, books, evaluations, now]);
  const classInsights = useMemo(() => buildClassInsights(studentInsights), [studentInsights]);
  const monthlyReportUrl =
    effectiveSchoolFilter === ALL_SCHOOLS ? "/api/reports/monthly.pdf" : `/api/reports/monthly.pdf?schoolId=${effectiveSchoolFilter}`;

  const pendingApproval = books.filter((book) => book.status === "under_review");
  const readyToPublish = books.filter((book) => book.status === "approved");
  const published = books.filter((book) => book.status === "published");
  const scoredStudents = studentInsights.filter((item) => item.avgScore !== null);
  const averageScore = scoredStudents.length
    ? scoredStudents.reduce((sum, item) => sum + (item.avgScore ?? 0), 0) / scoredStudents.length
    : null;
  const onlineStudents = studentInsights.filter((item) => item.online);
  const accessedToday = studentInsights.filter((item) => item.accessedToday);
  const needAccessToday = studentInsights.filter((item) => item.dailyAccess.required && !item.dailyAccess.ok);
  const attentionStudents = studentInsights
    .filter((item) => item.needsAttention)
    .sort((a, b) => (a.avgScore ?? 99) - (b.avgScore ?? 99));
  const nowMs = now.getTime();
  const booksThisWeek = books.filter((book) => {
    const updated = toDate(book.updatedAt);
    return updated && nowMs - updated.getTime() <= WEEK_MS;
  }).length;
  const booksPreviousWeek = books.filter((book) => {
    const updated = toDate(book.updatedAt);
    const age = updated ? nowMs - updated.getTime() : Number.POSITIVE_INFINITY;
    return age > WEEK_MS && age <= WEEK_MS * 2;
  }).length;
  const weeklyGrowth =
    booksPreviousWeek === 0 ? booksThisWeek : Math.round(((booksThisWeek - booksPreviousWeek) / booksPreviousWeek) * 100);
  const accessRate = students.length ? Math.round((accessedToday.length / students.length) * 100) : 0;
  const publishRate = books.length ? Math.round((published.length / books.length) * 100) : 0;
  const averagePagesPerStudent = students.length
    ? Math.round(studentInsights.reduce((sum, item) => sum + item.totalPages, 0) / students.length)
    : 0;
  const writingStudents = studentInsights.filter((item) => item.totalWords > 0).length;
  const inactiveStudents = studentInsights.filter((item) => !item.lastActivity).length;
  const studentPerformance = studentInsights
    .map((item) => {
      const scorePart = item.avgScore ?? 5;
      const writingPart = Math.min(2, item.totalPages / 4) + Math.min(2, item.totalWords / 1200);
      const accessPart = item.accessedToday ? 1.5 : item.online ? 1 : 0;
      const publishedPart = Math.min(1.5, item.publishedBooks * 0.75);
      const performanceScore = Math.min(10, Math.max(0, scorePart * 0.5 + writingPart + accessPart + publishedPart));
      const status =
        item.needsAttention ? "Precisa acompanhamento" : performanceScore >= 8 ? "Destaque" : performanceScore >= 6 ? "Em progresso" : "Observar";

      return {
        ...item,
        performanceScore,
        status,
      };
    })
    .sort((a, b) => b.performanceScore - a.performanceScore);
  const topStudents = studentPerformance.slice(0, 5);
  const studentsToSupport = studentPerformance
    .filter((item) => item.needsAttention || item.performanceScore < 6)
    .sort((a, b) => a.performanceScore - b.performanceScore)
    .slice(0, 5);

  const approveMutation = trpc.publications.approveForPublication.useMutation({
    onSuccess: async () => {
      toast.success("Livro aprovado para publicacao.");
      await utils.books.listBooks.invalidate();
      await utils.evaluations.listEvaluations.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const rejectMutation = trpc.publications.rejectBook.useMutation({
    onSuccess: async () => {
      toast.success("Livro rejeitado e devolvido.");
      await utils.books.listBooks.invalidate();
      await utils.evaluations.listEvaluations.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const getValidatedScore = (bookId: number) => {
    const rawScore = scoreByBook[bookId];
    const score = Number(rawScore);

    if (rawScore === undefined || rawScore === "" || Number.isNaN(score) || score < 0 || score > 10) {
      toast.error("Informe uma nota de 0 a 10 antes de continuar.");
      return null;
    }

    return score;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-950">Painel do Coordenador</h1>
          <p className="mt-2 text-slate-600">
            Monitore turmas, uso da plataforma, desempenho pedagogico e fluxo de aprovacao das obras.
          </p>
          {STUDENTS_ON_BREAK ? (
            <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              <p className="font-black">{STUDENT_BREAK_LABEL}</p>
              <p className="mt-1">{STUDENT_BREAK_DESCRIPTION}</p>
            </div>
          ) : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full max-w-xs">
              <Select
                value={effectiveSchoolFilter}
                onValueChange={(value: SchoolFilter) => {
                  if (canChooseSchools) setSchoolFilter(value);
                }}
                disabled={!canChooseSchools}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {canChooseSchools ? <SelectItem value={ALL_SCHOOLS}>Todas as escolas</SelectItem> : null}
                  {availableSchoolOptions.map((school) => (
                    <SelectItem key={school.id} value={String(school.id)}>
                      {school.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" asChild>
              <a href={monthlyReportUrl}>
                <FileDown className="mr-2 h-4 w-4" />
                PDF pedagogico
              </a>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Desempenho escolar - {effectiveSchoolFilter === ALL_SCHOOLS ? "rede completa" : getSchoolLabel(effectiveSchoolFilter)}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {[
                { label: STUDENTS_ON_BREAK ? "Usaram hoje" : "Acesso hoje", value: `${accessRate}%`, detail: `${accessedToday.length}/${students.length} alunos` },
                { label: "Alunos produzindo", value: writingStudents, detail: "com texto iniciado" },
                { label: "Paginas por aluno", value: averagePagesPerStudent, detail: "media da escola" },
                { label: "Taxa de publicacao", value: `${publishRate}%`, detail: `${published.length}/${books.length} livros` },
                { label: "Sem primeiro acesso", value: inactiveStudents, detail: "precisam ser chamados" },
                { label: "Notas registradas", value: scoredStudents.length, detail: "alunos com avaliacao" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">{item.label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{item.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mapa de desempenho dos alunos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {studentPerformance.length === 0 ? (
                <p className="rounded-lg border border-dashed p-8 text-center text-slate-600">
                  Nenhum aluno para medir nesta escola.
                </p>
              ) : (
                studentPerformance.slice(0, 8).map((item) => (
                  <div key={item.student.id} className="rounded-lg border p-4">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div>
                        <p className="font-semibold text-slate-950">{item.student.name}</p>
                        <p className="text-sm text-slate-600">
                          {item.student.className || "Sem turma"} - {item.totalBooks} livros - {item.totalPages} paginas -{" "}
                          {item.totalWords} palavras
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Indice {item.performanceScore.toFixed(1)}</Badge>
                        <Badge variant="outline">Nota {formatScore(item.avgScore)}</Badge>
                        <Badge className={item.needsAttention ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Destaques da escola</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topStudents.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-600">Sem dados ainda.</p>
              ) : (
                topStudents.map((item, index) => (
                  <div key={item.student.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-slate-950">
                        {index + 1}. {item.student.name}
                      </p>
                      <p className="text-sm text-slate-600">
                        {item.totalPages} paginas, nota {formatScore(item.avgScore)}, {item.publishedBooks} publicados
                      </p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800">{item.performanceScore.toFixed(1)}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plano de acompanhamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {studentsToSupport.length === 0 ? (
                <p className="rounded-lg border border-emerald-100 bg-emerald-50 p-6 text-sm text-emerald-800">
                  Nenhum aluno em acompanhamento prioritario agora.
                </p>
              ) : (
                studentsToSupport.map((item) => (
                  <div key={item.student.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-950">{item.student.name}</p>
                      <Badge className="bg-amber-100 text-amber-800">{item.performanceScore.toFixed(1)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">
                      {item.dailyAccess.ok ? "Reforcar metas de escrita" : "Chamar para acessar hoje"} - ultima atividade{" "}
                      {formatLastAccess(item.lastActivity)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Alunos", value: students.length, icon: Users },
            { label: "Turmas", value: classInsights.length, icon: BarChart3 },
            { label: "Online agora", value: onlineStudents.length, icon: Wifi },
            { label: "Acessaram hoje", value: accessedToday.length, icon: Activity },
            { label: "Media geral", value: formatScore(averageScore), icon: TrendingUp },
            { label: "Semana", value: booksPreviousWeek === 0 ? booksThisWeek : `${weeklyGrowth}%`, icon: BookOpen },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="flex items-center justify-between pt-6">
                  <div>
                    <p className="text-sm text-slate-600">{stat.label}</p>
                    <p className="mt-1 text-3xl font-bold text-slate-950">{stat.value}</p>
                  </div>
                  <Icon className="h-8 w-8 text-emerald-700" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Visao por turma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {classInsights.length === 0 ? (
                <p className="rounded-lg border border-dashed p-8 text-center text-slate-600">
                  Nenhuma turma com aluno cadastrado ainda.
                </p>
              ) : (
                classInsights.map((item) => (
                  <div key={item.key} className="rounded-lg border p-4">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div>
                        <p className="font-semibold text-slate-950">{item.className}</p>
                        <p className="text-sm text-slate-600">
                          {effectiveSchoolFilter === ALL_SCHOOLS ? `${getSchoolLabel(item.schoolId)} - ` : ""}
                          {item.students} alunos - {item.books} livros - {item.pages} paginas
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-emerald-100 text-emerald-800">{item.online} online</Badge>
                        <Badge variant="outline">Media {formatScore(item.avgScore)}</Badge>
                        {item.needsAttention > 0 ? (
                          <Badge className="bg-amber-100 text-amber-800">{item.needsAttention} alertas</Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 md:grid-cols-4">
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Acesso hoje</p>
                        <p className="text-lg font-bold text-slate-950">
                          {item.accessedToday}/{item.students}
                        </p>
                      </div>
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Publicados</p>
                        <p className="text-lg font-bold text-slate-950">{item.publishedBooks}</p>
                      </div>
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Palavras</p>
                        <p className="text-lg font-bold text-slate-950">{item.words}</p>
                      </div>
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Alertas</p>
                        <p className="text-lg font-bold text-slate-950">{item.needsAttention}</p>
                      </div>
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle>{STUDENTS_ON_BREAK ? "Uso nas ferias" : "Acesso do dia"}</CardTitle>
                <Badge variant="outline">{STUDENTS_ON_BREAK ? "Uso livre" : isWeekend(now) ? "Sem cobranca" : "Obrigatorio"}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {STUDENTS_ON_BREAK ? (
                  <p className="rounded-lg border border-sky-100 bg-sky-50 p-5 text-sm text-sky-800">
                    Periodo de ferias: o acesso diario nao gera pendencia. A plataforma segue liberada para todos.
                  </p>
                ) : isWeekend(now) ? (
                  <p className="rounded-lg border border-dashed p-5 text-sm text-slate-600">
                    Sabado e domingo nao entram na meta obrigatoria de acesso.
                  </p>
                ) : needAccessToday.length === 0 ? (
                  <p className="rounded-lg border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-800">
                    Todos os alunos acessaram hoje.
                  </p>
                ) : (
                  needAccessToday.slice(0, 8).map((item) => (
                    <div key={item.student.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium text-slate-950">{item.student.name}</p>
                        <p className="text-sm text-slate-600">{item.student.className || "Sem turma"}</p>
                      </div>
                      <Badge className={item.dailyAccess.className}>{item.dailyAccess.label}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alertas pedagogicos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {attentionStudents.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-5 text-sm text-slate-600">
                    Nenhum aluno em alerta neste momento.
                  </p>
                ) : (
                  attentionStudents.slice(0, 8).map((item) => (
                    <div key={item.student.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-950">{item.student.name}</p>
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        Media {formatScore(item.avgScore)} - ultimo acesso {formatLastAccess(item.lastActivity)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Aguardando aprovacao da coordenacao</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-slate-600">Carregando livros...</p>
            ) : pendingApproval.length === 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-slate-600">
                Nenhum livro aguardando aprovacao.
              </p>
            ) : (
              pendingApproval.map((book) => (
                <div key={book.id} className="rounded-lg border p-4">
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-950">{book.title}</h3>
                        <Badge variant="outline">{statusLabels[book.status]}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{book.description || "Sem descricao."}</p>
                    </div>
                    <Button variant="outline" asChild>
                      <a href={`/books/${book.id}/pages`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver
                      </a>
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr]">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Nota final 0 a 10</label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        placeholder="Ex.: 9"
                        value={scoreByBook[book.id] ?? ""}
                        onChange={(event) =>
                          setScoreByBook((current) => ({ ...current, [book.id]: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Comentario da coordenacao</label>
                      <Textarea
                        placeholder="Parecer final, ajustes ou observacoes..."
                        value={feedbackByBook[book.id] ?? ""}
                        onChange={(event) =>
                          setFeedbackByBook((current) => ({ ...current, [book.id]: event.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      className="bg-emerald-700 hover:bg-emerald-800"
                      disabled={approveMutation.isPending}
                      onClick={() => {
                        const score = getValidatedScore(book.id);
                        if (score === null) return;
                        approveMutation.mutate({
                          bookId: book.id,
                          score,
                          feedback: feedbackByBook[book.id] || "Aprovado pela coordenacao.",
                        });
                      }}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Aprovar
                    </Button>
                    <Button
                      variant="outline"
                      disabled={rejectMutation.isPending}
                      onClick={() => {
                        const score = getValidatedScore(book.id);
                        if (score === null) return;
                        rejectMutation.mutate({
                          bookId: book.id,
                          reason: feedbackByBook[book.id] || "Livro devolvido pela coordenacao para ajustes.",
                          score,
                        });
                      }}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aprovados aguardando editor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {readyToPublish.length === 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-slate-600">
                Nenhum livro aprovado aguardando editor.
              </p>
            ) : (
              readyToPublish.map((book) => (
                <div key={book.id} className="flex flex-col justify-between gap-4 rounded-lg border p-4 md:flex-row md:items-center">
                  <div>
                    <h3 className="font-semibold text-slate-950">{book.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{book.wordCount ?? 0} palavras</p>
                  </div>
                  <Button variant="outline" asChild>
                    <a href={`/books/${book.id}/pages`}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver paginas
                    </a>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
