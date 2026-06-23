import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { BookOpen, GraduationCap, Lock, Mail, ShieldCheck, UserCog, Users } from "lucide-react";
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
      navigate(data.user.role === "student" ? roleDashboard.student : "/select-school");
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
    <div className="min-h-screen bg-[#F8F7EB] text-[#0F3D2E]">
      <div className="grid min-h-screen lg:grid-cols-[1fr_0.95fr]">
        <section className="relative overflow-hidden px-6 py-8 sm:px-10 lg:px-12">
          <div className="relative flex min-h-full flex-col justify-between">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-fit rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#266B3D]"
            >
              <BrandLogo showTagline />
            </button>

            <div className="max-w-2xl py-14 lg:py-20">
              <h1 className="text-4xl font-semibold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
                Lumi Educa
              </h1>
              <p className="mt-5 min-h-[3.5rem] max-w-xl text-lg leading-8 text-[#0F3D2E]/72 transition-opacity">
                {motivationalQuotes[quoteIndex]}
              </p>
            </div>
          </div>
        </section>

        <section className="relative flex items-center justify-center overflow-hidden bg-[#0F3D2E] px-4 py-10 sm:px-8">
          <Card className="relative z-10 w-full max-w-xl rounded-lg border border-white/20 bg-white shadow-2xl">
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <BrandLogo compact />
              </div>
              <div>
                <CardTitle className="text-2xl text-[#0F3D2E]">
                  {loginMode === "master" ? "Acesso interno" : "Entrar na plataforma"}
                </CardTitle>
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
                        className="pl-10"
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
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loginMutation.isPending} className="h-11 w-full bg-[#0F3D2E] font-semibold text-white hover:bg-[#174f3d]">
                  {loginMutation.isPending ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              <div className="mt-6 flex items-center justify-between gap-3 text-sm">
                <button className="font-medium text-[#266B3D]" onClick={() => navigate("/signup")}>
                  Criar usuario real
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
