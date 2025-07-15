// export const ssr = false;
// export const prerender = true;

export async function load() {
  // Load demo source files as raw text
  const demoFiles = import.meta.glob("/src/lib/internal/components/pages/**/*.svelte", {
    query: "?raw",
    import: "default",
    eager: true,
  });

  // Organize files by mode and type
  const codeExamples: Record<string, Record<string, string>> = {
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
    codeExamples[mode][name] = content as string;
  }

  return {
    codeExamples,
  };
}
