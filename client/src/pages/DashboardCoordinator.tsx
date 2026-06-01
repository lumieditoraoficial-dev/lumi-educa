import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { BarChart3, BookOpen, CheckCircle, Eye, Send, Users, XCircle } from "lucide-react";
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

export default function DashboardCoordinator() {
  const utils = trpc.useUtils();
  const [feedbackByBook, setFeedbackByBook] = useState<Record<number, string>>({});
  const [scoreByBook, setScoreByBook] = useState<Record<number, string>>({});
  const { data: books = [], isLoading } = trpc.books.listBooks.useQuery();
  const { data: students = [] } = trpc.users.listStudents.useQuery();

  const approveMutation = trpc.publications.approveForPublication.useMutation({
    onSuccess: async () => {
      toast.success("Livro aprovado para publicacao.");
      await utils.books.listBooks.invalidate();
      await utils.evaluations.listEvaluations.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const publishMutation = trpc.publications.publishBook.useMutation({
    onSuccess: async () => {
      toast.success("Livro publicado na biblioteca digital.");
      await utils.books.listBooks.invalidate();
      await utils.library.getPublishedBooks.invalidate();
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

  const pendingApproval = books.filter((book) => book.status === "under_review");
  const readyToPublish = books.filter((book) => book.status === "approved");
  const published = books.filter((book) => book.status === "published");

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
            Aprove obras, registre nota final de 0 a 10, publique livros e acompanhe indicadores gerais.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Alunos", value: students.length, icon: Users },
            { label: "Livros", value: books.length, icon: BookOpen },
            { label: "Aprovacoes pendentes", value: pendingApproval.length, icon: CheckCircle },
            { label: "Publicados", value: published.length, icon: BarChart3 },
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
            <CardTitle>Prontos para publicacao</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {readyToPublish.length === 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-slate-600">
                Nenhum livro aprovado aguardando publicacao.
              </p>
            ) : (
              readyToPublish.map((book) => (
                <div key={book.id} className="flex flex-col justify-between gap-4 rounded-lg border p-4 md:flex-row md:items-center">
                  <div>
                    <h3 className="font-semibold text-slate-950">{book.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{book.wordCount ?? 0} palavras</p>
                  </div>
                  <Button
                    className="bg-emerald-700 hover:bg-emerald-800"
                    disabled={publishMutation.isPending}
                    onClick={() => publishMutation.mutate({ bookId: book.id })}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Publicar
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
