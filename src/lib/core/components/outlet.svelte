<script lang="ts" module>
  import { Context } from "$lib/utils/context.js";
  import { box } from "$lib/utils/box.svelte.js";
  import { RouteContext } from "../context.js";
  import type { RouterValue } from "../reactivity.svelte.js";

  const OutletContext = Context.boxed<unknown>("OutletContext", null!);
  /** A live handle to the nearest Outlet's context; undefined when none is provided. */
  export function useOutletContext<T = unknown>(): RouterValue<T | undefined> {
    const context = OutletContext.getOr({ current: undefined });
    return box.with(() => context.current as T | undefined);
  }
</script>

<script lang="ts">
  let { context }: { context?: unknown } = $props();

  const route = RouteContext.get();
  const outlet = $derived(route.current.outlet);
  OutletContext.setWith(() => context);
</script>

{@render outlet?.()}
