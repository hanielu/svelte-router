import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
// import {
//   createHighlighter,
//   type Highlighter,
//   type BundledLanguage,
//   type BundledTheme,
// } from "shiki/bundle/web";

import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Shiki highlighter instance
let highlighter: HighlighterCore | null = null;

// Initialize Shiki highlighter
async function initHighlighter() {
  if (!highlighter) {
    highlighter = await createHighlighterCore({
      themes: [import("shiki/themes/github-dark.mjs")],
      langs: [import("shiki/langs/svelte.mjs")],
      engine: createOnigurumaEngine(import("shiki/wasm")),
    });
  }
  return highlighter;
}

// Highlight code with Shiki
export async function highlightCode(code: string): Promise<string> {
  try {
    const hl = await initHighlighter();
    return hl.codeToHtml(code, {
      lang: "svelte",
      theme: "github-dark",
      transformers: [
        {
          name: "remove-background",
          pre(node) {
            // Remove background color to use our custom styling
            this.addClassToHast(node, "shiki-no-bg");
          },
        },
      ],
    });
  } catch (error) {
    console.warn("Failed to highlight code:", error);
    // Fallback to plain text with basic HTML escaping
    return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
  }
}

// Simple HTML escape function (works in both browser and server)
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
