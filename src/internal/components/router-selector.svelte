<script lang="ts">
  import { Button } from "$ui/button/index.js";
  import type { RouterType } from "./showcase.svelte";

  interface RouterSelectorProps {
    routerType: RouterType;
  }

  let { routerType = $bindable() }: RouterSelectorProps = $props();

  const routers: { type: RouterType; label: string }[] = [
    { type: "browser", label: "BrowserRouter" },
    { type: "hash", label: "HashRouter" },
    { type: "memory", label: "MemoryRouter" },
  ];
</script>

<div class="flex items-center gap-2">
  {#each routers as router}
    <Button
      variant={routerType === router.type ? "default" : "outline"}
      size="sm"
      onclick={() => (routerType = router.type)}
      class={[
        "rounded-full px-3 py-2 text-xs font-medium transition-all sm:px-4 sm:text-sm",
        routerType === router.type
          ? "bg-foreground text-background hover:bg-foreground/90"
          : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground",
      ]}
    >
      {router.label}
    </Button>
  {/each}
</div>
