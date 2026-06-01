import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertCircle, BookOpen, CheckCircle, Clock, Plus } from "lucide-react";
import { useState } from "react";
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

export default function DashboardStudent() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [isCreatingBook, setIsCreatingBook] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookDescription, setNewBookDescription] = useState("");

  const { data: books = [], isLoading, refetch } = trpc.books.myBooks.useQuery(undefined, {
    enabled: Boolean(user),
  });

  const createBookMutation = trpc.books.createBook.useMutation({
    onSuccess: async (book: any) => {
      toast.success("Livro criado. Agora crie a primeira página para escrever.");
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
    return <DashboardLayout>Carregando...</DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-950">Meus livros</h1>
            <p className="mt-2 text-slate-600">Crie livros, organize páginas e acompanhe a revisão pedagógica.</p>
          </div>
          <Dialog open={isCreatingBook} onOpenChange={setIsCreatingBook}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-700 hover:bg-emerald-800">
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
            { label: "Publicados", value: books.filter((book) => book.status === "published").length, icon: CheckCircle },
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
              {books.map((book) => (
                <Card key={book.id} className="transition-shadow hover:shadow-md">
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
                    <div className="mb-4 grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-sm text-slate-600">Páginas</p>
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
                    <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={() => navigate(`/books/${book.id}/pages`)}>
                      Escrever livro
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
