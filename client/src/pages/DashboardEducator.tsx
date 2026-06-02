import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertCircle, BookOpen, CheckCircle, Eye, Users } from "lucide-react";
import { useState } from "react";
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
  const { data: books = [], isLoading } = trpc.books.listBooks.useQuery();
  const { data: students = [] } = trpc.users.listStudents.useQuery();

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

  const submittedBooks = books.filter((book) => book.status === "submitted");
  const reviewedBooks = books.filter((book) => ["under_review", "approved", "published"].includes(book.status));

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
            Revise producoes, registre nota de 0 a 10 e encaminhe livros para a coordenacao.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Pendentes de revisao", value: submittedBooks.length, icon: AlertCircle, color: "text-amber-600" },
            { label: "Revisados", value: reviewedBooks.length, icon: CheckCircle, color: "text-emerald-700" },
            { label: "Alunos cadastrados", value: students.length, icon: Users, color: "text-sky-700" },
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
              students.map((student) => (
                <div key={student.id} className="rounded-lg border p-4">
                  <p className="font-semibold text-slate-950">{student.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{student.email}</p>
                  <Badge className="mt-3" variant="outline">
                    Turma {student.className || "sem turma"}
                  </Badge>
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
