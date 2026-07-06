import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buildStudentInsights, formatLastAccess, formatScore, isWeekend } from "@/lib/insights";
import { SCHOOL_OPTIONS, type SchoolFilter, getSchoolLabel, matchesSchool, normalizeSchoolId } from "@/lib/schools";
import { trpc } from "@/lib/trpc";
import { AlertCircle, BookOpen, CheckCircle, Eye, Gauge, TrendingUp, UserCheck, Users, Wifi } from "lucide-react";
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

export default function DashboardEducator() {
  const { loading } = useAuth();
  const utils = trpc.useUtils();
  const [feedbackByBook, setFeedbackByBook] = useState<Record<number, string>>({});
  const [scoreByBook, setScoreByBook] = useState<Record<number, string>>({});
  const [now, setNow] = useState(() => new Date());
  const { data: rawBooks = [], isLoading } = trpc.books.listBooks.useQuery(undefined, { refetchInterval: 30_000 });
  const { data: rawStudents = [] } = trpc.users.listStudents.useQuery(undefined, { refetchInterval: 15_000 });
  const { data: rawEvaluations = [] } = trpc.evaluations.listEvaluations.useQuery(undefined, { refetchInterval: 30_000 });
  const { data: profile } = trpc.users.getProfile.useQuery();

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  const effectiveSchoolFilter = String(normalizeSchoolId(profile?.schoolId)) as SchoolFilter;
  const availableSchoolOptions = SCHOOL_OPTIONS.filter((school) => school.id === normalizeSchoolId(profile?.schoolId));

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

  const submittedBooks = books.filter((book) => book.status === "submitted");
  const reviewedBooks = books.filter((book) => ["under_review", "approved", "published"].includes(book.status));
  const scoredStudents = studentInsights.filter((item) => item.avgScore !== null);
  const averageScore = scoredStudents.length
    ? scoredStudents.reduce((sum, item) => sum + (item.avgScore ?? 0), 0) / scoredStudents.length
    : null;
  const onlineStudents = studentInsights.filter((item) => item.online);
  const accessedToday = studentInsights.filter((item) => item.accessedToday);
  const needAccessToday = studentInsights.filter((item) => item.dailyAccess.required && !item.dailyAccess.ok);
  const attentionStudents = studentInsights.filter((item) => item.needsAttention).slice(0, 6);

  const approveMutation = trpc.publications.approveForCoordinator.useMutation({
    onSuccess: async () => {
      toast.success("Livro enviado para analise da coordenacao.");
      await utils.books.listBooks.invalidate();
      await utils.evaluations.listEvaluations.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const changesMutation = trpc.publications.requestChanges.useMutation({
    onSuccess: async () => {
      toast.success("Livro devolvido para revisao do aluno.");
      await utils.books.listBooks.invalidate();
      await utils.evaluations.listEvaluations.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  if (loading) {
    return <DashboardLayout>Carregando...</DashboardLayout>;
  }

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
          <h1 className="text-4xl font-bold text-slate-950">Painel do Educador</h1>
          <p className="mt-2 text-slate-600">
            Acompanhe acesso, desempenho, notas e producoes dos alunos antes da revisao final.
          </p>
          <div className="mt-4 w-full max-w-xs">
            <Select value={effectiveSchoolFilter} disabled>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableSchoolOptions.map((school) => (
                  <SelectItem key={school.id} value={String(school.id)}>
                    {school.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-slate-500">Educador vinculado a {getSchoolLabel(effectiveSchoolFilter)}.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          {[
            { label: "Pendentes", value: submittedBooks.length, icon: AlertCircle, color: "text-amber-600" },
            { label: "Online agora", value: onlineStudents.length, icon: Wifi, color: "text-emerald-700" },
            { label: "Acessaram hoje", value: accessedToday.length, icon: UserCheck, color: "text-sky-700" },
            { label: "Media da turma", value: formatScore(averageScore), icon: Gauge, color: "text-emerald-700" },
            { label: "Alunos", value: students.length, icon: Users, color: "text-slate-700" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="flex items-center justify-between pt-6">
                  <div>
                    <p className="text-sm text-slate-600">{stat.label}</p>
                    <p className="mt-1 text-3xl font-bold text-slate-950">{stat.value}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${stat.color}`} />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Acesso obrigatorio</CardTitle>
              <Badge variant="outline">{isWeekend(now) ? "Fim de semana" : "Segunda a sexta"}</Badge>
            </CardHeader>
            <CardContent>
              {isWeekend(now) ? (
                <p className="rounded-lg border border-dashed p-5 text-sm text-slate-600">
                  Hoje nao conta como dia obrigatorio. O acompanhamento volta automaticamente no proximo dia letivo.
                </p>
              ) : needAccessToday.length === 0 ? (
                <p className="rounded-lg border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-800">
                  Todos os alunos acompanhados ja acessaram a plataforma hoje.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {needAccessToday.slice(0, 8).map((item) => (
                    <div key={item.student.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="font-medium text-slate-950">{item.student.name}</p>
                      <p className="mt-1 text-sm text-slate-600">Ultimo acesso: {formatLastAccess(item.lastActivity)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alunos em atencao</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {attentionStudents.length === 0 ? (
                <p className="rounded-lg border border-dashed p-5 text-sm text-slate-600">
                  Nenhum alerta critico neste momento.
                </p>
              ) : (
                attentionStudents.map((item) => (
                  <div key={item.student.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-slate-950">{item.student.name}</p>
                      <p className="text-sm text-slate-600">
                        Nota media {formatScore(item.avgScore)} - {item.dailyAccess.label}
                      </p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-amber-600" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alunos sob responsabilidade</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {students.length === 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-slate-600 md:col-span-2 xl:col-span-3">
                Nenhum aluno vinculado ainda.
              </p>
            ) : (
              studentInsights.map((item) => (
                <div key={item.student.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{item.student.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.student.email}</p>
                    </div>
                    <Badge className={item.online ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}>
                      {item.online ? "Online" : "Offline"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">Turma {item.student.className || "sem turma"}</Badge>
                    <Badge className={item.dailyAccess.className}>{item.dailyAccess.label}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-slate-500">Nota media</p>
                      <p className="text-xl font-bold text-slate-950">{formatScore(item.avgScore)}</p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-slate-500">Paginas</p>
                      <p className="text-xl font-bold text-slate-950">{item.totalPages}</p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-slate-500">Livros</p>
                      <p className="text-xl font-bold text-slate-950">{item.totalBooks}</p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-slate-500">Publicados</p>
                      <p className="text-xl font-bold text-slate-950">{item.publishedBooks}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Ultima atividade: {formatLastAccess(item.lastActivity)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trabalhos enviados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-slate-600">Carregando producoes...</p>
            ) : submittedBooks.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 font-medium text-slate-800">Nenhum livro aguardando revisao.</p>
                <p className="mt-1 text-sm text-slate-600">Quando alunos enviarem livros, eles aparecem aqui.</p>
              </div>
            ) : (
              submittedBooks.map((book) => (
                <div key={book.id} className="rounded-lg border p-4">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-950">{book.title}</h3>
                        <Badge variant="outline">{statusLabels[book.status]}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{book.description || "Sem descricao."}</p>
                      <p className="mt-2 text-sm text-emerald-700">
                        Ao abrir, corrija as paginas com status Enviado. As paginas ja corrigidas aparecem como referencia.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/books/${book.id}/pages`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver paginas
                      </a>
                    </Button>
                  </div>

                  <Textarea
                    className="mt-4"
                    placeholder="Feedback para o aluno ou coordenacao..."
                    value={feedbackByBook[book.id] ?? ""}
                    onChange={(event) =>
                      setFeedbackByBook((current) => ({ ...current, [book.id]: event.target.value }))
                    }
                  />

                  <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr] md:items-end">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Nota 0 a 10</label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        placeholder="Ex.: 8.5"
                        value={scoreByBook[book.id] ?? ""}
                        onChange={(event) =>
                          setScoreByBook((current) => ({ ...current, [book.id]: event.target.value }))
                        }
                      />
                    </div>
                    <p className="text-sm text-slate-600">
                      A nota entra no historico pedagogico e nos relatorios mensais do editor.
                    </p>
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
                          feedback: feedbackByBook[book.id],
                          score,
                        });
                      }}
                    >
                      Aprovar para coordenacao
                    </Button>
                    <Button
                      variant="outline"
                      disabled={changesMutation.isPending}
                      onClick={() => {
                        const score = getValidatedScore(book.id);
                        if (score === null) return;
                        changesMutation.mutate({
                          bookId: book.id,
                          feedback: feedbackByBook[book.id] || "Revisar conforme orientacao do educador.",
                          score,
                        });
                      }}
                    >
                      Devolver revisao
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
