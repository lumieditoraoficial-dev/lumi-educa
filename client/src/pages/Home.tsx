import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { ArrowRight, Award, BookOpen, FileCheck2, Library, Sparkles, Users } from "lucide-react";
import { useLocation } from "wouter";

const features = [
  {
    title: "Editor profissional",
    description: "Escrita com autosave, paginas, capitulos e documento unico em formato de ebook.",
    icon: BookOpen,
  },
  {
    title: "Fluxo pedagogico",
    description: "Aluno envia, educador avalia, coordenador aprova e editor prepara a publicacao.",
    icon: FileCheck2,
  },
  {
    title: "Biblioteca digital",
    description: "Obras publicadas ficam disponiveis para leitura com navegacao limpa e responsiva.",
    icon: Library,
  },
  {
    title: "IA interna",
    description: "Apoio pedagogico reservado a equipe, com justificativas, relatorios e sugestoes.",
    icon: Sparkles,
  },
  {
    title: "Metas e desempenho",
    description: "Relatorios mensais, ranking, notas, paginas escritas e metas editoriais.",
    icon: Award,
  },
  {
    title: "Gestao completa",
    description: "Usuarios, perfis, fotos, permissoes e paineis separados por responsabilidade.",
    icon: Users,
  },
];

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#F7F3E9] text-[#0F3D2E]">
      <nav className="sticky top-0 z-50 border-b border-[#0F3D2E]/10 bg-[#F7F3E9]/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => navigate("/")} className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#266B3D]">
            <BrandLogo showTagline />
          </button>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-[#0F3D2E]/25 text-[#0F3D2E] hover:bg-[#0F3D2E]/5"
              onClick={() => navigate("/login")}
            >
              Login
            </Button>
            <Button className="bg-[#F4C430] font-semibold text-[#0F3D2E] hover:bg-[#e5b829]" onClick={() => navigate("/signup")}>
              Cadastro
            </Button>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative isolate overflow-hidden bg-[#0F3D2E] text-[#F7F3E9]">
          <div className="absolute left-0 top-0 h-64 w-80 bg-[#266B3D]" style={{ clipPath: "polygon(0 0, 100% 0, 36% 100%, 0 58%)" }} />
          <div className="absolute left-0 top-0 h-48 w-64 bg-[#6DB33F]" style={{ clipPath: "polygon(0 0, 74% 0, 44% 100%, 0 35%)" }} />
          <div className="absolute left-44 top-0 h-40 w-48 bg-[#F4C430]" style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
          <div className="absolute bottom-0 right-0 h-80 w-[30rem] bg-[#266B3D]" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%, 42% 44%)" }} />
          <div className="absolute bottom-0 right-0 h-64 w-80 bg-[#6DB33F]" style={{ clipPath: "polygon(100% 0, 100% 100%, 28% 100%, 0 48%)" }} />
          <div className="absolute bottom-0 right-44 h-40 w-52 bg-[#F4C430]" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />

          <div className="relative mx-auto flex min-h-[calc(100vh-76px)] max-w-7xl flex-col justify-center px-4 py-20 sm:px-6 lg:px-8">
            <div className="max-w-4xl">
              <BrandLogo inverted showTagline className="mb-10" markClassName="bg-[#F7F3E9]" />
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.36em] text-[#BDE3A1]">
                Plataforma educacional inteligente
              </p>
              <h1 className="text-6xl font-semibold leading-none tracking-normal sm:text-7xl lg:text-8xl">
                Lumi Educa
              </h1>
              <p className="mt-7 max-w-2xl text-xl leading-8 text-[#F7F3E9]/88">
                Escrita estudantil, avaliacao pedagogica e publicacao de livros digitais em uma experiencia moderna,
                humana e segura.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="h-12 bg-[#F4C430] px-7 font-bold text-[#0F3D2E] hover:bg-[#e5b829]"
                  onClick={() => navigate("/login")}
                >
                  Entrar na plataforma
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-[#F7F3E9]/45 bg-transparent px-7 text-[#F7F3E9] hover:bg-[#F7F3E9]/10"
                  onClick={() => navigate("/library")}
                >
                  Ver biblioteca
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="-mt-1 bg-[#F7F3E9] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#6DB33F]">Sistema completo</p>
                <h2 className="mt-3 text-4xl font-semibold tracking-normal text-[#0F3D2E]">Da primeira pagina ao livro publicado.</h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-[#0F3D2E]/70">
                A identidade visual segue o mesmo caminho da marca: clara, confiavel, luminosa e com foco em resultado.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title} className="rounded-lg border border-[#0F3D2E]/10 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-[#F4C430] text-[#0F3D2E]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#0F3D2E]">{feature.title}</h3>
                    <p className="mt-3 leading-7 text-[#0F3D2E]/68">{feature.description}</p>
                  </article>
                );
              })}
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
