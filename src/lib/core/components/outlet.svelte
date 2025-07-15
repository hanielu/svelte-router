<script lang="ts" module>
  import { Context } from "$lib/utils/context.js";
  import { RouteContext } from "../context.js";

  const OutletContext = Context.boxed<unknown>("OutletContext", null!);
  export const useOutletContext = () => OutletContext.current;
</script>

<script lang="ts">
  let { context }: { context?: unknown } = $props();

  const outlet = $derived(RouteContext.current.outlet);
  OutletContext.setWith(() => context);
</script>

{@render outlet?.()}
