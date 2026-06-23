import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertCircle, BookOpen, CheckCircle, Clock, MessageSquareText, Plus, Sparkles, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
  draft: { label: "Rascunho", variant: "secondary", icon: Clock },
  submitted: { label: "Enviado", variant: "default", icon: Clock },
  under_review: { label: "Em revisão", variant: "outline", icon: AlertCircle },
  approved: { label: "Aprovado", variant: "default", icon: CheckCircle },
  published: { label: "Publicado", variant: "default", icon: CheckCircle },
  rejected: { label: "Rejeitado", variant: "destructive", icon: AlertCircle },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.draft;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="flex w-fit items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function scoreLabel(score: unknown) {
  const value = Number(score);
  return Number.isFinite(value) ? value.toFixed(1) : "-";
}

export default function DashboardStudent() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [isCreatingBook, setIsCreatingBook] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookDescription, setNewBookDescription] = useState("");

  const { data: books = [], isLoading, refetch } = trpc.books.myBooks.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const { data: evaluations = [] } = trpc.evaluations.myEvaluations.useQuery(undefined, {
    enabled: Boolean(user?.role === "student"),
  });
  const validScores = evaluations.map((evaluation) => Number(evaluation.score)).filter((score) => Number.isFinite(score) && score > 0);
  const averageScore =
    validScores.length === 0 ? null : validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  const latestEvaluationByBook = useMemo(() => {
    const map = new Map<number, (typeof evaluations)[number]>();
    for (const evaluation of evaluations) {
      if (!map.has(evaluation.bookId)) map.set(evaluation.bookId, evaluation);
    }
    return map;
  }, [evaluations]);

  const createBookMutation = trpc.books.createBook.useMutation({
    onSuccess: async (book: any) => {
      toast.success("Livro criado. Agora voce pode continuar escrevendo.");
      setNewBookTitle("");
      setNewBookDescription("");
      setIsCreatingBook(false);
      await refetch();
      if (book?.id) {
        navigate(`/books/${book.id}/pages`);
      }
    },
    onError: (error) => toast.error(`Erro ao criar livro: ${error.message}`),
  });

  if (loading) {
    return <DashboardLayout>Carregando sua biblioteca...</DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="lumi-brazil-panel rounded-2xl p-6 text-white shadow-xl md:p-8">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_18rem] md:items-center">
            <div>
              <Badge className="bg-white/15 text-white hover:bg-white/20">Autoria jovem</Badge>
              <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Meus livros</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/82">
                Sua biblioteca de escrita, revisoes recebidas, metas e livros em andamento.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-white/85">
                <span className="rounded-full bg-white/12 px-3 py-1">Quebra de pagina</span>
                <span className="rounded-full bg-white/12 px-3 py-1">Imagens no texto</span>
                <span className="rounded-full bg-white/12 px-3 py-1">Envio de paginas novas</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-yellow-300 p-3 text-emerald-950">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-white/70">Proximo passo</p>
                  <p className="font-bold">Continuar escrevendo</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/75">Abra seu livro, continue o texto e salve novas versoes com seguranca.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Dialog open={isCreatingBook} onOpenChange={setIsCreatingBook}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-800 hover:bg-emerald-900">
                <Plus className="mr-2 h-4 w-4" />
                Novo livro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar novo livro</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Título do livro</label>
                  <Input
                    placeholder="Ex: Minha aventura mágica"
                    value={newBookTitle}
                    onChange={(event) => setNewBookTitle(event.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Descrição</label>
                  <Textarea
                    placeholder="Descreva a ideia do livro..."
                    value={newBookDescription}
                    onChange={(event) => setNewBookDescription(event.target.value)}
                    rows={3}
                  />
                </div>
                <Button
                  className="w-full bg-emerald-700 hover:bg-emerald-800"
                  disabled={createBookMutation.isPending}
                  onClick={() => {
                    if (!newBookTitle.trim()) {
                      toast.error("Digite um título para o livro.");
                      return;
                    }
                    createBookMutation.mutate({
                      title: newBookTitle.trim(),
                      description: newBookDescription.trim(),
                    });
                  }}
                >
                  {createBookMutation.isPending ? "Criando..." : "Criar e abrir"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Total de livros", value: books.length, icon: BookOpen },
            { label: "Rascunhos", value: books.filter((book) => book.status === "draft").length, icon: Clock },
            { label: "Em revisão", value: books.filter((book) => ["submitted", "under_review"].includes(book.status)).length, icon: AlertCircle },
            { label: "Média de notas", value: averageScore?.toFixed(1) ?? "-", icon: TrendingUp },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="lumi-stat-card">
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

        {evaluations.length > 0 && (
          <Card className="lumi-cup-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareText className="h-5 w-5 text-emerald-700" />
                Notas e orientações recebidas
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {evaluations.slice(0, 4).map((evaluation) => (
                <div key={evaluation.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-950">{evaluation.bookTitle}</p>
                      <p className="text-sm text-slate-600">{evaluation.evaluatorName}</p>
                    </div>
                    <Badge variant="secondary">Nota {scoreLabel(evaluation.score)}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {evaluation.feedback || "A equipe avaliou seu texto. Continue revisando com calma."}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="mb-4 text-2xl font-bold text-slate-950">Biblioteca pessoal</h2>
          {isLoading ? (
            <Card>
              <CardContent className="pt-6 text-slate-600">Carregando livros...</CardContent>
            </Card>
          ) : books.length === 0 ? (
            <Card>
              <CardContent className="pt-8 text-center">
                <BookOpen className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                <p className="mb-4 text-slate-600">Você ainda não criou nenhum livro.</p>
                <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={() => setIsCreatingBook(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar primeiro livro
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {books.map((book) => {
                const latestEvaluation = latestEvaluationByBook.get(book.id);
                return (
                  <Card key={book.id} className="lumi-cup-card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-xl">
                    <CardHeader>
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                        <div>
                          <CardTitle className="text-xl">{book.title}</CardTitle>
                          {book.description && <p className="mt-2 text-sm text-slate-600">{book.description}</p>}
                        </div>
                        <StatusBadge status={book.status} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {latestEvaluation ? (
                        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                          <p className="font-semibold">Último feedback</p>
                          <p className="mt-1">
                            Nota {scoreLabel(latestEvaluation.score)} - {latestEvaluation.feedback || "Sem comentário escrito."}
                          </p>
                        </div>
                      ) : null}
                      <div className="mb-4 grid gap-4 sm:grid-cols-3">
                        <div>
                          <p className="text-sm text-slate-600">Folhas</p>
                          <p className="font-semibold text-slate-950">{book.pageCount ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Palavras</p>
                          <p className="font-semibold text-slate-950">{book.wordCount ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Criado em</p>
                          <p className="font-semibold text-slate-950">{new Date(book.createdAt).toLocaleDateString("pt-BR")}</p>
                        </div>
                      </div>
                      <Button className="bg-emerald-800 hover:bg-emerald-900" onClick={() => navigate(`/books/${book.id}/pages`)}>
                        Continuar escrevendo
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
