import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Activity, ArrowLeft, BookOpen, Database, Eye, Settings, ShieldCheck, Trophy, Users } from "lucide-react";
import { useState } from "react";
import AdminActivity from "./AdminActivity";
import AdminBookObserver from "./AdminBookObserver";
import AdminDatabase from "./AdminDatabase";
import AdminManageUsers from "./AdminManageUsers";
import AdminSystemSettings from "./AdminSystemSettings";

type AdminPage = "overview" | "users" | "books" | "settings" | "database" | "activity";

export default function DashboardAdmin() {
  const [currentPage, setCurrentPage] = useState<AdminPage>("overview");
  const { data: users = [] } = trpc.users.listUsers.useQuery();
  const { data: books = [] } = trpc.books.listBooks.useQuery();

  if (currentPage !== "overview") {
    const pageTitle: Record<Exclude<AdminPage, "overview">, string> = {
      users: "Gerenciar usuários",
      books: "Observação dos livros",
      settings: "Configurações",
      database: "Banco de dados",
      activity: "Atividade",
    };

    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Button variant="outline" onClick={() => setCurrentPage("overview")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="sr-only">{pageTitle[currentPage]}</h1>
          {currentPage === "users" && <AdminManageUsers />}
          {currentPage === "books" && <AdminBookObserver />}
          {currentPage === "settings" && <AdminSystemSettings />}
          {currentPage === "database" && <AdminDatabase />}
          {currentPage === "activity" && <AdminActivity />}
        </div>
      </DashboardLayout>
    );
  }

  const publishedBooks = books.filter((book) => book.status === "published");
  const pendingBooks = books.filter((book) => ["submitted", "under_review", "approved"].includes(book.status));

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="lumi-cup-surface lumi-field-lines overflow-hidden rounded-xl p-6 text-white shadow-xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-9 w-9 text-[#F4C430]" />
                <h1 className="text-4xl font-bold">Painel administrativo</h1>
              </div>
              <p className="mt-2 max-w-2xl text-white/78">
                Central de controle da plataforma, com usuários, permissões, banco, IA interna e publicação.
              </p>
            </div>
            <div className="rounded-lg border border-white/16 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-[#F4C430]" />
                <div>
                  <p className="text-sm text-white/65">Temporada</p>
                  <p className="text-xl font-bold">Brasil da escrita</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Usuários reais", value: users.length, icon: Users },
            { label: "Livros criados", value: books.length, icon: BookOpen },
            { label: "Pendências", value: pendingBooks.length, icon: Activity },
            { label: "Publicados", value: publishedBooks.length, icon: Database },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="lumi-stat-card rounded-lg">
                <CardContent className="flex items-center justify-between pt-6">
                  <div>
                    <p className="text-sm text-slate-600">{stat.label}</p>
                    <p className="mt-1 text-3xl font-bold text-slate-950">{stat.value}</p>
                  </div>
                  <Icon className="h-8 w-8 text-[#123C8C]" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              id: "users",
              title: "Gerenciar usuários",
              description: "Criar alunos, educadores, coordenadores, editores e administradores.",
              icon: Users,
            },
            {
              id: "books",
              title: "Observação dos livros",
              description: "Ver todos os livros, páginas e textos como leitura administrativa sem alterar o fluxo.",
              icon: Eye,
            },
            {
              id: "settings",
              title: "Configurações do sistema",
              description: "Parâmetros globais e bloqueio da IA para alunos.",
              icon: Settings,
            },
            {
              id: "database",
              title: "Banco de dados",
              description: "PostgreSQL, backups e modo local de emergência.",
              icon: Database,
            },
            {
              id: "activity",
              title: "Atividade do sistema",
              description: "Auditoria, registros e monitoramento operacional.",
              icon: Activity,
            },
          ].map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.id} className="lumi-cup-card rounded-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-[#123C8C]" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-slate-600">{section.description}</p>
                  <Button
                    className="w-full bg-[#0F3D2E] font-semibold hover:bg-[#174f3d]"
                    onClick={() => setCurrentPage(section.id as AdminPage)}
                  >
                    Acessar
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="lumi-cup-card rounded-lg">
          <CardHeader>
            <CardTitle>Resumo de publicação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {books.length === 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-slate-600">
                Sistema zerado: nenhum livro criado ainda.
              </p>
            ) : (
              books.slice(0, 6).map((book) => (
                <div key={book.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-slate-950">{book.title}</p>
                    <p className="text-sm text-slate-600">{book.wordCount ?? 0} palavras</p>
                  </div>
                  <Badge variant="secondary">{book.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
