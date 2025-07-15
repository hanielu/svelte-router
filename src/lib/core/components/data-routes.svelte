<script lang="ts">
  import type { Router as DataRouter, RouterState } from "$lib/core/router/router.js";
  import type { DataRouteObject } from "$lib/core/context.js";
  import type { MaybeGetter } from "$lib/utils/index.js";
  import type { Snippet } from "svelte";
  import { useRoutesImpl } from "./use-routes.svelte.js";

  interface Props {
    routes: DataRouteObject[];
    future: DataRouter["future"];
    state: MaybeGetter<RouterState>;
  }

  let { routes, future, state }: Props = $props();

  const rendered = useRoutesImpl(undefined, routes, undefined, state, future);
</script>

{@render rendered()}
