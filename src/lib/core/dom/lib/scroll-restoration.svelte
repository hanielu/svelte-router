<script lang="ts" module>
  import type { ScrollRestorationOptions } from "./use-scroll-restoration.svelte.js";
  export type ScrollRestorationProps = ScrollRestorationOptions;
</script>

<script lang="ts">
  import { useScrollRestoration } from "./use-scroll-restoration.svelte.js";
  import { readRouterInput } from "../../reactivity.svelte.js";
  let { getKey, storageKey, target, ready }: ScrollRestorationProps = $props();
  useScrollRestoration({
    getKey: (location, matches) => getKey?.(location, matches) ?? location.key,
    // svelte-ignore state_referenced_locally
    storageKey,
    get target() {
      return target === undefined ? undefined : () => readRouterInput(target!);
    },
    ready: () => readRouterInput(ready ?? true),
  });
</script>
