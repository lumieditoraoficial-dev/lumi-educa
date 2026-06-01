import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Sparkles,
  Target,
  Trophy,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Enviado",
  under_review: "Em revisao",
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

export default function DashboardEditor() {
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
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

  useEffect(() => {
    localStorage.setItem(goalStorageKey, JSON.stringify(goals));
  }, [goals]);

  const students = useMemo(() => users.filter((user) => user.role === "student"), [users]);
  const editableBooks = books.filter((book) => ["under_review", "approved", "published"].includes(book.status));
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

  const getStudentName = (authorId: number) =>
    users.find((user) => user.id === authorId)?.name || `Aluno #${authorId}`;

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
      `${pages} paginas registradas contra meta semanal de ${goals.weeklyPages}.`,
      `${words} palavras no documento contra meta mensal de ${goals.monthlyWords}.`,
      averageScore === null
        ? "Ainda nao ha nota humana suficiente; a IA marcou risco pedagogico moderado."
        : `Media humana atual de ${averageScore.toFixed(1)} foi considerada no calculo.`,
      book.status === "published"
        ? "Livro publicado: fluxo editorial completo."
        : book.status === "approved"
          ? "Livro aprovado: pronto para publicacao e acabamento."
          : "Livro ainda em revisao: precisa de validacao final antes de publicar.",
    ];

    return { score, reasons };
  };

  const monthlyBooks = books.filter((book) => isThisMonth(book.updatedAt ?? book.createdAt));
  const monthlyEvaluationScores = evaluations
    .filter((evaluation) => isThisMonth(evaluation.updatedAt ?? evaluation.createdAt))
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
      const studentBooks = books.filter((book) => book.authorId === student.id);
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
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-emerald-50 text-sm font-semibold text-emerald-800">
      {avatarUrl ? <img src={avatarUrl} alt={name} className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
    </div>
  );

  const selectedInsight = selectedBook ? getAiInsight(selectedBook) : null;
  const selectedAverageScore = selectedBook ? getAverageScore(selectedBook.id) : null;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-950">Painel do Editor</h1>
          <p className="mt-2 text-slate-600">
            Revise layout, acompanhe desempenho, receba relatorios mensais e defina metas de producao.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Fila editorial", value: editableBooks.length, icon: FileText },
            { label: "Aprovados", value: books.filter((book) => book.status === "approved").length, icon: CheckCircle2 },
            { label: "Publicados", value: books.filter((book) => book.status === "published").length, icon: BookMarked },
            { label: "Media do mes", value: monthlyReport.averageScore?.toFixed(1) ?? "-", icon: Award },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label}>
                <CardContent className="flex items-center justify-between pt-6">
                  <div>
                    <p className="text-sm text-slate-600">{item.label}</p>
                    <p className="mt-1 text-3xl font-bold text-slate-950">{item.value}</p>
                  </div>
                  <Icon className="h-8 w-8 text-emerald-700" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-emerald-700" />
                Relatorio mensal - {monthLabel()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: "Livros movimentados", value: monthlyReport.books },
                  { label: "Paginas escritas", value: monthlyReport.pages },
                  { label: "Palavras", value: monthlyReport.words },
                  { label: "Publicados", value: monthlyReport.published },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border bg-slate-50 p-4">
                    <p className="text-sm text-slate-600">{item.label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-emerald-700" />
                Metas editoriais
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Paginas por semana</span>
                <Input
                  type="number"
                  min={0}
                  value={goals.weeklyPages}
                  onChange={(event) => updateGoal("weeklyPages", event.target.value)}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Palavras por mes</span>
                <Input
                  type="number"
                  min={0}
                  value={goals.monthlyWords}
                  onChange={(event) => updateGoal("monthlyWords", event.target.value)}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Nota minima esperada</span>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-600" />
              Melhor desempenho dos alunos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {performance.length === 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-slate-600">
                Ainda nao ha alunos com producao suficiente para ranking.
              </p>
            ) : (
              performance.slice(0, 8).map((student, index) => (
                <div key={student.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">
                      {index + 1}
                    </div>
                    {renderAvatar(student.name, student.avatarUrl)}
                    <div>
                      <p className="font-semibold text-slate-950">{student.name}</p>
                      <p className="text-sm text-slate-600">
                        {student.books} livros, {student.pageCount} paginas, {student.wordCount} palavras
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{student.goalsHit}/3 metas batidas</Badge>
                    <Badge variant="outline">Media {student.averageScore?.toFixed(1) ?? "-"}</Badge>
                    <Badge variant="outline">{student.published} publicados</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader>
              <CardTitle>Livros para preparacao editorial</CardTitle>
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
                      className={`rounded-lg border p-4 ${selectedBook?.id === book.id ? "border-emerald-500 bg-emerald-50/50" : ""}`}
                    >
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="font-semibold text-slate-950">{book.title}</h3>
                            <Badge variant="secondary">{statusLabels[book.status] ?? book.status}</Badge>
                            <Badge variant="outline">IA {insight.score.toFixed(1)}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">{book.description || "Sem descricao cadastrada."}</p>
                          <p className="mt-2 text-sm text-slate-600">
                            Autor: {getStudentName(book.authorId)} | Nota humana: {averageScore?.toFixed(1) ?? "-"} |{" "}
                            {numberValue(book.pageCount)} paginas
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
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-700" />
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
                  <div className="rounded-lg border bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm text-slate-600">Livro selecionado</p>
                        <h3 className="text-2xl font-bold text-slate-950">{selectedBook.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">Autor: {getStudentName(selectedBook.authorId)}</p>
                      </div>
                      <div className="rounded-lg bg-white p-4 text-center shadow-sm">
                        <p className="text-sm text-slate-600">Nota IA</p>
                        <p className="text-3xl font-bold text-emerald-700">{selectedInsight.score.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 flex items-center gap-2 font-semibold text-slate-950">
                      <BarChart3 className="h-4 w-4 text-emerald-700" />
                      Por que a IA deu essa nota
                    </h4>
                    <div className="space-y-2">
                      {selectedInsight.reasons.map((reason) => (
                        <div key={reason} className="rounded-lg border p-3 text-sm text-slate-700">
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
                        { label: "Paginas suficientes", ok: numberValue(selectedBook.pageCount) >= goals.weeklyPages },
                        { label: "Nota dentro da meta", ok: (selectedAverageScore ?? selectedInsight.score) >= goals.minimumScore },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className={`rounded-lg border p-3 text-sm ${
                            item.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"
                          }`}
                        >
                          {item.ok ? "OK" : "Ajustar"} - {item.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild className="bg-emerald-700 hover:bg-emerald-800">
                      <a href={selectedBook.status === "published" ? `/library/book/${selectedBook.id}` : `/books/${selectedBook.id}/pages`}>
                        Abrir documento
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a href={`/books/${selectedBook.id}/pages`}>Ver paginas do livro</a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a href={`/api/books/${selectedBook.id}/pdf`}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Baixar PDF
                      </a>
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
