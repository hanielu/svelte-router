<script lang="ts">
  import { cn, type WithElementRef } from "$internal/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div bind:this={ref} data-slot="card-header" class={cn("p-6", className)} {...restProps}>
  {@render children?.()}
</div>
