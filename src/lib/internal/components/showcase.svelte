<script lang="ts" module>
  export type RouterType = "browser" | "hash" | "memory";
  export type DemoMode = "declarative" | "data";
</script>

<script lang="ts">
  import CodePanel from "./code-panel.svelte";
  import DemoPanel from "./demo-panel.svelte";
  import RouterSelector from "./router-selector.svelte";
  import { fly } from "svelte/transition";

  interface ShowcaseProps {
    codeExamples: Record<string, Record<string, string>>;
  }

  let { codeExamples }: ShowcaseProps = $props();
  let routerType: RouterType = $state("browser");
  let activeTab: DemoMode = $state("declarative");
</script>

<section class="bg-muted/30 py-24 sm:py-32">
  <div class="mx-auto max-w-7xl px-6 lg:px-8">
    <div in:fly|global={{ y: 20, duration: 600 }} class="space-y-12">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold text-foreground">Routing Patterns</h2>
      </div>

      <div class="flex items-center justify-between mb-8">
        <div class="bg-card border border-border p-1 rounded-xl">
          <button
            class={[
              "rounded-lg px-6 py-2 text-sm font-medium transition-colors",
              activeTab === "declarative"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            ]}
            onclick={() => (activeTab = "declarative")}
          >
            Declarative
          </button>
          <button
            class={[
              "rounded-lg px-6 py-2 text-sm font-medium transition-colors",
              activeTab === "data"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            ]}
            onclick={() => (activeTab = "data")}
          >
            Data
          </button>
        </div>

        <RouterSelector bind:routerType />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DemoPanel mode={activeTab} {routerType} />
        <CodePanel mode={activeTab} {routerType} {codeExamples} />
      </div>
    </div>
  </div>
</section>
