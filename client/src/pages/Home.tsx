import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, CheckCircle2, FileCheck2, GraduationCap, Library, PenLine, Sparkles, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const features = [
  {
    title: "Escrita com cara de livro",
    description: "O aluno escreve em fluxo continuo, com paginas visuais, capitulos e imagens no texto.",
    icon: PenLine,
  },
  {
    title: "Avaliacao pedagogica",
    description: "Educadores acompanham novas paginas, notas de 0 a 10, feedback e historico.",
    icon: FileCheck2,
  },
  {
    title: "Publicacao digital",
    description: "Editor prepara capa, acabamento, PDF e biblioteca para as obras aprovadas.",
    icon: Library,
  },
  {
    title: "Gestao por escola",
    description: "Cada unidade entra com seu nome, brasao, alunos, turmas, metas e desempenho.",
    icon: GraduationCap,
  },
  {
    title: "Relatorios inteligentes",
    description: "Coordenacao e editor enxergam evolucao, acesso diario, destaques e alertas.",
    icon: Sparkles,
  },
  {
    title: "Projeto com presenca",
    description: "Visual tematico, humano e preparado para apresentacao para direcao e alunos.",
    icon: Trophy,
  },
];

const quotes = [
  "Quando a escola abre espaco para autoria, o aluno descobre que tambem pode publicar.",
  "Toda pagina escrita e um passo para o aluno encontrar a propria voz.",
  "Do caderno ao livro digital, cada historia ganha um lugar para existir.",
  "Uma plataforma bonita tambem ensina: ela faz o aluno querer continuar.",
];

const flow = [
  ["1", "Escreve", "Titulo, capitulos, paginas e imagens."],
  ["2", "Evolui", "Metas semanais, progresso e feedback."],
  ["3", "Publica", "Livro aprovado, capa pronta e PDF."],
];

export default function Home() {
  const [, navigate] = useLocation();
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIndex((current) => (current + 1) % quotes.length);
    }, 4800);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F7EB] text-[#0F3D2E]">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/12 bg-[#06271f]/58 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <button type="button" onClick={() => navigate("/")} className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C430]">
            <BrandLogo inverted compact />
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="hidden text-white/86 hover:bg-white/10 hover:text-white sm:inline-flex"
              onClick={() => navigate("/library")}
            >
              Biblioteca
            </Button>
            <Button className="bg-[#F4C430] font-bold text-[#0F3D2E] hover:bg-[#ffdc3b]" onClick={() => navigate("/login")}>
              Entrar
            </Button>
          </div>
        </div>
      </nav>

      <main>
        <section className="lumi-hero-stage relative isolate min-h-screen text-[#F7F3E9]">
          <div className="absolute inset-0 bg-cover bg-center opacity-[0.42]" style={{ backgroundImage: "url('/lumi-hero-dashboard.jpg')" }} />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,20,16,0.88),rgba(6,36,25,0.78)_46%,rgba(5,20,45,0.58))]" />
          <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 pb-8 pt-24 sm:px-6 lg:px-8">
            <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-center">
              <div className="max-w-4xl">
                <div className="mb-6">
                  <BrandLogo inverted showTagline />
                </div>
                <p className="mb-5 inline-flex rounded-full border border-[#F4C430]/48 bg-[#F4C430]/14 px-4 py-2 text-sm font-bold uppercase tracking-[0.22em] text-[#F4C430]">
                  Temporada Brasil da escrita
                </p>
                <h1 className="text-5xl font-black leading-[0.98] tracking-normal sm:text-6xl">
                  Da sala de aula ao livro publicado.
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-[#F7F3E9]/88">
                  O Lumi Educa transforma producao textual em uma experiencia viva: o aluno escreve, a escola acompanha, o professor orienta e o livro ganha forma.
                </p>
                <div className="mt-6 min-h-[4.5rem] max-w-2xl border-l-4 border-[#F4C430] pl-5">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#F4C430]">Frase em destaque</p>
                  <p className="mt-2 text-lg leading-7 text-white">{quotes[quoteIndex]}</p>
                </div>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    className="h-12 bg-[#F4C430] px-7 font-black text-[#0F3D2E] hover:bg-[#ffdc3b]"
                    onClick={() => navigate("/login")}
                  >
                    Acessar plataforma
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 border-white/45 bg-white/8 px-7 font-bold text-white hover:bg-white/14"
                    onClick={() => navigate("/library")}
                  >
                    Ver biblioteca
                  </Button>
                </div>
              </div>

              <div className="hidden lg:block">
                <div className="lumi-glass-panel rounded-lg p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-[#F4C430]">Projeto escolar</p>
                      <h2 className="mt-2 text-2xl font-black text-white">Livro em construcao</h2>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#F4C430] text-[#0F3D2E]">
                      <BookOpen className="h-7 w-7" />
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    {flow.map(([number, title, description]) => (
                      <div key={number} className="rounded-lg border border-white/14 bg-white/10 p-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-[#0F3D2E]">
                            {number}
                          </span>
                          <div>
                            <p className="font-bold text-white">{title}</p>
                            <p className="text-sm text-white/68">{description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 rounded-lg bg-[#F4C430] p-4 text-[#0F3D2E]">
                    <p className="text-sm font-bold uppercase tracking-[0.16em]">Placar da escola</p>
                    <p className="mt-1 text-3xl font-black">Autoria 3 x 0 Papel em branco</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lumi-page-aura px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.28em] text-[#123C8C]">Tudo em um so lugar</p>
                <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-normal text-[#0F3D2E]">
                  Bonito para apresentar. Forte para usar todos os dias.
                </h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-[#0F3D2E]/70">
                O visual valoriza o projeto da escola e a estrutura organiza escrita, avaliacao, metas, relatorios e publicacao.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title} className="lumi-premium-card rounded-lg p-6 transition hover:-translate-y-1 hover:shadow-xl">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-[#F4C430] text-[#0F3D2E] shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-black text-[#0F3D2E]">{feature.title}</h3>
                    <p className="mt-3 leading-7 text-[#0F3D2E]/68">{feature.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#0F3D2E] px-4 py-14 text-white sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-[#F4C430]">Identidade da escola</p>
              <h2 className="mt-3 text-4xl font-black tracking-normal">Cada escola entra com seu nome e brasao.</h2>
              <p className="mt-4 leading-7 text-white/72">
                Ao selecionar a escola, o ambiente interno passa a mostrar sua identidade visual junto do tema Brasil.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {["Brasao no topo", "Nome nos paineis", "Dados separados"].map((item) => (
                <div key={item} className="rounded-lg border border-white/14 bg-white/10 p-4">
                  <CheckCircle2 className="mb-4 h-6 w-6 text-[#F4C430]" />
                  <p className="font-bold">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#0F3D2E]/10 bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-[#0F3D2E]/65 md:flex-row md:items-center">
          <BrandLogo compact />
          <p>2026 Lumi Educa. Escrita, avaliacao e publicacao estudantil.</p>
        </div>
      </footer>
    </div>
  );
}
