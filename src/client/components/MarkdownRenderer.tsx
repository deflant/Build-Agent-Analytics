import React, { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import mermaid from "mermaid";

// Initialize mermaid with safe defaults
let mermaidInitialized = false;
function initMermaid() {
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: "neutral",
      securityLevel: "loose",
      fontFamily: "var(--now-font-family, sans-serif)",
    });
    mermaidInitialized = true;
  }
}

interface MarkdownRendererProps {
  content: string;
}

/**
 * Renders Markdown content as HTML with Mermaid diagram support.
 * Mermaid code blocks (```mermaid ... ```) are rendered as SVG diagrams.
 */
export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState("");
  const renderIdRef = useRef(0);

  useEffect(() => {
    initMermaid();
  }, []);

  // Parse markdown whenever content changes
  useEffect(() => {
    if (!content) {
      setHtml("");
      return;
    }

    // Configure marked with custom renderer for mermaid blocks
    const renderer = new marked.Renderer();

    // Override code block rendering to detect mermaid
    renderer.code = function (code: string, infostring: string) {
      const lang = (infostring || "").trim().split(/\s+/)[0];
      if (lang === "mermaid") {
        // Return a placeholder div that we'll render mermaid into
        return `<div class="mermaid-placeholder" data-mermaid="${encodeURIComponent(code)}"></div>`;
      }
      // For other code blocks, use default rendering
      const escaped = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const langClass = lang ? ` class="language-${lang}"` : "";
      return `<pre><code${langClass}>${escaped}</code></pre>`;
    };

    const parsed = marked(content, {
      renderer,
      gfm: true,
      breaks: true,
    });

    // marked can return string or Promise<string>
    if (typeof parsed === "string") {
      setHtml(parsed);
    } else {
      parsed.then((result) => setHtml(result));
    }
  }, [content]);

  // Render mermaid diagrams after HTML is injected
  useEffect(() => {
    if (!containerRef.current || !html) return;

    const placeholders = containerRef.current.querySelectorAll(".mermaid-placeholder");
    if (placeholders.length === 0) return;

    renderIdRef.current += 1;
    const currentRenderId = renderIdRef.current;

    async function renderDiagrams() {
      for (let i = 0; i < placeholders.length; i++) {
        // Bail if content changed while we were rendering
        if (renderIdRef.current !== currentRenderId) return;

        const el = placeholders[i] as HTMLElement;
        const mermaidSource = decodeURIComponent(el.getAttribute("data-mermaid") || "");
        if (!mermaidSource) continue;

        try {
          const id = `mermaid-diagram-${currentRenderId}-${i}`;
          const { svg } = await mermaid.render(id, mermaidSource);
          el.innerHTML = svg;
          el.classList.add("mermaid-rendered");
        } catch (err) {
          // On failure, show the source code as a fallback
          el.innerHTML = `<pre class="mermaid-error"><code>${mermaidSource.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;
          el.classList.add("mermaid-error-container");
        }
      }
    }

    renderDiagrams();
  }, [html]);

  if (!content) return null;

  return (
    <div
      ref={containerRef}
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
