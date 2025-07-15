<script lang="ts">
  import type { DemoMode, RouterType } from "./showcase.svelte";
  import { Card, CardContent, CardHeader, CardTitle } from "$ui/card/index.js";
  import { fly } from "svelte/transition";

  // Import the router components
  import DeclarativeRouter from "./pages/declarative/router.svelte";
  import DataRouter from "./pages/data/router.svelte";

  interface DemoPanelProps {
    mode: DemoMode;
    routerType: RouterType;
  }

  let { mode, routerType }: DemoPanelProps = $props();
</script>

<Card class="bg-card border border-border shadow-sm rounded-2xl overflow-hidden">
  <CardHeader class="border-b border-border bg-muted/30">
    <CardTitle class="flex items-center gap-3 text-lg font-semibold text-card-foreground">
      <div class="w-2 h-2 bg-green-500 rounded-full"></div>
      Live Demo
      <span class="text-sm font-normal text-muted-foreground">
        {mode === "declarative" ? "Declarative" : "Data"} Mode
      </span>
    </CardTitle>
  </CardHeader>
  <CardContent class="p-0">
    {#key `${mode}-${routerType}`}
      <div in:fly|global={{ y: 20, duration: 300 }} class="p-6">
        {#if mode === "declarative"}
          <DeclarativeRouter {routerType} />
        {:else}
          <DataRouter {routerType} />
        {/if}
      </div>
    {/key}
  </CardContent>
</Card>
