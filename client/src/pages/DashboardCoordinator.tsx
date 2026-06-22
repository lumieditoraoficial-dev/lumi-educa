import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buildClassInsights, buildStudentInsights, formatLastAccess, formatScore, isWeekend, toDate } from "@/lib/insights";
import { ALL_SCHOOLS, SCHOOL_OPTIONS, type SchoolFilter, matchesSchool } from "@/lib/schools";
import { trpc } from "@/lib/trpc";
import { Activity, AlertTriangle, BarChart3, BookOpen, CheckCircle, Eye, TrendingUp, Users, Wifi, XCircle } from "lucide-react";
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
  const [schoolFilter, setSchoolFilter] = useState<SchoolFilter>(ALL_SCHOOLS);
  const [now, setNow] = useState(() => new Date());
  const { data: rawBooks = [], isLoading } = trpc.books.listBooks.useQuery(undefined, { refetchInterval: 30_000 });
  const { data: rawStudents = [] } = trpc.users.listStudents.useQuery(undefined, { refetchInterval: 15_000 });
  const { data: rawEvaluations = [] } = trpc.evaluations.listEvaluations.useQuery(undefined, { refetchInterval: 30_000 });

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  const students = useMemo(
    () => rawStudents.filter((student) => matchesSchool(student.schoolId, schoolFilter)),
    [rawStudents, schoolFilter]
  );
  const studentById = useMemo(() => new Map(rawStudents.map((student) => [student.id, student])), [rawStudents]);
  const books = useMemo(
    () => rawBooks.filter((book) => matchesSchool(studentById.get(book.authorId)?.schoolId, schoolFilter)),
    [rawBooks, studentById, schoolFilter]
  );
  const bookIds = useMemo(() => new Set(books.map((book) => book.id)), [books]);
  const evaluations = useMemo(
    () => rawEvaluations.filter((evaluation) => bookIds.has(evaluation.bookId)),
    [rawEvaluations, bookIds]
  );

  const studentInsights = useMemo(() => buildStudentInsights(students, books, evaluations, now), [students, books, evaluations, now]);
  const classInsights = useMemo(() => buildClassInsights(studentInsights), [studentInsights]);

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
            Monitore turmas, acesso diario, desempenho pedagogico e fluxo de aprovacao das obras.
          </p>
          <div className="mt-4 w-full max-w-xs">
            <Select value={schoolFilter} onValueChange={(value: SchoolFilter) => setSchoolFilter(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SCHOOLS}>Todas as escolas</SelectItem>
                {SCHOOL_OPTIONS.map((school) => (
                  <SelectItem key={school.id} value={String(school.id)}>
                    {school.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                  <div key={item.className} className="rounded-lg border p-4">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div>
                        <p className="font-semibold text-slate-950">{item.className}</p>
                        <p className="text-sm text-slate-600">
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
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle>Acesso do dia</CardTitle>
                <Badge variant="outline">{isWeekend(now) ? "Sem cobranca" : "Obrigatorio"}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {isWeekend(now) ? (
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
