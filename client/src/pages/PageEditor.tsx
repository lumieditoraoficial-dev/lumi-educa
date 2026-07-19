import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePageSeo } from "@/lib/seo";
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
const PAGE_GAP = 54;
const PAGE_MARGIN_TOP = 64;
const PAGE_MARGIN_BOTTOM = 76;
const PAGE_STRIDE = PAGE_HEIGHT + PAGE_GAP;
const AUTO_PAGE_BREAK_SELECTOR = "[data-lumi-auto-page-break='true']";
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
    return { html: removeAutoPageBreaks(savedContent), fontSize: 17, pageCount: 1 };
  }

  const documentParser = new DOMParser();
  const parsed = documentParser.parseFromString(savedContent, "text/html");
  const wrapper = parsed.querySelector("[data-lumi-page-content]") as HTMLElement | null;
  const parsedFontSize = Number.parseInt(wrapper?.style.fontSize ?? "", 10);
  const parsedPageCount = Number.parseInt(wrapper?.dataset.lumiPageCount ?? "", 10);

  return {
    html: removeAutoPageBreaks(wrapper?.innerHTML ?? savedContent),
    fontSize: Number.isFinite(parsedFontSize) ? parsedFontSize : 17,
    pageCount: Number.isFinite(parsedPageCount) && parsedPageCount > 0 ? parsedPageCount : 1,
  };
}

function serializeContent(html: string, fontSize: number, pageCount: number) {
  const normalizedPageCount = Math.max(1, Math.ceil(pageCount || 1));
  return `<div data-lumi-page-content="true" data-lumi-version="6" data-lumi-page-count="${normalizedPageCount}" style="font-size: ${fontSize}px;">${removeAutoPageBreaks(html)}</div>`;
}

function calculatePageCount(element: HTMLDivElement | null) {
  if (!element) return 1;
  const contentHeight = Math.max(PAGE_HEIGHT, element.scrollHeight);
  return Math.max(1, Math.ceil((contentHeight + PAGE_GAP) / PAGE_STRIDE));
}

function removeAutoPageBreaks(html: string) {
  if (typeof window === "undefined" || !html.includes("data-lumi-auto-page-break")) return html;
  const documentParser = new DOMParser();
  const parsed = documentParser.parseFromString(`<main>${html}</main>`, "text/html");
  parsed.querySelectorAll(AUTO_PAGE_BREAK_SELECTOR).forEach((breakElement) => breakElement.remove());
  return parsed.querySelector("main")?.innerHTML ?? html;
}

function removeAutoPageBreakElements(editor: HTMLElement) {
  editor.querySelectorAll(AUTO_PAGE_BREAK_SELECTOR).forEach((breakElement) => breakElement.remove());
}

function createAutoPageBreak(height: number, pageNumber: number) {
  const breakElement = document.createElement("div");
  breakElement.className = "lumi-inline-page-break";
  breakElement.dataset.lumiAutoPageBreak = "true";
  breakElement.contentEditable = "false";
  breakElement.style.height = `${Math.max(PAGE_GAP, Math.ceil(height))}px`;
  breakElement.innerHTML = `<span>pagina ${pageNumber}</span>`;
  return breakElement;
}

function wrapLooseTextNodes(editor: HTMLDivElement) {
  Array.from(editor.childNodes).forEach((node) => {
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) return;
    const paragraph = document.createElement("p");
    paragraph.textContent = node.textContent;
    node.replaceWith(paragraph);
  });
}

function cloneBareTextBlock(element: HTMLElement, text: string) {
  const clone = element.cloneNode(false) as HTMLElement;
  clone.textContent = text;
  return clone;
}

function splitPlainTextBlock(element: HTMLElement, contentEnd: number, nextContentStart: number, nextPageNumber: number) {
  const tagName = element.tagName.toLowerCase();
  if (!["p", "div", "li"].includes(tagName)) return false;

  const originalText = element.textContent ?? "";
  const originalHtml = element.innerHTML;
  if (originalText.trim().length < 80) return false;

  let low = 12;
  let high = originalText.length - 12;
  let best = 0;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    element.textContent = originalText.slice(0, middle);
    const bottom = element.offsetTop + element.offsetHeight;

    if (bottom <= contentEnd) {
      best = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  if (best < 24 || best >= originalText.length - 24) {
    element.innerHTML = originalHtml;
    return false;
  }

  const naturalSplit = originalText.lastIndexOf(" ", best);
  const splitIndex = naturalSplit > 24 ? naturalSplit : best;
  const firstPart = originalText.slice(0, splitIndex).trimEnd();
  const secondPart = originalText.slice(splitIndex).trimStart();

  if (!firstPart || !secondPart) {
    element.innerHTML = originalHtml;
    return false;
  }

  element.textContent = firstPart;
  const breakHeight = Math.max(PAGE_GAP + PAGE_MARGIN_TOP, nextContentStart - (element.offsetTop + element.offsetHeight));
  element.after(createAutoPageBreak(breakHeight, nextPageNumber), cloneBareTextBlock(element, secondPart));
  return true;
}

function normalizePageFlow(editor: HTMLDivElement | null) {
  if (!editor) return 1;

  removeAutoPageBreakElements(editor);
  wrapLooseTextNodes(editor);

  let guard = 0;
  while (guard < 120) {
    guard += 1;
    let changed = false;
    const elements = Array.from(editor.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && !child.matches(AUTO_PAGE_BREAK_SELECTOR)
    );

    for (const element of elements) {
      const top = element.offsetTop;
      const height = element.offsetHeight;
      if (height <= 0) continue;

      const pageIndex = Math.max(0, Math.floor(top / PAGE_STRIDE));
      const pageStart = pageIndex * PAGE_STRIDE;
      const contentEnd = pageStart + PAGE_HEIGHT - PAGE_MARGIN_BOTTOM;
      const nextContentStart = pageStart + PAGE_STRIDE + PAGE_MARGIN_TOP;
      const bottom = top + height;

      if (bottom <= contentEnd || top >= nextContentStart) continue;

      const pageContentHeight = PAGE_HEIGHT - PAGE_MARGIN_TOP - PAGE_MARGIN_BOTTOM;
      const startsAtPageTop = top <= pageStart + PAGE_MARGIN_TOP + 8;
      const shouldSplitLongText = height > pageContentHeight && contentEnd - top > 120;

      if (shouldSplitLongText && splitPlainTextBlock(element, contentEnd, nextContentStart, pageIndex + 2)) {
        changed = true;
        break;
      }

      if (startsAtPageTop && height > pageContentHeight) continue;

      element.before(createAutoPageBreak(nextContentStart - top, pageIndex + 2));
      changed = true;
      break;
    }

    if (!changed) break;
  }

  return calculatePageCount(editor);
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
  usePageSeo({
    title: book?.title ? `Escrever ${book.title} | Lumi Educa` : "Escrever livro | Lumi Educa",
    description: "Editor de livros Lumi Educa.",
    canonicalPath: "/page-editor",
    robots: "noindex, nofollow",
  });
  const updatePageMutation = trpc.books.updatePageContent.useMutation();
  const currentPage = pages.find((page) => page.id === pageId);
  const pageIsLocked = currentPage?.status === "published" || (book?.status === "published" && currentPage?.status === "approved");
  const canEdit = user?.role === "student" && book?.authorId === user.id && !pageIsLocked;

  const getCleanEditorHtml = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return content;
    const clone = editor.cloneNode(true) as HTMLDivElement;
    removeAutoPageBreakElements(clone);
    return clone.innerHTML;
  }, [content]);

  const updatePageCount = useCallback(() => {
    if (pageTimerRef.current) clearTimeout(pageTimerRef.current);
    pageTimerRef.current = setTimeout(() => {
      setPageCount(normalizePageFlow(editorRef.current));
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
    setPageCount(parsedContent.pageCount);
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
        const visualPageCount = editorRef.current ? normalizePageFlow(editorRef.current) : pageCount;
        const cleanContent = editorRef.current ? getCleanEditorHtml() : contentToSave;
        setPageCount(visualPageCount);
        setContent(cleanContent);
        setWordCount(countWords(cleanContent));
        await updatePageMutation.mutateAsync({
          pageId,
          title: titleToSave,
          content: serializeContent(cleanContent, fontSizeToSave, visualPageCount),
        });
        dirtyRef.current = false;
        setLastSavedAt(new Date());
        if (showToast) {
          await utils.books.getPages.invalidate({ bookId });
          await utils.books.getBook.invalidate({ bookId });
          await utils.books.myBooks.invalidate();
          await utils.books.listBooks.invalidate();
          toast.success("Texto salvo.");
        }
      } catch {
        toast.error("Erro ao salvar o texto.");
      } finally {
        setIsSaving(false);
      }
    },
    [bookId, canEdit, content, fontSize, getCleanEditorHtml, pageCount, pageId, title, updatePageMutation, utils.books.getBook, utils.books.getPages, utils.books.listBooks, utils.books.myBooks]
  );

  useEffect(() => {
    if (!currentPage || !canEdit || dirtyRef.current) return;
    const savedPageCount = parseSavedContent(currentPage.content ?? "").pageCount;
    if (savedPageCount === pageCount) return;

    const timer = window.setTimeout(() => {
      void handleSave(content, title, false, fontSize);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [canEdit, content, currentPage, fontSize, handleSave, pageCount, title]);

  useEffect(() => {
    return () => {
      if (!bookId) return;
      void utils.books.getBook.invalidate({ bookId });
      void utils.books.getPages.invalidate({ bookId });
      void utils.books.myBooks.invalidate();
      void utils.books.listBooks.invalidate();
    };
  }, [bookId]);

  const scheduleAutoSave = (nextContent = content, nextTitle = title, nextFontSize = fontSize) => {
    if (!canEdit) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(nextContent, nextTitle, false, nextFontSize);
    }, 9000);
  };

  const syncEditorContent = () => {
    const html = getCleanEditorHtml();
    dirtyRef.current = true;
    setContent(html);
    setWordCount(countWords(html));
    updatePageCount();
    scheduleAutoSave(html, title);
  };

  const handleTitleChange = (newTitle: string) => {
    dirtyRef.current = true;
    setTitle(newTitle);
    scheduleAutoSave(getCleanEditorHtml(), newTitle);
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
    const html = getCleanEditorHtml();
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

  return (
    <div className="lumi-page-aura min-h-screen">
      <div className="sticky top-0 z-50 border-b border-emerald-900/10 bg-white/94 shadow-[0_14px_38px_rgba(15,61,46,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await handleSave(getCleanEditorHtml(), title, false, fontSize);
                  navigate(`/books/${bookId}/pages`);
                }}
                aria-label="Voltar"
                title="Voltar"
              >
                <ArrowLeft size={20} />
              </Button>
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge className="bg-emerald-900 text-white">Documento oficial</Badge>
                  <Badge variant="secondary" className="bg-yellow-100 text-emerald-950">
                    {pageCount} pagina{pageCount === 1 ? "" : "s"}
                  </Badge>
                </div>
                <Input
                  value={title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  onBlur={() => canEdit && handleSave(getCleanEditorHtml(), title, false, fontSize)}
                  readOnly={!canEdit}
                  placeholder="Titulo do livro ou capitulo"
                  className="h-auto min-w-0 border-0 bg-transparent p-0 text-xl font-bold text-emerald-950 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-emerald-900/10 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-950">
                {wordCount} palavras
                {isSaving ? " | salvando" : lastSavedAt ? ` | salvo ${lastSavedAt.toLocaleTimeString("pt-BR")}` : ""}
              </div>
              {canEdit ? (
                <Button
                  onClick={() => handleSave(getCleanEditorHtml(), title, true, fontSize)}
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

          <div className="lumi-command-bar flex flex-wrap items-center gap-2 rounded-lg p-2">
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
        <div className="mb-4 rounded-lg border border-emerald-900/10 bg-white/92 p-5 shadow-[0_14px_36px_rgba(15,61,46,0.07)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-emerald-950">
                <FileText className="h-4 w-4" />
                Documento do livro
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">Escreva em fluxo continuo. O corte de pagina aparece sozinho durante a escrita.</p>
            </div>
            <Badge className="w-fit bg-emerald-100 text-emerald-950 hover:bg-emerald-100">
              Livro em edição
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
            <div
              ref={editorRef}
              contentEditable={canEdit}
              suppressContentEditableWarning
              onInput={syncEditorContent}
              onPaste={handlePaste}
              onKeyUp={rememberSelection}
              onMouseUp={rememberSelection}
              onFocus={rememberSelection}
              onBlur={() => canEdit && handleSave(getCleanEditorHtml(), title, false, fontSize)}
              className="lumi-page-stack-editor prose prose-slate max-w-none outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
              style={{ fontSize, minHeight: `${PAGE_HEIGHT}px` }}
              data-placeholder="Comece a escrever seu livro."
            />
          </div>
        </div>
      </main>
    </div>
  );
}
