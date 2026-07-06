import { useAuth } from "@/_core/hooks/useAuth";
import BrandLogo from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SCHOOL_OPTIONS, normalizeSchoolId } from "@/lib/schools";
import { setStoredSchoolFilter } from "@/lib/selectedSchool";
import { trpc } from "@/lib/trpc";
import { Activity, ArrowRight, Building2, Clock3, ImagePlus, MapPin, Pencil, Trash2, Users } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const dashboardByRole: Record<string, string> = {
  student: "/dashboard/student",
  educator: "/dashboard/educator",
  coordinator: "/dashboard/coordinator",
  editor: "/dashboard/editor",
  admin: "/dashboard/admin",
};

const MAX_LOGO_SIZE = 1_500_000;

type SchoolForm = {
  schoolId: number;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  logoUrl: string | null;
};

function formatDate(value?: string | Date | null) {
  if (!value) return "Sem atualizacao";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem atualizacao";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function readLogoFile(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Escolha uma imagem para o brasao.");
  }

  if (file.size > MAX_LOGO_SIZE) {
    throw new Error("Use uma imagem menor que 1,5 MB.");
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Nao consegui ler essa imagem."));
    reader.readAsDataURL(file);
  });
}

export default function SelectSchool() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [editingSchool, setEditingSchool] = useState<SchoolForm | null>(null);
  const isInternalAccess = Boolean(user && user.id < 0);
  const canChooseAll = isInternalAccess && (user?.role === "admin" || user?.role === "editor");
  const canEditSchools = isInternalAccess && ["admin", "editor"].includes(user?.role ?? "");
  const allowedSchoolIds = useMemo(() => {
    if (!user || !isInternalAccess) return [];
    return canChooseAll ? SCHOOL_OPTIONS.map((school) => school.id) : [normalizeSchoolId(user.schoolId)];
  }, [canChooseAll, isInternalAccess, user?.id, user?.schoolId]);

  const { data: schoolProfiles = [] } = trpc.schools.listSchools.useQuery(undefined, {
    enabled: isInternalAccess,
  });
  const { data: users = [] } = trpc.users.listUsers.useQuery(undefined, {
    enabled: Boolean(isInternalAccess && user && ["admin", "editor", "coordinator"].includes(user.role ?? "")),
  });
  const { data: students = [] } = trpc.users.listStudents.useQuery(undefined, {
    enabled: Boolean(isInternalAccess && user && ["educator", "coordinator", "editor", "admin"].includes(user.role ?? "")),
  });
  const { data: books = [] } = trpc.books.listBooks.useQuery(undefined, {
    enabled: Boolean(isInternalAccess && user && ["educator", "coordinator", "editor", "admin"].includes(user.role ?? "")),
  });

  const updateSchoolMutation = trpc.schools.updateSchool.useMutation({
    onSuccess: async () => {
      toast.success("Escola atualizada.");
      setEditingSchool(null);
      await utils.schools.listSchools.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Nao foi possivel atualizar a escola.");
    },
  });

  useEffect(() => {
    if (loading || !user || isInternalAccess) return;
    navigate(dashboardByRole[user.role ?? "student"] ?? "/dashboard/student");
  }, [isInternalAccess, loading, navigate, user?.id, user?.role]);

  const schoolById = useMemo(() => {
    return new Map(schoolProfiles.map((school) => [normalizeSchoolId(school.id), school]));
  }, [schoolProfiles]);

  const schoolCards = useMemo(
    () =>
      allowedSchoolIds.map((schoolId) => {
        const profile = schoolById.get(schoolId);
        const fallback = SCHOOL_OPTIONS.find((school) => school.id === schoolId);
        const schoolUsers = users.filter((item) => normalizeSchoolId(item.schoolId) === schoolId);
        const schoolStudents = students.filter((item) => normalizeSchoolId(item.schoolId) === schoolId);
        const studentIds = new Set(schoolStudents.map((student) => student.id));
        const schoolBooks = books.filter((book) => studentIds.has(book.authorId));
        const updatedDates = [...schoolUsers, ...schoolStudents, ...schoolBooks]
          .map((item: any) => new Date(item.updatedAt ?? item.lastSeenAt ?? item.createdAt ?? 0))
          .filter((date) => !Number.isNaN(date.getTime()));
        const lastUpdated = updatedDates.sort((a, b) => b.getTime() - a.getTime())[0];
        const classes = new Set(schoolStudents.map((student) => student.className || "Sem turma"));
        const location =
          [profile?.city, profile?.state].filter(Boolean).join(" - ") ||
          profile?.address ||
          profile?.description ||
          (schoolId === 1 ? "Unidade principal" : "Segunda unidade");

        return {
          id: schoolId,
          name: profile?.name || fallback?.label || `Escola ${schoolId}`,
          description: profile?.description ?? "",
          address: profile?.address ?? "",
          city: profile?.city ?? "",
          state: profile?.state ?? "",
          logoUrl: profile?.logoUrl ?? null,
          location,
          students: schoolStudents.length,
          classes: classes.size,
          lastUpdated,
          status: schoolStudents.length > 0 || schoolBooks.length > 0 ? "Ativa" : "Pendente",
        };
      }),
    [allowedSchoolIds, books, schoolById, students, users]
  );

  const chooseSchool = (schoolId: number) => {
    setStoredSchoolFilter(String(normalizeSchoolId(schoolId)) as "1" | "2");
    navigate(dashboardByRole[user?.role ?? "student"] ?? "/dashboard/student");
  };

  const openEditor = (school: (typeof schoolCards)[number]) => {
    setEditingSchool({
      schoolId: school.id,
      name: school.name,
      description: school.description,
      address: school.address,
      city: school.city,
      state: school.state,
      logoUrl: school.logoUrl,
    });
  };

  const handleLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editingSchool) return;

    try {
      const logoUrl = await readLogoFile(file);
      setEditingSchool({ ...editingSchool, logoUrl });
    } catch (error: any) {
      toast.error(error.message || "Nao foi possivel carregar o brasao.");
    }
  };

  const saveSchool = () => {
    if (!editingSchool) return;
    if (editingSchool.name.trim().length < 2) {
      toast.error("Informe o nome da escola.");
      return;
    }

    updateSchoolMutation.mutate({
      schoolId: editingSchool.schoolId,
      name: editingSchool.name.trim(),
      description: editingSchool.description,
      address: editingSchool.address,
      city: editingSchool.city,
      state: editingSchool.state,
      logoUrl: editingSchool.logoUrl,
    });
  };

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[#F8F7EB] text-[#0F3D2E]">Carregando escolas...</div>;
  }

  if (!isInternalAccess) {
    return <div className="grid min-h-screen place-items-center bg-[#F8F7EB] text-[#0F3D2E]">Abrindo seu painel...</div>;
  }

  return (
    <div className="lumi-page-aura min-h-screen px-4 py-8 text-[#0F3D2E]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <BrandLogo showTagline />
          <Badge className="w-fit border border-[#F4C430]/40 bg-white/88 px-3 py-1 text-[#0F3D2E] shadow-sm hover:bg-white">
            Acesso interno
          </Badge>
        </div>

        <main className="flex flex-1 flex-col justify-center py-10">
          <div className="lumi-school-ribbon rounded-lg p-6 md:p-8">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#266B3D]">Selecionar escola</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-normal text-slate-950 md:text-5xl">
              Escolha a unidade escolar.
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              Entre na unidade correta para ver turmas, alunos, livros, relatorios e identidade da escola.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Unidade", "Turmas", "Relatorios"].map((item) => (
                <span key={item} className="rounded-full border border-[#0F3D2E]/10 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#0F3D2E]">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {schoolCards.map((school) => (
              <Card key={school.id} className="lumi-premium-card overflow-hidden rounded-lg transition hover:-translate-y-1 hover:shadow-xl">
                <CardHeader className="relative overflow-hidden border-b bg-[#0F3D2E] text-white">
                  <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full border-[24px] border-[#F4C430]/14" />
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/24 bg-white/12 shadow-lg">
                        {school.logoUrl ? (
                          <img src={school.logoUrl} alt={`Brasao ${school.name}`} className="h-full w-full object-cover" />
                        ) : (
                          <Building2 className="h-8 w-8 text-[#F4C430]" />
                        )}
                      </div>
                      <div className="min-w-0 relative">
                        <CardTitle className="text-xl font-black leading-tight text-white md:text-2xl">{school.name}</CardTitle>
                        <p className="mt-2 flex items-center gap-2 text-sm text-white/75">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="truncate">{school.location}</span>
                        </p>
                      </div>
                    </div>
                    <Badge className={school.status === "Ativa" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                      {school.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 p-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-[#0F3D2E]/8 bg-white/78 p-3">
                      <Users className="h-4 w-4 text-[#123C8C]" />
                      <p className="mt-2 text-2xl font-bold text-slate-950">{school.students}</p>
                      <p className="text-xs text-slate-500">alunos</p>
                    </div>
                    <div className="rounded-lg border border-[#0F3D2E]/8 bg-white/78 p-3">
                      <Building2 className="h-4 w-4 text-[#266B3D]" />
                      <p className="mt-2 text-2xl font-bold text-slate-950">{school.classes}</p>
                      <p className="text-xs text-slate-500">turmas</p>
                    </div>
                    <div className="rounded-lg border border-[#0F3D2E]/8 bg-white/78 p-3">
                      <Activity className="h-4 w-4 text-[#F4C430]" />
                      <p className="mt-2 text-2xl font-bold text-slate-950">{school.id}</p>
                      <p className="text-xs text-slate-500">unidade</p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-3 rounded-lg border border-[#0F3D2E]/10 bg-white/72 p-3">
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock3 className="h-4 w-4" />
                      Ultima atualizacao: {formatDate(school.lastUpdated)}
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      {canEditSchools ? (
                        <Button type="button" variant="outline" onClick={() => openEditor(school)} className="gap-2">
                          <Pencil className="h-4 w-4" />
                          Editar escola
                        </Button>
                      ) : null}
                      <Button onClick={() => chooseSchool(school.id)} className="bg-[#0F3D2E] font-semibold hover:bg-[#174f3d]">
                        Entrar
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>

      <Dialog open={Boolean(editingSchool)} onOpenChange={(open) => (!open ? setEditingSchool(null) : null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar escola</DialogTitle>
            <DialogDescription>Atualize o nome e o brasao que aparecem na entrada interna.</DialogDescription>
          </DialogHeader>

          {editingSchool ? (
            <div className="grid gap-5 sm:grid-cols-[170px_1fr]">
              <div className="space-y-3">
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-slate-50">
                  {editingSchool.logoUrl ? (
                    <img src={editingSchool.logoUrl} alt="Previa do brasao" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-12 w-12 text-[#266B3D]" />
                  )}
                </div>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  <ImagePlus className="h-4 w-4" />
                  Trocar brasao
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
                {editingSchool.logoUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full gap-2 text-slate-500"
                    onClick={() => setEditingSchool({ ...editingSchool, logoUrl: null })}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover imagem
                  </Button>
                ) : null}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nome da escola</label>
                  <Input
                    value={editingSchool.name}
                    onChange={(event) => setEditingSchool({ ...editingSchool, name: event.target.value })}
                    placeholder="Ex.: Escola Municipal Lumi"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Cidade</label>
                    <Input
                      value={editingSchool.city}
                      onChange={(event) => setEditingSchool({ ...editingSchool, city: event.target.value })}
                      placeholder="Cidade"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Estado</label>
                    <Input
                      value={editingSchool.state}
                      onChange={(event) => setEditingSchool({ ...editingSchool, state: event.target.value })}
                      placeholder="UF"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Endereco ou unidade</label>
                  <Input
                    value={editingSchool.address}
                    onChange={(event) => setEditingSchool({ ...editingSchool, address: event.target.value })}
                    placeholder="Ex.: Unidade Centro"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Descricao curta</label>
                  <Textarea
                    value={editingSchool.description}
                    onChange={(event) => setEditingSchool({ ...editingSchool, description: event.target.value })}
                    placeholder="Uma frase curta para identificar a escola."
                  />
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditingSchool(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveSchool} disabled={updateSchoolMutation.isPending} className="bg-[#0F3D2E] hover:bg-[#174f3d]">
              {updateSchoolMutation.isPending ? "Salvando..." : "Salvar escola"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
