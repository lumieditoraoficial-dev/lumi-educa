import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePageSeo } from "@/lib/seo";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BookOpen, Building2, GraduationCap, Lock, LogIn, Mail, Shield, ShieldCheck, UserCog, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Role = "student" | "educator" | "coordinator" | "editor" | "admin";
type InternalAccess = Role | "schoolPortal";

const roleDashboard: Record<Role, string> = {
  student: "/dashboard/student",
  educator: "/dashboard/educator",
  coordinator: "/dashboard/coordinator",
  editor: "/dashboard/editor",
  admin: "/dashboard/admin",
};

const roleOptions: Array<{ role: InternalAccess; label: string; icon: typeof GraduationCap }> = [
  { role: "schoolPortal", label: "Portal Escola", icon: Building2 },
  { role: "student", label: "Aluno", icon: GraduationCap },
  { role: "educator", label: "Educador", icon: BookOpen },
  { role: "coordinator", label: "Coordenador", icon: Users },
  { role: "editor", label: "Editor", icon: UserCog },
  { role: "admin", label: "Administrador", icon: ShieldCheck },
];

export default function Login() {
  const [, navigate] = useLocation();
  const [loginMode, setLoginMode] = useState<"master" | "email">("email");
  const [selectedRole, setSelectedRole] = useState<InternalAccess>("schoolPortal");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  usePageSeo({
    title: "Entrar | Lumi Educa",
    description: "Acesso seguro ao ambiente escolar Lumi Educa.",
    canonicalPath: "/login",
    robots: "noindex, nofollow",
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      toast.success("Login realizado com sucesso.");
      localStorage.setItem("user", JSON.stringify(data.user));
      const role = data.user.role as Role;
      navigate(data.user.id < 0 ? "/select-school" : roleDashboard[role] ?? roleDashboard.student);
    },
    onError: (error) => {
      toast.error(error.message || "Nao foi possivel entrar.");
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!password.trim()) {
      toast.error("Digite a senha.");
      return;
    }

    if (loginMode === "email" && !email.trim()) {
      toast.error("Digite o email.");
      return;
    }

    if (loginMode === "master") {
      if (selectedRole === "schoolPortal") {
        localStorage.setItem("lumi-master-entry", "school-portal");
        await loginMutation.mutateAsync({ role: "coordinator", password });
        return;
      }

      localStorage.removeItem("lumi-master-entry");
      await loginMutation.mutateAsync({ role: selectedRole, password });
      return;
    }

    localStorage.removeItem("lumi-master-entry");
    await loginMutation.mutateAsync({ email: email.trim(), password });
  };

  const changeMode = () => {
    setPassword("");
    setLoginMode((current) => (current === "master" ? "email" : "master"));
  };

  return (
    <div className="lumi-login-shell min-h-screen">
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <button type="button" onClick={() => navigate("/")} className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6DB33F]">
          <BrandLogo compact />
        </button>
        <Button variant="ghost" className="gap-2 text-[#0F3D2E] hover:bg-white" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Pagina inicial</span>
        </Button>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-9rem)] w-full max-w-6xl items-center gap-10 px-4 pb-10 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_28rem] lg:px-8">
        <section className="hidden max-w-xl lg:block">
          <div className="lumi-login-mark">
            <img src="/lumi-educa-mark.png" alt="" className="h-24 w-24 object-contain" />
          </div>
          <p className="mt-8 text-sm font-black uppercase tracking-[0.18em] text-[#266B3D]">Lumi Educa</p>
          <h1 className="mt-4 text-5xl font-black leading-tight tracking-normal text-[#0F3D2E]">
            Sua escola, seus livros, sua voz.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
            Cada pagina escrita e uma nova descoberta.
          </p>
        </section>

        <Card className="w-full rounded-lg border border-[#0F3D2E]/10 bg-white shadow-[0_28px_80px_rgba(15,61,46,0.14)]">
          <CardHeader className="space-y-4 border-b border-[#0F3D2E]/8 pb-5">
            <BrandLogo className="lg:hidden" compact />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#266B3D]">
                {loginMode === "master" ? "Acesso interno" : "Acesso escolar"}
              </p>
              <CardTitle className="mt-2 text-3xl font-black tracking-normal text-[#0F3D2E]">
                {loginMode === "master" ? "Selecionar perfil" : "Entrar na conta"}
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {loginMode === "master" ? (
                <div className="grid grid-cols-2 gap-2">
                  {roleOptions.map((option) => {
                    const Icon = option.icon;
                    const active = selectedRole === option.role;

                    return (
                      <button
                        key={option.role}
                        type="button"
                        onClick={() => setSelectedRole(option.role)}
                        aria-pressed={active}
                        className={`flex min-h-16 items-center gap-2 rounded-md border px-3 py-3 text-left text-sm transition ${
                          active
                            ? "border-[#266B3D] bg-[#EEF4E3] font-bold text-[#0F3D2E]"
                            : "border-slate-200 bg-white text-slate-600 hover:border-[#6DB33F] hover:text-[#0F3D2E]"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <label htmlFor="login-email" className="text-sm font-semibold text-slate-700">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-12 pl-10"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="login-password" className="text-sm font-semibold text-slate-700">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Sua senha"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 pl-10"
                  />
                </div>
              </div>

              <Button type="submit" disabled={loginMutation.isPending} className="h-12 w-full gap-2 bg-[#0F3D2E] font-black text-white hover:bg-[#18513D]">
                <LogIn className="h-4 w-4" />
                {loginMutation.isPending ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            {loginMode === "email" ? (
              <div className="mt-5 text-center text-sm text-slate-500">
                Primeiro acesso?{" "}
                <button type="button" className="font-bold text-[#266B3D] hover:text-[#0F3D2E]" onClick={() => navigate("/signup")}>
                  Criar conta
                </button>
              </div>
            ) : null}

            <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
              <span>Ambiente protegido</span>
              <button
                type="button"
                onClick={changeMode}
                title={loginMode === "master" ? "Voltar ao acesso escolar" : "Acesso interno"}
                aria-label={loginMode === "master" ? "Voltar ao acesso escolar" : "Acesso interno"}
                className={`flex h-9 items-center justify-center rounded-md border transition ${
                  loginMode === "master" ? "gap-2 border-[#266B3D]/30 bg-[#EEF4E3] px-3 text-[#0F3D2E]" : "w-9 border-slate-200 text-slate-400 hover:border-[#266B3D] hover:text-[#266B3D]"
                }`}
              >
                <Shield className="h-4 w-4" />
                {loginMode === "master" ? <span className="font-semibold">Acesso escolar</span> : null}
              </button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
