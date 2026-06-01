import BrandLogo from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { BookOpen, Search, Star } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Library() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [series, setSeries] = useState<string | undefined>();

  const { data: books, isLoading } = trpc.library.getPublishedBooks.useQuery({
    search: search || undefined,
    category: category || undefined,
    series: series || undefined,
  });

  return (
    <div className="min-h-screen bg-[#F7F3E9]">
      <div className="relative overflow-hidden bg-[#0F3D2E] px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="absolute bottom-0 right-0 h-44 w-72 bg-[#266B3D]" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%, 40% 46%)" }} />
        <div className="absolute bottom-0 right-0 h-36 w-52 bg-[#6DB33F]" style={{ clipPath: "polygon(100% 0, 100% 100%, 26% 100%, 0 50%)" }} />
        <div className="absolute bottom-0 right-32 h-24 w-36 bg-[#F4C430]" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-5">
            <BrandLogo inverted showTagline />
          </div>
          <h1 className="text-4xl font-semibold tracking-normal">Biblioteca Digital</h1>
          <p className="mt-2 text-[#F7F3E9]/85">Leia obras estudantis publicadas depois da revisao pedagogica.</p>
        </div>
      </div>

      <div className="sticky top-0 z-30 border-b border-[#0F3D2E]/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar livros..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={category || "all"} onValueChange={(value) => setCategory(value === "all" ? undefined : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                <SelectItem value="ficcao">Ficcao</SelectItem>
                <SelectItem value="fantasia">Fantasia</SelectItem>
                <SelectItem value="misterio">Misterio</SelectItem>
                <SelectItem value="romance">Romance</SelectItem>
                <SelectItem value="aventura">Aventura</SelectItem>
              </SelectContent>
            </Select>

            <Select value={series || "all"} onValueChange={(value) => setSeries(value === "all" ? undefined : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Serie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as series</SelectItem>
                <SelectItem value="6 ano">6 Ano</SelectItem>
                <SelectItem value="7 ano">7 Ano</SelectItem>
                <SelectItem value="8 ano">8 Ano</SelectItem>
                <SelectItem value="9 ano">9 Ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="py-12 text-center">
            <p className="text-slate-600">Carregando livros...</p>
          </div>
        ) : books && books.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {books.map((pub) => {
              const book = pub.book;
              if (!book) return null;

              return (
                <Card key={pub.id} className="overflow-hidden rounded-lg transition-shadow hover:shadow-xl">
                  {book.coverImageUrl ? (
                    <div className="flex h-48 items-center justify-center bg-gradient-to-br from-[#266B3D] via-[#6DB33F] to-[#F4C430]">
                      <img src={book.coverImageUrl} alt={book.title} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-gradient-to-br from-[#266B3D] via-[#6DB33F] to-[#F4C430]">
                      <BookOpen className="h-16 w-16 text-white opacity-65" />
                    </div>
                  )}

                  <CardHeader>
                    <CardTitle className="line-clamp-2 text-[#0F3D2E]">{book.title}</CardTitle>
                    {book.subtitle && <CardDescription className="line-clamp-1">{book.subtitle}</CardDescription>}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {book.description && <p className="line-clamp-2 text-sm text-slate-600">{book.description}</p>}

                    <div className="flex flex-wrap gap-2">
                      {book.category && <Badge variant="secondary">{book.category}</Badge>}
                      {book.series && <Badge variant="outline">{book.series}</Badge>}
                    </div>

                    <div className="flex items-center justify-between border-t pt-2 text-sm text-slate-600">
                      <span>{book.wordCount ?? 0} palavras</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-[#F4C430] text-[#F4C430]" />
                        <span>Ebook</span>
                      </div>
                    </div>

                    <Button className="w-full bg-[#0F3D2E] hover:bg-[#174f3d]" onClick={() => navigate(`/library/book/${book.id}`)}>
                      Ler Agora
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <BookOpen className="mx-auto mb-4 h-16 w-16 text-slate-300" />
            <p className="mb-4 text-slate-600">Nenhum livro encontrado com esses filtros.</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setCategory(undefined);
                setSeries(undefined);
              }}
            >
              Limpar filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
