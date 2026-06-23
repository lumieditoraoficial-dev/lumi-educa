import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { BookOpen, CheckCircle2, GraduationCap, Lock, Mail, ShieldCheck, Sparkles, Trophy, UserCog, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Role = "student" | "educator" | "coordinator" | "editor" | "admin";

const roleDashboard: Record<Role, string> = {
  student: "/dashboard/student",
  educator: "/dashboard/educator",
  coordinator: "/dashboard/coordinator",
  editor: "/dashboard/editor",
  admin: "/dashboard/admin",
};

const roleOptions: Array<{ role: Role; label: string; icon: typeof GraduationCap }> = [
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
  const [selectedRole, setSelectedRole] = useState<Role>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [quoteIndex, setQuoteIndex] = useState(0);

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

    await loginMutation.mutateAsync(loginMode === "master" ? { role: selectedRole, password } : { email: email.trim(), password });
  };

  return (
    <div className="lumi-hero-stage relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0 bg-cover bg-center opacity-[0.35]" style={{ backgroundImage: "url('/lumi-hero-dashboard.jpg')" }} />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,24,19,0.9),rgba(7,48,31,0.76)_48%,rgba(8,24,54,0.64))]" />

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
            <h1 className="mt-5 text-5xl font-black leading-tight tracking-normal sm:text-6xl">
              Entre na sua jornada de escrita.
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-white/80">
              Sua conta abre o painel da escola, com escrita, avaliacao, biblioteca, metas e comunicados em um unico ambiente.
            </p>
            <div className="mt-8 max-w-2xl border-l-4 border-[#F4C430] pl-5">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#F4C430]">Inspiracao</p>
              <p className="mt-2 text-lg leading-7 text-white">{motivationalQuotes[quoteIndex]}</p>
            </div>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {["Escola no topo", "Notas e metas", "Livro em PDF"].map((item) => (
                <div key={item} className="rounded-lg border border-white/14 bg-white/10 p-3 text-sm font-bold backdrop-blur">
                  <CheckCircle2 className="mb-2 h-5 w-5 text-[#F4C430]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative flex items-center justify-center">
          <Card className="relative z-10 w-full rounded-lg border border-white/20 bg-white/95 text-[#0F3D2E] shadow-2xl backdrop-blur">
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <BrandLogo compact />
                <span className="inline-flex items-center gap-2 rounded-full bg-[#fff8d7] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#0F3D2E]">
                  <Trophy className="h-3.5 w-3.5" />
                  Brasil
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
