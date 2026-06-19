import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  FileText,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Save,
  Type,
  Undo2,
} from "lucide-react";
import type { CSSProperties, ChangeEvent, ClipboardEvent, MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const PAGE_HEIGHT = 1040;
const PAGE_GAP = 42;
const MAX_IMAGE_SIZE = 2.5 * 1024 * 1024;

function stripHtml(content: string) {
  return content.replace(/<[^>]*>/g, " ");
}

function countWords(content: string) {
  return stripHtml(content).trim().split(/\s+/).filter(Boolean).length;
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textToParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function parseSavedContent(savedContent: string) {
  if (typeof window === "undefined" || !savedContent.includes("data-lumi-page-content")) {
    return { html: savedContent, fontSize: 17 };
  }

  const documentParser = new DOMParser();
  const parsed = documentParser.parseFromString(savedContent, "text/html");
  const wrapper = parsed.querySelector("[data-lumi-page-content]") as HTMLElement | null;
  const parsedFontSize = Number.parseInt(wrapper?.style.fontSize ?? "", 10);

  return {
    html: wrapper?.innerHTML ?? savedContent,
    fontSize: Number.isFinite(parsedFontSize) ? parsedFontSize : 17,
  };
}

function serializeContent(html: string, fontSize: number) {
  return `<div data-lumi-page-content="true" data-lumi-version="4" style="font-size: ${fontSize}px;">${html}</div>`;
}

function calculatePageCount(element: HTMLDivElement | null) {
  if (!element) return 1;
  const contentHeight = Math.max(PAGE_HEIGHT, element.scrollHeight);
  return Math.max(1, Math.ceil(contentHeight / PAGE_HEIGHT));
}

export default function PageEditor() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const pageId = Number(params.get("pageId"));
  const bookId = Number(params.get("bookId"));
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [fontSize, setFontSize] = useState(17);
  const [pageCount, setPageCount] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedPageIdRef = useRef<number | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const dirtyRef = useRef(false);

  const utils = trpc.useUtils();
  const { data: book } = trpc.books.getBook.useQuery({ bookId }, { enabled: Boolean(bookId) });
  const { data: pages = [] } = trpc.books.getPages.useQuery({ bookId }, { enabled: Boolean(bookId) });
  const updatePageMutation = trpc.books.updatePageContent.useMutation();
  const currentPage = pages.find((page) => page.id === pageId);
  const canEdit = user?.role === "student" && book?.status !== "published";

  const updatePageCount = useCallback(() => {
    if (pageTimerRef.current) clearTimeout(pageTimerRef.current);
    pageTimerRef.current = setTimeout(() => {
      setPageCount(calculatePageCount(editorRef.current));
    }, 80);
  }, []);

  const rememberSelection = () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !editorRef.current) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      savedSelectionRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    const range = savedSelectionRef.current;
    if (!selection || !range || !editorRef.current) return;
    selection.removeAllRanges();
    selection.addRange(range);
    editorRef.current.focus();
  };

  useEffect(() => {
    if (!currentPage) return;
    if (loadedPageIdRef.current === currentPage.id && dirtyRef.current) return;

    const parsedContent = parseSavedContent(currentPage.content ?? "");
    loadedPageIdRef.current = currentPage.id;
    dirtyRef.current = false;
    setTitle(currentPage.title ?? book?.title ?? "");
    setContent(parsedContent.html);
    setFontSize(parsedContent.fontSize);
    setWordCount(countWords(parsedContent.html));

    if (editorRef.current) {
      editorRef.current.style.fontSize = `${parsedContent.fontSize}px`;
      if (editorRef.current.innerHTML !== parsedContent.html) {
        editorRef.current.innerHTML = parsedContent.html;
      }
      updatePageCount();
    }
  }, [book?.title, currentPage, updatePageCount]);

  const handleSave = useCallback(
    async (contentToSave = content, titleToSave = title, showToast = true, fontSizeToSave = fontSize) => {
      if (!pageId || !bookId || !canEdit) return;

      setIsSaving(true);
      try {
        await updatePageMutation.mutateAsync({
          pageId,
          title: titleToSave,
          content: serializeContent(contentToSave, fontSizeToSave),
        });
        dirtyRef.current = false;
        setLastSavedAt(new Date());
        if (showToast) {
          await utils.books.getPages.invalidate({ bookId });
          toast.success("Texto salvo.");
        }
      } catch {
        toast.error("Erro ao salvar o texto.");
      } finally {
        setIsSaving(false);
      }
    },
    [bookId, canEdit, content, fontSize, pageId, title, updatePageMutation, utils.books.getPages]
  );

  const scheduleAutoSave = (nextContent = content, nextTitle = title, nextFontSize = fontSize) => {
    if (!canEdit) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(nextContent, nextTitle, false, nextFontSize);
    }, 9000);
  };

  const syncEditorContent = () => {
    const html = editorRef.current?.innerHTML ?? "";
    dirtyRef.current = true;
    setContent(html);
    setWordCount(countWords(html));
    updatePageCount();
    scheduleAutoSave(html, title);
  };

  const handleTitleChange = (newTitle: string) => {
    dirtyRef.current = true;
    setTitle(newTitle);
    scheduleAutoSave(editorRef.current?.innerHTML ?? content, newTitle);
  };

  const normalizeDocumentFont = (nextFontSize: number) => {
    if (!editorRef.current) return;
    editorRef.current.style.fontSize = `${nextFontSize}px`;
    editorRef.current.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
      element.style.removeProperty("font-size");
      element.style.removeProperty("font-family");
      if (!element.getAttribute("style")) {
        element.removeAttribute("style");
      }
    });
  };

  const handleFontSizeChange = (value: string) => {
    const nextFontSize = Math.min(72, Math.max(11, Number(value) || 17));
    dirtyRef.current = true;
    setFontSize(nextFontSize);
    normalizeDocumentFont(nextFontSize);
    const html = editorRef.current?.innerHTML ?? content;
    setContent(html);
    updatePageCount();
    scheduleAutoSave(html, title, nextFontSize);
  };

  const runCommand = (command: string, value?: string) => {
    if (!canEdit) return;
    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, value);
    syncEditorContent();
  };

  const insertImageHtml = (src: string) => {
    if (!canEdit) return;
    restoreSelection();
    const imageHtml = `
      <figure class="lumi-page-image">
        <img src="${src}" alt="Imagem do livro" />
        <figcaption>Clique aqui para escrever uma legenda</figcaption>
      </figure>
      <p><br /></p>
    `;
    document.execCommand("insertHTML", false, imageHtml);
    syncEditorContent();
    toast.success("Imagem adicionada.");
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Escolha uma imagem.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Use imagens com ate 2,5 MB para manter o livro leve.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") insertImageHtml(reader.result);
    };
    reader.onerror = () => toast.error("Nao foi possivel carregar a imagem.");
    reader.readAsDataURL(file);
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const text = event.clipboardData.getData("text/plain");
    if (!text) return;
    event.preventDefault();
    restoreSelection();
    document.execCommand("insertHTML", false, textToParagraphs(text));
    syncEditorContent();
  };

  const keepEditorSelection = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    rememberSelection();
  };

  useEffect(() => {
    updatePageCount();
  }, [fontSize, updatePageCount]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      if (pageTimerRef.current) clearTimeout(pageTimerRef.current);
    };
  }, []);

  if (loading || !user) {
    return <div className="p-8">Preparando o editor...</div>;
  }

  if (!bookId || !pageId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Card className="p-8 text-center">
          <p className="font-medium text-slate-800">Livro invalido.</p>
          <Button className="mt-4" onClick={() => navigate("/dashboard/student")}>
            Voltar
          </Button>
        </Card>
      </div>
    );
  }

  const breakMarkers = Array.from({ length: Math.max(0, pageCount - 1) });

  return (
    <div className="min-h-screen bg-[#eef4e3]">
      <div className="sticky top-0 z-50 border-b border-emerald-900/10 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await handleSave(editorRef.current?.innerHTML ?? content, title, false, fontSize);
                  navigate(`/books/${bookId}/pages`);
                }}
                aria-label="Voltar"
                title="Voltar"
              >
                <ArrowLeft size={20} />
              </Button>
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge className="bg-emerald-900 text-white">Editor do livro</Badge>
                  <Badge variant="secondary" className="bg-yellow-100 text-emerald-950">
                    {pageCount} pagina{pageCount === 1 ? "" : "s"}
                  </Badge>
                </div>
                <Input
                  value={title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  onBlur={() => canEdit && handleSave(editorRef.current?.innerHTML ?? content, title, false, fontSize)}
                  readOnly={!canEdit}
                  placeholder="Titulo do livro ou capitulo"
                  className="h-auto min-w-0 border-0 bg-transparent p-0 text-xl font-bold text-emerald-950 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-950">
                {wordCount} palavras
                {isSaving ? " | salvando" : lastSavedAt ? ` | salvo ${lastSavedAt.toLocaleTimeString("pt-BR")}` : ""}
              </div>
              {canEdit ? (
                <Button
                  onClick={() => handleSave(editorRef.current?.innerHTML ?? content, title, true, fontSize)}
                  disabled={isSaving}
                  className="gap-2 bg-emerald-800 text-white hover:bg-emerald-900"
                >
                  <Save size={16} />
                  Salvar
                </Button>
              ) : (
                <Badge variant="outline">Somente leitura</Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-900/10 bg-gradient-to-r from-white via-emerald-50 to-yellow-50 p-2">
            {[
              { label: "Desfazer", icon: Undo2, command: "undo" },
              { label: "Refazer", icon: Redo2, command: "redo" },
              { label: "Negrito", icon: Bold, command: "bold" },
              { label: "Italico", icon: Italic, command: "italic" },
              { label: "Titulo principal", icon: Heading1, command: "formatBlock", value: "h1" },
              { label: "Subtitulo", icon: Heading2, command: "formatBlock", value: "h2" },
              { label: "Lista", icon: List, command: "insertUnorderedList" },
              { label: "Lista numerada", icon: ListOrdered, command: "insertOrderedList" },
              { label: "Citacao", icon: Quote, command: "formatBlock", value: "blockquote" },
              { label: "Alinhar esquerda", icon: AlignLeft, command: "justifyLeft" },
              { label: "Centralizar", icon: AlignCenter, command: "justifyCenter" },
              { label: "Alinhar direita", icon: AlignRight, command: "justifyRight" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.label}
                  variant="outline"
                  size="sm"
                  disabled={!canEdit}
                  aria-label={item.label}
                  title={item.label}
                  onMouseDown={keepEditorSelection}
                  onClick={() => runCommand(item.command, item.value)}
                  className="border-emerald-900/15 bg-white hover:bg-emerald-50"
                >
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              disabled={!canEdit}
              onMouseDown={keepEditorSelection}
              onClick={() => imageInputRef.current?.click()}
              className="gap-2 border-blue-200 bg-white text-blue-900 hover:bg-blue-50"
            >
              <ImagePlus className="h-4 w-4" />
              Imagem
            </Button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

            <div className="flex items-center gap-2 pl-2 text-sm text-slate-600">
              <Type className="h-4 w-4" />
              <Input
                type="number"
                disabled={!canEdit}
                min={11}
                max={72}
                step={1}
                value={fontSize}
                aria-label="Tamanho da letra em pixels"
                title="Tamanho da letra em pixels"
                onChange={(event) => handleFontSizeChange(event.target.value)}
                className="h-9 w-20 bg-white text-sm"
              />
              <span className="text-xs font-medium text-slate-500">px</span>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 rounded-2xl border border-emerald-900/10 bg-white/90 p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-950">
                <FileText className="h-4 w-4" />
                Escrita continua com corte de pagina
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Escreva no mesmo documento. Quando passar de uma pagina, aparece um corte e a proxima pagina continua embaixo.
              </p>
            </div>
            <Badge className="w-fit bg-emerald-100 text-emerald-950 hover:bg-emerald-100">
              Imagens liberadas no livro
            </Badge>
          </div>
        </div>

        <div className="lumi-page-stack-frame">
          <div
            className="lumi-page-stack"
            style={
              {
                "--lumi-page-height": `${PAGE_HEIGHT}px`,
                "--lumi-page-gap": `${PAGE_GAP}px`,
                "--lumi-page-count": pageCount,
              } as CSSProperties
            }
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
              {breakMarkers.map((_, index) => (
                <div
                  key={index}
                  className="lumi-inline-page-break"
                  style={{ top: `${(index + 1) * PAGE_HEIGHT + index * PAGE_GAP}px` }}
                >
                  <span>pagina {index + 2}</span>
                </div>
              ))}
            </div>
            <div
              ref={editorRef}
              contentEditable={canEdit}
              suppressContentEditableWarning
              onInput={syncEditorContent}
              onPaste={handlePaste}
              onKeyUp={rememberSelection}
              onMouseUp={rememberSelection}
              onFocus={rememberSelection}
              onBlur={() => canEdit && handleSave(editorRef.current?.innerHTML ?? content, title, false, fontSize)}
              className="lumi-page-stack-editor prose prose-slate max-w-none outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
              style={{ fontSize, minHeight: `${pageCount * PAGE_HEIGHT + Math.max(0, pageCount - 1) * PAGE_GAP}px` }}
              data-placeholder="Comece a escrever. A proxima pagina aparece automaticamente quando o texto crescer."
            />
          </div>
        </div>
      </main>
    </div>
  );
}
