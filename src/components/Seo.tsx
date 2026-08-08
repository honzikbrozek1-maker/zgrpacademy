import { useEffect } from "react";

type SeoProps = {
  title?: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  robots?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  jsonLdId?: string;
};

function setMeta(attr: "name" | "property", key: string, content?: string) {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export default function Seo({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  ogUrl,
  robots,
  jsonLd,
  jsonLdId = "route-jsonld",
}: SeoProps) {
  useEffect(() => {
    if (title) document.title = title;
    setMeta("name", "description", description);
    setMeta("name", "robots", robots);
    setMeta("property", "og:title", ogTitle ?? title);
    setMeta("property", "og:description", ogDescription ?? description);
    setMeta("property", "og:url", ogUrl ?? canonical);
    setMeta("name", "twitter:title", ogTitle ?? title);
    setMeta("name", "twitter:description", ogDescription ?? description);

    if (canonical) {
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonical;
    }

    if (!jsonLd) return;
    let script = document.head.querySelector<HTMLScriptElement>(`script[data-seo-id="${jsonLdId}"]`);
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-seo-id", jsonLdId);
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);
    return () => {
      script?.remove();
    };
  }, [title, description, canonical, ogTitle, ogDescription, ogUrl, robots, jsonLd, jsonLdId]);

  return null;
}

