import { useEffect } from "react";

type PageSeoOptions = {
  title: string;
  description: string;
  canonicalPath?: string;
  robots?: string;
  imagePath?: string;
};

function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}${normalizedPath}`;
}

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.content = content;
}

function setCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }

  element.href = href;
}

export function usePageSeo({ title, description, canonicalPath, robots = "index, follow", imagePath = "/lumi-educa-logo.png" }: PageSeoOptions) {
  useEffect(() => {
    const fullTitle = title.includes("Lumi Educa") ? title : `${title} | Lumi Educa`;
    const canonical = absoluteUrl(canonicalPath ?? window.location.pathname);
    const image = absoluteUrl(imagePath);

    document.title = fullTitle;
    setCanonical(canonical);
    setMeta("name", "description", description);
    setMeta("name", "robots", robots);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:image", image);
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image);
  }, [canonicalPath, description, imagePath, robots, title]);
}
