import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_SCHOOLS, SCHOOL_OPTIONS, type SchoolFilter, getSchoolLabel, matchesSchool, normalizeSchoolId } from "@/lib/schools";
import { useSelectedSchoolFilter } from "@/lib/selectedSchool";
import { trpc } from "@/lib/trpc";
import {
  Award,
  BarChart3,
  BookMarked,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Eye,
  FileDown,
  FileCheck2,
  FileText,
  ImageUp,
  Send,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Users,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Enviado",
  under_review: "Em revisão",
  approved: "Aprovado",
  published: "Publicado",
  rejected: "Rejeitado",
};

const goalStorageKey = "lumi-editor-goals";
const defaultGoals = {
  weeklyPages: 5,
  monthlyWords: 1500,
  minimumScore: 7,
};

type EditorGoals = typeof defaultGoals;

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthLabel() {
  return new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function isThisMonth(value: unknown) {
  const date = new Date(String(value ?? Date.now()));
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function clamp(value: number, min = 0, max = 10) {
  return Math.min(max, Math.max(min, value));
}

function readCover(file: File, onLoad: (value: string) => void) {
  if (file.size > 2_500_000) {
    toast.error("Use uma capa com até 2,5 MB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => onLoad(String(reader.result ?? ""));
  reader.onerror = () => toast.error("Não foi possível carregar a capa.");
  reader.readAsDataURL(file);
}

export default function DashboardEditor() {
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const { schoolFilter, setSchoolFilter } = useSelectedSchoolFilter();
  const [goals, setGoals] = useState<EditorGoals>(() => {
    try {
      const saved = localStorage.getItem(goalStorageKey);
      return saved ? { ...defaultGoals, ...JSON.parse(saved) } : defaultGoals;
    } catch {
      return defaultGoals;
    }
  });

  const { data: books = [], isLoading } = trpc.books.listBooks.useQuery();
  const { data: users = [] } = trpc.users.listUsers.useQuery();
  const { data: evaluations = [] } = trpc.evaluations.listEvaluations.useQuery();
  const utils = trpc.useUtils();

  const updateBookMutation = trpc.books.updateBookDetails.useMutation({
    onSuccess: async () => {
      toast.success("Livro atualizado.");
      await utils.books.listBooks.invalidate();
      await utils.library.getPublishedBooks.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteBookMutation = trpc.books.deleteBook.useMutation({
    onSuccess: async () => {
      toast.success("Livro removido.");
      await utils.books.listBooks.invalidate();
      await utils.library.getPublishedBooks.invalidate();
      setSelectedBookId(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const publishMutation = trpc.publications.publishBook.useMutation({
    onSuccess: async () => {
      toast.success("Livro publicado na biblioteca.");
      await utils.books.listBooks.invalidate();
      await utils.library.getPublishedBooks.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const assignStudentMutation = trpc.users.assignStudent.useMutation({
    onSuccess: async () => {
      toast.success("Aluno designado.");
      await utils.users.listUsers.invalidate();
      await utils.books.listBooks.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    localStorage.setItem(goalStorageKey, JSON.stringify(goals));
  }, [goals]);

  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const students = useMemo(
    () => users.filter((user) => user.role === "student" && matchesSchool(user.schoolId, schoolFilter)),
    [users, schoolFilter]
  );
  const educators = useMemo(
    () => users.filter((user) => user.role === "educator" && matchesSchool(user.schoolId, schoolFilter)),
    [users, schoolFilter]
  );
  const visibleBooks = useMemo(
    () => books.filter((book) => matchesSchool(userById.get(book.authorId)?.schoolId, schoolFilter)),
    [books, userById, schoolFilter]
  );
  const visibleBookIds = useMemo(() => new Set(visibleBooks.map((book) => book.id)), [visibleBooks]);
  const editableBooks = visibleBooks.filter((book) => ["under_review", "approved", "published"].includes(book.status));
  const selectedBook = editableBooks.find((book) => book.id === selectedBookId) ?? editableBooks[0] ?? null;

  const evaluationsByBook = useMemo(() => {
    const grouped = new Map<number, typeof evaluations>();
    for (const evaluation of evaluations) {
      const list = grouped.get(evaluation.bookId) ?? [];
      list.push(evaluation);
      grouped.set(evaluation.bookId, list);
    }
    return grouped;
  }, [evaluations]);

  const getAverageScore = (bookId: number) => {
    const list = evaluationsByBook.get(bookId) ?? [];
    const validScores = list.map((evaluation) => numberValue(evaluation.score)).filter((score) => score > 0);
    if (validScores.length === 0) return null;
    return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  };

  const getStudentName = (authorId: number) => userById.get(authorId)?.name || `Aluno #${authorId}`;

  const getEducatorName = (educatorId?: number | null) =>
    educators.find((educator) => educator.id === educatorId)?.name || "Sem educador";

  const getAiInsight = (book: (typeof books)[number]) => {
    const pages = numberValue(book.pageCount);
    const words = numberValue(book.wordCount);
    const averageScore = getAverageScore(book.id);
    const statusBonus =
      book.status === "published" ? 1.1 : book.status === "approved" ? 0.8 : book.status === "under_review" ? 0.4 : 0;
    const pagesScore = Math.min(pages / Math.max(goals.weeklyPages, 1), 1) * 1.6;
    const wordsScore = Math.min(words / Math.max(goals.monthlyWords, 1), 1) * 1.8;
    const humanScore = averageScore === null ? 0.5 : (averageScore - 5) * 0.3;
    const score = clamp(4.8 + pagesScore + wordsScore + statusBonus + humanScore);

    const reasons = [
      `${pages} páginas registradas contra meta semanal de ${goals.weeklyPages}.`,
      `${words} palavras no documento contra meta mensal de ${goals.monthlyWords}.`,
      averageScore === null
        ? "Ainda não há nota humana suficiente; a IA marcou risco pedagógico moderado."
        : `Média humana atual de ${averageScore.toFixed(1)} foi considerada no cálculo.`,
      book.status === "published"
        ? "Livro publicado: fluxo editorial completo."
        : book.status === "approved"
          ? "Livro aprovado: pronto para publicacao e acabamento."
          : "Livro ainda em revisão: precisa de validação final antes de publicar.",
    ];

    return { score, reasons };
  };

  const monthlyBooks = visibleBooks.filter((book) => isThisMonth(book.updatedAt ?? book.createdAt));
  const monthlyEvaluationScores = evaluations
    .filter((evaluation) => visibleBookIds.has(evaluation.bookId) && isThisMonth(evaluation.updatedAt ?? evaluation.createdAt))
    .map((evaluation) => numberValue(evaluation.score))
    .filter((score) => score > 0);

  const monthlyReport = {
    books: monthlyBooks.length,
    pages: monthlyBooks.reduce((sum, book) => sum + numberValue(book.pageCount), 0),
    words: monthlyBooks.reduce((sum, book) => sum + numberValue(book.wordCount), 0),
    published: monthlyBooks.filter((book) => book.status === "published").length,
    averageScore:
      monthlyEvaluationScores.length === 0
        ? null
        : monthlyEvaluationScores.reduce((sum, score) => sum + score, 0) / monthlyEvaluationScores.length,
  };

  const performance = students
    .map((student) => {
      const studentBooks = visibleBooks.filter((book) => book.authorId === student.id);
      const studentScores = studentBooks
        .flatMap((book) => evaluationsByBook.get(book.id) ?? [])
        .map((evaluation) => numberValue(evaluation.score))
        .filter((score) => score > 0);
      const averageScore =
        studentScores.length === 0 ? null : studentScores.reduce((sum, score) => sum + score, 0) / studentScores.length;
      const pageCount = studentBooks.reduce((sum, book) => sum + numberValue(book.pageCount), 0);
      const wordCount = studentBooks.reduce((sum, book) => sum + numberValue(book.wordCount), 0);
      const goalsHit = [
        pageCount >= goals.weeklyPages,
        wordCount >= goals.monthlyWords,
        averageScore !== null && averageScore >= goals.minimumScore,
      ].filter(Boolean).length;

      return {
        id: student.id,
        name: student.name || "Aluno",
        avatarUrl: student.avatarUrl,
        books: studentBooks.length,
        pageCount,
        wordCount,
        published: studentBooks.filter((book) => book.status === "published").length,
        averageScore,
        goalsHit,
      };
    })
    .sort((a, b) => {
      if (b.goalsHit !== a.goalsHit) return b.goalsHit - a.goalsHit;
      return (b.averageScore ?? 0) - (a.averageScore ?? 0);
    });

  const updateGoal = (key: keyof EditorGoals, value: string) => {
    setGoals((current) => ({
      ...current,
      [key]: Math.max(0, Number(value) || 0),
    }));
  };

  const renderAvatar = (name: string, avatarUrl?: string | null) => (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#F4C430]/40 bg-[#fff8d7] text-sm font-bold text-[#0F3D2E] shadow-sm">
      {avatarUrl ? <img src={avatarUrl} alt={name} className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
    </div>
  );

  const selectedInsight = selectedBook ? getAiInsight(selectedBook) : null;
  const selectedAverageScore = selectedBook ? getAverageScore(selectedBook.id) : null;
  const monthlyReportUrl =
    schoolFilter === ALL_SCHOOLS ? "/api/reports/monthly.pdf" : `/api/reports/monthly.pdf?schoolId=${schoolFilter}`;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="lumi-highlight-panel rounded-xl p-6 text-white shadow-xl">
          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <Badge className="mb-4 border border-[#F4C430]/35 bg-[#F4C430]/18 px-3 py-1 text-[#F4C430] hover:bg-[#F4C430]/18">
                {schoolFilter === ALL_SCHOOLS ? "Todas as escolas" : getSchoolLabel(schoolFilter)}
              </Badge>
              <h1 className="text-4xl font-bold tracking-normal md:text-5xl">Painel do Editor</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-white/78">
                Revise layout, acompanhe desempenho, receba relatórios mensais e transforme produções aprovadas em livros prontos para a biblioteca.
              </p>
            </div>
            <div className="grid w-full max-w-md gap-3">
              <Select value={schoolFilter} onValueChange={(value: SchoolFilter) => setSchoolFilter(value)}>
                <SelectTrigger className="border-white/20 bg-white/12 text-white">
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/16 bg-white/10 p-4 backdrop-blur">
                  <p className="text-sm text-white/65">Fila editorial</p>
                  <p className="mt-1 text-3xl font-bold text-white">{editableBooks.length}</p>
                </div>
                <div className="rounded-lg border border-[#F4C430]/26 bg-[#F4C430]/16 p-4 backdrop-blur">
                  <p className="text-sm text-[#F4C430]/85">Publicados</p>
                  <p className="mt-1 text-3xl font-bold text-white">{visibleBooks.filter((book) => book.status === "published").length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Fila editorial", value: editableBooks.length, icon: FileText },
            { label: "Aprovados", value: visibleBooks.filter((book) => book.status === "approved").length, icon: CheckCircle2 },
            { label: "Publicados", value: visibleBooks.filter((book) => book.status === "published").length, icon: BookMarked },
            { label: "Média do mês", value: monthlyReport.averageScore?.toFixed(1) ?? "-", icon: Award },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="lumi-stat-card rounded-lg">
                <CardContent className="flex items-center justify-between pt-6">
                  <div>
                    <p className="text-sm text-slate-600">{item.label}</p>
                    <p className="mt-1 text-3xl font-bold text-slate-950">{item.value}</p>
                  </div>
                  <Icon className="h-8 w-8 text-[#266B3D]" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="lumi-surface-card rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-[#266B3D]" />
                Relatório mensal - {monthLabel()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: "Livros movimentados", value: monthlyReport.books },
                  { label: "Páginas escritas", value: monthlyReport.pages },
                  { label: "Palavras", value: monthlyReport.words },
                  { label: "Publicados", value: monthlyReport.published },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-[#0F3D2E]/10 bg-[#F8F7EB] p-4">
                    <p className="text-sm text-slate-600">{item.label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <a href={monthlyReportUrl}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Baixar PDF mensal
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="lumi-surface-card rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-[#F4C430]" />
                Metas editoriais
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Páginas por semana</span>
                <Input
                  type="number"
                  min={0}
                  value={goals.weeklyPages}
                  onChange={(event) => updateGoal("weeklyPages", event.target.value)}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Palavras por mês</span>
                <Input
                  type="number"
                  min={0}
                  value={goals.monthlyWords}
                  onChange={(event) => updateGoal("monthlyWords", event.target.value)}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Nota mínima esperada</span>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={goals.minimumScore}
                  onChange={(event) => updateGoal("minimumScore", event.target.value)}
                />
              </label>
            </CardContent>
          </Card>
        </div>

        <Card className="lumi-surface-card rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#266B3D]" />
              Designar alunos para educadores e turmas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {students.length === 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-slate-600">
                Nenhum aluno cadastrado para designar.
              </p>
            ) : (
              students.map((student) => (
                <div key={student.id} className="grid gap-3 rounded-lg border border-[#0F3D2E]/10 bg-white/72 p-4 transition hover:border-[#F4C430]/60 hover:shadow-sm lg:grid-cols-[1.2fr_0.9fr_0.9fr_auto] lg:items-center">
                  <div className="flex items-center gap-3">
                    {renderAvatar(student.name || "Aluno", student.avatarUrl)}
                    <div>
                      <p className="font-semibold text-slate-950">{student.name}</p>
                      <p className="text-sm text-slate-600">
                        {student.email} | {getSchoolLabel(student.schoolId)} | {student.className || "Sem turma"} |{" "}
                        {getEducatorName(student.assignedEducatorId)}
                      </p>
                    </div>
                  </div>
                  <Select
                    defaultValue={student.assignedEducatorId ? String(student.assignedEducatorId) : "none"}
                    onValueChange={(value) =>
                      assignStudentMutation.mutate({
                        studentId: student.id,
                        educatorId: value === "none" ? null : Number(value),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Educador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem educador</SelectItem>
                      {educators
                        .filter((educator) => normalizeSchoolId(educator.schoolId) === normalizeSchoolId(student.schoolId))
                        .map((educator) => (
                          <SelectItem key={educator.id} value={String(educator.id)}>
                            {educator.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input
                    defaultValue={student.className ?? ""}
                    placeholder="Turma"
                    onBlur={(event) =>
                      assignStudentMutation.mutate({
                        studentId: student.id,
                        className: event.target.value.trim() || null,
                      })
                    }
                  />
                  <Button variant="outline" asChild>
                    <a href={`/api/reports/student/${student.id}.pdf`}>
                      <FileDown className="mr-2 h-4 w-4" />
                      PDF
                    </a>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lumi-surface-card rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-600" />
              Melhor desempenho dos alunos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {performance.length === 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-slate-600">
                Ainda não há alunos com produção suficiente para ranking.
              </p>
            ) : (
              performance.slice(0, 8).map((student, index) => (
                <div key={student.id} className="flex flex-col gap-3 rounded-lg border border-[#0F3D2E]/10 bg-white/72 p-4 transition hover:border-[#266B3D]/35 hover:shadow-sm md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4C430] text-sm font-bold text-[#0F3D2E] shadow-sm">
                      {index + 1}
                    </div>
                    {renderAvatar(student.name, student.avatarUrl)}
                    <div>
                      <p className="font-semibold text-slate-950">{student.name}</p>
                      <p className="text-sm text-slate-600">
                        {student.books} livros, {student.pageCount} páginas, {student.wordCount} palavras
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{student.goalsHit}/3 metas batidas</Badge>
                    <Badge variant="outline">Média {student.averageScore?.toFixed(1) ?? "-"}</Badge>
                    <Badge variant="outline">{student.published} publicados</Badge>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/api/reports/student/${student.id}.pdf`}>
                        <FileDown className="mr-2 h-4 w-4" />
                        PDF
                      </a>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="lumi-surface-card rounded-lg">
            <CardHeader>
              <CardTitle>Livros para preparação editorial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <p className="text-slate-600">Carregando livros...</p>
              ) : editableBooks.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Wand2 className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 font-medium text-slate-800">Nenhum livro na fila editorial.</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Quando educadores e coordenadores aprovarem obras, elas aparecem aqui.
                  </p>
                </div>
              ) : (
                editableBooks.map((book) => {
                  const insight = getAiInsight(book);
                  const averageScore = getAverageScore(book.id);
                  return (
                    <div
                      key={book.id}
                      className={`rounded-lg border p-4 transition hover:shadow-sm ${
                        selectedBook?.id === book.id ? "border-[#F4C430] bg-[#fff8d7]" : "border-[#0F3D2E]/10 bg-white/78 hover:border-[#266B3D]/35"
                      }`}
                    >
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="font-semibold text-slate-950">{book.title}</h3>
                            <Badge variant="secondary">{statusLabels[book.status] ?? book.status}</Badge>
                            <Badge className="bg-[#266B3D] text-white hover:bg-[#266B3D]">IA {insight.score.toFixed(1)}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">{book.description || "Sem descrição cadastrada."}</p>
                          <p className="mt-2 text-sm text-slate-600">
                            Autor: {getStudentName(book.authorId)} | Nota humana: {averageScore?.toFixed(1) ?? "-"} |{" "}
                            {numberValue(book.pageCount)} páginas
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" onClick={() => setSelectedBookId(book.id)}>
                            <FileCheck2 className="mr-2 h-4 w-4" />
                            Revisar layout
                          </Button>
                          <Button variant="outline" asChild>
                            <a href={book.status === "published" ? `/library/book/${book.id}` : `/books/${book.id}/pages`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Abrir
                            </a>
                          </Button>
                          <Button variant="outline" asChild>
                            <a href={`/api/books/${book.id}/pdf`}>
                              <FileDown className="mr-2 h-4 w-4" />
                              PDF
                            </a>
                          </Button>
                          <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-50">
                            <ImageUp className="h-4 w-4" />
                            Capa
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                  readCover(file, (coverImageUrl) => updateBookMutation.mutate({ bookId: book.id, coverImageUrl }));
                                }
                              }}
                            />
                          </label>
                          {book.status === "approved" ? (
                            <Button
                              className="bg-[#F4C430] font-semibold text-[#0F3D2E] hover:bg-[#ffdc3b]"
                              disabled={publishMutation.isPending}
                              onClick={() => publishMutation.mutate({ bookId: book.id })}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Publicar
                            </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            disabled={deleteBookMutation.isPending}
                            onClick={() => {
                              if (confirm("Remover este livro da biblioteca/fila editorial?")) {
                                deleteBookMutation.mutate({ bookId: book.id });
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="lumi-surface-card rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#266B3D]" />
                Revisor de layout e IA interna
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedBook || !selectedInsight ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 font-medium text-slate-800">Selecione um livro para revisar.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-lg border border-[#0F3D2E]/10 bg-[#F8F7EB] p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="flex gap-4">
                        {selectedBook.coverImageUrl ? (
                          <img
                            src={selectedBook.coverImageUrl}
                            alt={selectedBook.title}
                            className="h-28 w-20 rounded border object-cover shadow-sm"
                          />
                        ) : (
                          <div className="flex h-28 w-20 items-center justify-center rounded border bg-white text-xs text-slate-500">
                            Sem capa
                          </div>
                        )}
                        <div>
                        <p className="text-sm text-slate-600">Livro selecionado</p>
                        <h3 className="text-2xl font-bold text-slate-950">{selectedBook.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">Autor: {getStudentName(selectedBook.authorId)}</p>
                        <p className="mt-1 text-sm text-slate-600">Status: {statusLabels[selectedBook.status] ?? selectedBook.status}</p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-white p-4 text-center shadow-sm">
                        <p className="text-sm text-slate-600">Nota IA</p>
                        <p className="text-3xl font-bold text-[#266B3D]">{selectedInsight.score.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 flex items-center gap-2 font-semibold text-slate-950">
                      <BarChart3 className="h-4 w-4 text-[#266B3D]" />
                      Por que a IA deu essa nota
                    </h4>
                    <div className="space-y-2">
                      {selectedInsight.reasons.map((reason) => (
                        <div key={reason} className="rounded-lg border border-[#0F3D2E]/10 bg-white/72 p-3 text-sm leading-6 text-slate-700">
                          {reason}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 font-semibold text-slate-950">Checklist de layout editorial</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        { label: "Titulo definido", ok: Boolean(selectedBook.title) },
                        { label: "Descricao preenchida", ok: Boolean(selectedBook.description) },
                        { label: "Categoria informada", ok: Boolean(selectedBook.category) },
                        { label: "Capa cadastrada", ok: Boolean(selectedBook.coverImageUrl) },
                        { label: "Páginas suficientes", ok: numberValue(selectedBook.pageCount) >= goals.weeklyPages },
                        { label: "Nota dentro da meta", ok: (selectedAverageScore ?? selectedInsight.score) >= goals.minimumScore },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className={`rounded-lg border p-3 text-sm ${
                            item.ok ? "border-[#266B3D]/25 bg-[#eef7e8] text-[#0F3D2E]" : "border-[#F4C430]/45 bg-[#fff8d7] text-[#6B5400]"
                          }`}
                        >
                          {item.ok ? "OK" : "Ajustar"} - {item.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild className="bg-[#0F3D2E] font-semibold hover:bg-[#174f3d]">
                      <a href={selectedBook.status === "published" ? `/library/book/${selectedBook.id}` : `/books/${selectedBook.id}/pages`}>
                        Abrir documento
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a href={`/books/${selectedBook.id}/pages`}>Ver páginas do livro</a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a href={`/api/books/${selectedBook.id}/pdf`}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Baixar PDF
                      </a>
                    </Button>
                    <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-50">
                      <ImageUp className="h-4 w-4" />
                      Trocar capa
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            readCover(file, (coverImageUrl) =>
                              updateBookMutation.mutate({ bookId: selectedBook.id, coverImageUrl })
                            );
                          }
                        }}
                      />
                    </label>
                    {selectedBook.status === "approved" ? (
                      <Button
                        className="bg-[#F4C430] font-semibold text-[#0F3D2E] hover:bg-[#ffdc3b]"
                        disabled={publishMutation.isPending}
                        onClick={() => publishMutation.mutate({ bookId: selectedBook.id })}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Publicar na biblioteca
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      disabled={deleteBookMutation.isPending}
                      onClick={() => {
                        if (confirm("Remover este livro da biblioteca/fila editorial?")) {
                          deleteBookMutation.mutate({ bookId: selectedBook.id });
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                      Excluir livro
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
