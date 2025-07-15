<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from "$ui/card/index.js";
  import { Button } from "$ui/button/index.js";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "$ui/tabs/index.js";
  import Copy from "~icons/lucide/copy";
  import Github from "~icons/lucide/github";
  import Check from "~icons/lucide/check";
  import type { DemoMode, RouterType } from "./showcase.svelte";
  import { fade } from "svelte/transition";
  import { getRouterFeatures, getRouterDescription } from "$internal/data.js";
  import { highlightCode } from "$internal/utils.js";

  interface CodePanelProps {
    mode: DemoMode;
    routerType: RouterType;
    codeExamples: Record<string, Record<string, string>>;
  }

  let { mode, routerType, codeExamples }: CodePanelProps = $props();

  let copied = $state(false);
  let activeTab = $state("router");
  let highlightedCode = $state<Record<string, string>>({});
  let isHighlighting = $state(false);

  // Get available files for the current mode, with router first
  const getOrderedFiles = (examples: Record<string, string>) => {
    const files = Object.keys(examples);
    const ordered = [];

    // Put router first if it exists
    if (files.includes("router")) {
      ordered.push("router");
    }

    // Add other files in a logical order
    const pageOrder = ["home", "profile", "settings"];
    for (const page of pageOrder) {
      if (files.includes(page)) {
        ordered.push(page);
      }
    }

    // Add any remaining files
    for (const file of files) {
      if (!ordered.includes(file)) {
        ordered.push(file);
      }
    }

    return ordered;
  };

  // Get available files for the current mode
  $effect(() => {
    const examples = codeExamples[mode];
    if (examples) {
      const orderedFiles = getOrderedFiles(examples);
      // Reset to first available file if current tab doesn't exist
      if (!orderedFiles.includes(activeTab)) {
        activeTab = orderedFiles[0] || "router";
      }
    }
  });

  // Highlight code when mode, activeTab, or codeExamples change
  $effect(() => {
    const examples = codeExamples[mode];
    if (examples && examples[activeTab]) {
      const cacheKey = `${mode}-${activeTab}`;

      // Check if we already have highlighted code for this combination
      if (!highlightedCode[cacheKey]) {
        isHighlighting = true;

        // Get raw code without comments for highlighting
        const rawCode = examples[activeTab];

        highlightCode(rawCode, "svelte", "github-dark")
          .then(highlighted => {
            // Only update if we're still on the same tab
            if (`${mode}-${activeTab}` === cacheKey) {
              highlightedCode[cacheKey] = highlighted;
              isHighlighting = false;
            }
          })
          .catch(error => {
            console.warn("Failed to highlight code:", error);
            if (`${mode}-${activeTab}` === cacheKey) {
              highlightedCode[cacheKey] =
                `<pre class="shiki"><code>${rawCode.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;
              isHighlighting = false;
            }
          });
      } else {
        isHighlighting = false;
      }
    }
  });

  const getGitHubUrl = () => {
    return `https://github.com/your-org/svelte-router/examples/${mode}-${routerType}`;
  };

  const getCurrentFileContent = () => {
    const examples = codeExamples[mode];
    if (!examples || !examples[activeTab]) {
      return `// No ${activeTab} example found for ${mode} mode`;
    }

    // Add descriptive comments based on file type
    let description = "";
    if (activeTab === "router") {
      description = `Router Configuration - Shows how ${routerType.charAt(0).toUpperCase() + routerType.slice(1)}Router is set up for ${mode} routing`;
    } else {
      description = `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Page - Example of a ${mode} route component`;
    }

    return `<!-- ${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode with ${routerType.charAt(0).toUpperCase() + routerType.slice(1)}Router -->
<!-- ${description} -->
<!-- File: ${activeTab}.svelte -->

${examples[activeTab]}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getCurrentFileContent());
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };
</script>

<Card class="bg-card border border-border shadow-sm rounded-2xl overflow-hidden">
  <CardHeader
    class="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border"
  >
    <CardTitle class="text-lg font-semibold text-card-foreground">
      {mode === "declarative" ? "Declarative" : "Data"} Routing
    </CardTitle>
    <Button
      class="bg-foreground hover:bg-foreground/90 text-background rounded-full px-4 py-2 text-sm font-medium"
    >
      <a href={getGitHubUrl()} target="_blank" class="flex items-center gap-2">
        <Github class="w-4 h-4" />
        View Code
      </a>
    </Button>
  </CardHeader>
  <CardContent class="p-6 space-y-6">
    <!-- Router Description -->
    <div class="bg-muted/50 rounded-lg p-4">
      <h3 class="font-semibold mb-2 text-sm">
        Router Type: {routerType.charAt(0).toUpperCase() + routerType.slice(1)} Router
      </h3>
      <p class="text-sm text-muted-foreground">{getRouterDescription(routerType)}</p>
    </div>

    <!-- Features List -->
    <div class="space-y-3">
      <h3 class="font-semibold text-sm">Key Features</h3>
      <ul class="space-y-2">
        {#each getRouterFeatures(mode) as feature}
          <li class="flex items-center gap-2 text-sm">
            <Check class="w-4 h-4 text-green-500 flex-shrink-0" />
            <span class="text-muted-foreground">{feature}</span>
          </li>
        {/each}
      </ul>
    </div>

    <!-- Code Example with Tabs -->
    <div transition:fade|global={{ duration: 300 }} class="relative">
      {#if codeExamples[mode]}
        <Tabs bind:value={activeTab} class="w-full">
          <div class="flex items-center justify-between mb-3">
            <TabsList
              class="grid w-full"
              style="grid-template-columns: repeat({getOrderedFiles(codeExamples[mode])
                .length}, minmax(0, 1fr))"
            >
              {#each getOrderedFiles(codeExamples[mode]) as fileName}
                <TabsTrigger value={fileName} class="capitalize">
                  {fileName === "router" ? "🔧 Router" : fileName}
                </TabsTrigger>
              {/each}
            </TabsList>
            <Button
              onclick={copyToClipboard}
              size="sm"
              variant="outline"
              class="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg ml-3"
            >
              {#if copied}
                <Check class="w-3 h-3" />
              {:else}
                <Copy class="w-3 h-3" />
              {/if}
            </Button>
          </div>

          {#each getOrderedFiles(codeExamples[mode]) as fileName}
            <TabsContent value={fileName}>
              <div
                class="bg-slate-900 dark:bg-slate-950 rounded-xl overflow-hidden max-h-80 overflow-y-auto"
              >
                {#if isHighlighting && fileName === activeTab}
                  <div class="p-4 text-slate-300 text-sm">
                    <div class="animate-pulse">Highlighting code...</div>
                  </div>
                {:else}
                  {@const cacheKey = `${mode}-${fileName}`}
                  {#if highlightedCode[cacheKey] && fileName === activeTab}
                    <div class="shiki-container text-sm">
                      {@html highlightedCode[cacheKey]}
                    </div>
                  {:else if fileName === activeTab}
                    <div class="p-4">
                      <pre class="text-sm text-slate-100">
                        <code class="font-mono whitespace-pre"
                          >{codeExamples[mode][fileName] || "No content available"}</code
                        >
                      </pre>
                    </div>
                  {:else}
                    <!-- Non-active tabs show plain content for now -->
                    <div class="p-4">
                      <pre class="text-sm text-slate-100">
                        <code class="font-mono whitespace-pre"
                          >{codeExamples[mode][fileName] || "No content available"}</code
                        >
                      </pre>
                    </div>
                  {/if}
                {/if}
              </div>
            </TabsContent>
          {/each}
        </Tabs>
      {:else}
        <div class="bg-slate-900 dark:bg-slate-950 rounded-xl p-4">
          <pre class="text-sm text-slate-100">
            <code class="font-mono whitespace-pre">// No examples found for {mode} mode</code>
          </pre>
        </div>
      {/if}
    </div>
  </CardContent>
</Card>

<style>
  :global(.shiki-container) {
    overflow-x: auto;
  }

  :global(.shiki-container .shiki) {
    background: transparent !important;
    padding: 1rem;
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.5;
    overflow-x: auto;
  }

  :global(.shiki-container .shiki.shiki-no-bg) {
    background: transparent !important;
  }

  :global(.shiki-container .shiki code) {
    background: transparent;
    padding: 0;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono",
      "Courier New", monospace;
  }

  :global(.shiki-container .shiki .line) {
    min-height: 1.5rem;
  }

  /* Ensure proper scrolling for long lines */
  :global(.shiki-container .shiki pre) {
    white-space: pre;
    word-wrap: normal;
    overflow-x: auto;
  }
</style>
