// export const ssr = false;
export const prerender = true;

import { highlightCode } from "$internal/utils.js";

export async function load() {
  // Load demo source files as raw text
  const demoFiles = import.meta.glob("/src/internal/components/pages/**/*.svelte", {
    query: "?raw",
    import: "default",
    eager: true,
  });

  // Organize files by mode and type
  const codeExamples: Record<string, Record<string, string>> = {
    declarative: {},
    data: {},
  };

  const highlightedCodeExamples: Record<string, Record<string, string>> = {
    declarative: {},
    data: {},
  };

  // Process the loaded files
  for (const [path, content] of Object.entries(demoFiles)) {
    const pathParts = path.split("/");
    const mode = pathParts.includes("declarative") ? "declarative" : "data";
    const filename = pathParts[pathParts.length - 1];

    // Include all files including router.svelte
    const name = filename.replace(".svelte", "");
    const rawContent = content as string;

    codeExamples[mode][name] = rawContent;

    // Highlight the code during prerender
    try {
      highlightedCodeExamples[mode][name] = await highlightCode(
        rawContent,
        "svelte",
        "github-dark"
      );
    } catch (error) {
      console.warn(`Failed to highlight ${mode}/${name}:`, error);
      // Fallback to escaped HTML
      highlightedCodeExamples[mode][name] = `<pre class="shiki"><code>${rawContent
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</code></pre>`;
    }
  }

  return {
    codeExamples,
    highlightedCodeExamples,
  };
}
