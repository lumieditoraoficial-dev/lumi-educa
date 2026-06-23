import { useAuth } from "@/_core/hooks/useAuth";
import BrandLogo from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SCHOOL_OPTIONS, getSchoolLabel, normalizeSchoolId } from "@/lib/schools";
import { setStoredSchoolFilter } from "@/lib/selectedSchool";
import { trpc } from "@/lib/trpc";
import { Activity, ArrowRight, Building2, Clock3, MapPin, Users } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";

const dashboardByRole: Record<string, string> = {
  student: "/dashboard/student",
  educator: "/dashboard/educator",
  coordinator: "/dashboard/coordinator",
  editor: "/dashboard/editor",
  admin: "/dashboard/admin",
};

function formatDate(value?: string | Date | null) {
  if (!value) return "Sem atualização";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem atualização";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function SelectSchool() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const canChooseAll = user?.role === "admin" || user?.role === "editor";
  const allowedSchoolIds = canChooseAll ? SCHOOL_OPTIONS.map((school) => school.id) : [normalizeSchoolId(user?.schoolId)];

  const { data: users = [] } = trpc.users.listUsers.useQuery(undefined, {
    enabled: Boolean(user && ["admin", "editor", "coordinator"].includes(user.role ?? "")),
  });
  const { data: students = [] } = trpc.users.listStudents.useQuery(undefined, {
    enabled: Boolean(user && ["educator", "coordinator", "editor", "admin"].includes(user.role ?? "")),
  });
  const { data: books = [] } = trpc.books.listBooks.useQuery(undefined, {
    enabled: Boolean(user && ["educator", "coordinator", "editor", "admin"].includes(user.role ?? "")),
  });

  const schoolCards = useMemo(
    () =>
      allowedSchoolIds.map((schoolId) => {
        const schoolUsers = users.filter((item) => normalizeSchoolId(item.schoolId) === schoolId);
        const schoolStudents = students.filter((item) => normalizeSchoolId(item.schoolId) === schoolId);
        const studentIds = new Set(schoolStudents.map((student) => student.id));
        const schoolBooks = books.filter((book) => studentIds.has(book.authorId));
        const updatedDates = [...schoolUsers, ...schoolStudents, ...schoolBooks]
          .map((item: any) => new Date(item.updatedAt ?? item.lastSeenAt ?? item.createdAt ?? 0))
          .filter((date) => !Number.isNaN(date.getTime()));
        const lastUpdated = updatedDates.sort((a, b) => b.getTime() - a.getTime())[0];
        const classes = new Set(schoolStudents.map((student) => student.className || "Sem turma"));

        return {
          id: schoolId,
          name: getSchoolLabel(schoolId),
          location: schoolId === 1 ? "Unidade principal" : "Segunda unidade",
          students: schoolStudents.length,
          classes: classes.size,
          lastUpdated,
          status: schoolStudents.length > 0 || schoolBooks.length > 0 ? "Ativa" : "Pendente",
        };
      }),
    [allowedSchoolIds, books, students, users]
  );

  const chooseSchool = (schoolId: number) => {
    setStoredSchoolFilter(String(normalizeSchoolId(schoolId)) as "1" | "2");
    navigate(dashboardByRole[user?.role ?? "student"] ?? "/dashboard/student");
  };

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[#F8F7EB] text-[#0F3D2E]">Carregando escolas...</div>;
  }

  if (user?.role === "student") {
    navigate("/dashboard/student");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F8F7EB] px-4 py-8 text-[#0F3D2E]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <BrandLogo showTagline />
          <Badge className="w-fit border border-[#F4C430]/40 bg-white px-3 py-1 text-[#0F3D2E] hover:bg-white">
            Nossa escola em campo
          </Badge>
        </div>

        <main className="flex flex-1 flex-col justify-center py-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#266B3D]">Selecionar escola</p>
            <h1 className="mt-3 text-4xl font-bold tracking-normal text-slate-950 md:text-5xl">
              Escolha qual escola deseja acompanhar agora.
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Depois da escolha, os painéis carregam apenas os alunos, turmas, relatórios e livros daquela unidade.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {schoolCards.map((school) => (
              <Card key={school.id} className="overflow-hidden rounded-lg border-[#0F3D2E]/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <CardHeader className="border-b bg-[#0F3D2E] text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-2xl">{school.name}</CardTitle>
                      <p className="mt-2 flex items-center gap-2 text-sm text-white/75">
                        <MapPin className="h-4 w-4" />
                        {school.location}
                      </p>
                    </div>
                    <Badge className={school.status === "Ativa" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                      {school.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 p-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <Users className="h-4 w-4 text-[#123C8C]" />
                      <p className="mt-2 text-2xl font-bold text-slate-950">{school.students}</p>
                      <p className="text-xs text-slate-500">alunos</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <Building2 className="h-4 w-4 text-[#266B3D]" />
                      <p className="mt-2 text-2xl font-bold text-slate-950">{school.classes}</p>
                      <p className="text-xs text-slate-500">turmas</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <Activity className="h-4 w-4 text-[#F4C430]" />
                      <p className="mt-2 text-2xl font-bold text-slate-950">{school.id}</p>
                      <p className="text-xs text-slate-500">unidade</p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock3 className="h-4 w-4" />
                      Última atualização: {formatDate(school.lastUpdated)}
                    </p>
                    <Button onClick={() => chooseSchool(school.id)} className="bg-[#0F3D2E] font-semibold hover:bg-[#174f3d]">
                      Entrar
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
