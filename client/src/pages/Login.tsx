import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePageSeo } from "@/lib/seo";
import { trpc } from "@/lib/trpc";
import { BookOpen, Building2, GraduationCap, Lock, Mail, ShieldCheck, Sparkles, UserCog, Users } from "lucide-react";
import { useEffect, useState } from "react";
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

const motivationalQuotes = [
  "Escrever e transformar pensamentos em futuro.",
  "Cada pagina escrita e uma nova descoberta.",
  "Nas paginas, o aluno encontra sua voz.",
  "Toda historia comeca quando alguem decide continuar.",
  "A leitura abre caminhos; a escrita acende possibilidades.",
];

export default function Login() {
  const [, navigate] = useLocation();
  const [loginMode, setLoginMode] = useState<"master" | "email">("email");
  const [selectedRole, setSelectedRole] = useState<InternalAccess>("schoolPortal");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [quoteIndex, setQuoteIndex] = useState(0);
  usePageSeo({
    title: "Acesso escolar | Lumi Educa",
    description: "Entrada segura para alunos, educadores, coordenacao, editor e administracao do Lumi Educa.",
    canonicalPath: "/login",
    robots: "noindex, nofollow",
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIndex((current) => (current + 1) % motivationalQuotes.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, []);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      toast.success("Login realizado com sucesso.");
      localStorage.setItem("user", JSON.stringify(data.user));
      const role = data.user.role as Role;
      navigate(data.user.id < 0 ? "/select-school" : roleDashboard[role] ?? roleDashboard.student);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao fazer login");
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

  return (
    <div className="lumi-hero-stage relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0 bg-cover bg-center opacity-[0.42]" style={{ backgroundImage: "url('/lumi-hero-dashboard.jpg')" }} />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,20,16,0.92),rgba(7,48,31,0.8)_48%,rgba(8,24,54,0.72))]" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_31rem] lg:px-8">
        <section className="pt-10 lg:pt-0">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C430]"
          >
            <BrandLogo inverted showTagline />
          </button>

          <div className="mt-14 max-w-3xl">
            <p className="inline-flex rounded-full border border-[#F4C430]/45 bg-[#F4C430]/14 px-4 py-2 text-sm font-bold uppercase tracking-[0.22em] text-[#F4C430]">
              Portal da escola
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-black leading-tight tracking-normal sm:text-6xl">
              Acesse sua escola.
            </h1>
            <div className="mt-8 max-w-2xl border-l-4 border-[#F4C430] pl-5">
              <p className="mt-2 text-lg leading-7 text-white">{motivationalQuotes[quoteIndex]}</p>
            </div>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {[
                { label: "Escola", icon: Building2 },
                { label: "Escrita", icon: BookOpen },
                { label: "Acompanhamento", icon: ShieldCheck },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-lg border border-white/14 bg-white/10 p-3 text-sm font-bold backdrop-blur">
                    <Icon className="mb-2 h-5 w-5 text-[#F4C430]" />
                    {item.label}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative flex items-center justify-center">
          <Card className="relative z-10 w-full rounded-lg border border-white/20 bg-white/95 text-[#0F3D2E] shadow-2xl backdrop-blur">
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <BrandLogo compact />
                <span className="inline-flex items-center gap-2 rounded-full bg-[#fff8d7] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#0F3D2E]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Oficial
                </span>
              </div>
              <div>
                <CardTitle className="text-2xl text-[#0F3D2E]">
                  {loginMode === "master" ? "Acesso interno" : "Acessar conta"}
                </CardTitle>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {loginMode === "master"
                    ? "Use a senha mestra para escolher a escola e administrar o ambiente."
                    : "Use seu email cadastrado para entrar no painel da sua escola."}
                </p>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {loginMode === "master" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {roleOptions.map((option) => {
                      const Icon = option.icon;
                      const active = selectedRole === option.role;

                      return (
                        <button
                          key={option.role}
                          type="button"
                          onClick={() => setSelectedRole(option.role)}
                          className={`flex items-center gap-3 rounded-lg border p-4 text-left transition ${
                            active
                              ? "border-[#123C8C] bg-[#fff8d7] text-[#0F3D2E] shadow-sm"
                              : "border-slate-200 bg-white hover:border-[#F4C430]"
                          }`}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          <span className="font-medium">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#0F3D2E]">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="h-11 pl-10"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#0F3D2E]">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="Sua senha"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-11 pl-10"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loginMutation.isPending} className="h-12 w-full bg-[#0F3D2E] font-black text-white hover:bg-[#174f3d]">
                  {loginMutation.isPending ? "Entrando..." : "Entrar"}
                  <Sparkles className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <div className="mt-6 flex items-center justify-between gap-3 text-sm">
                <button className="font-medium text-[#266B3D]" onClick={() => navigate("/signup")}>
                  Cadastrar usuario
                </button>
                <button
                  className="text-slate-600 hover:text-[#266B3D]"
                  onClick={() => {
                    setPassword("");
                    setLoginMode(loginMode === "master" ? "email" : "master");
                  }}
                >
                  {loginMode === "master" ? "Usar email" : "Acesso interno"}
                </button>
              </div>
              <div className="mt-3 text-right">
                <button className="text-xs text-slate-400 hover:text-[#266B3D]" onClick={() => navigate("/")}>
                  Voltar para a home
                </button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
