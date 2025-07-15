<script lang="ts">
  import { Tabs as TabsPrimitive } from "bits-ui";
  import { cn } from "$internal/utils.js";

  let { ref = $bindable(null), class: className, ...restProps }: TabsPrimitive.ListProps = $props();
</script>

<TabsPrimitive.List
  bind:ref
  class={cn(
    "inline-flex h-9 items-center justify-center rounded-full bg-muted p-1 text-muted-foreground",
    className
  )}
  {...restProps}
/>
