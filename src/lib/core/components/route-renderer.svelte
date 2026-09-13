<script lang="ts">
  import type { Snippet } from "svelte";
  import type { RouteMatch } from "../context.js";
  import { LocationContext } from "../context.js";
  import { Action, type Location } from "../router/history.js";
  import type { RouterState } from "../router/router.js";
  import RouteBranch from "./route-branch.svelte";
  let {
    children,
    registered,
    matches,
    parentMatches,
    state,
    fallbackIndex,
    scopedLocation,
  }: {
    children?: Snippet;
    registered: () => void;
    matches: RouteMatch[];
    parentMatches: RouteMatch[];
    state?: RouterState;
    fallbackIndex?: number;
    scopedLocation?: Location;
  } = $props();
  const inheritedLocation = LocationContext.get();
  LocationContext.setWith(() =>
    scopedLocation
      ? { location: scopedLocation, navigationType: Action.Pop }
      : inheritedLocation.current
  );
  // Route definitions register bottom-up in their effects. Open matching only
  // after that initial static tree has registered; do not watch prop mutations.
  $effect(() => registered());
</script>

{@render children?.()}
{#if matches.length}
  {#key matches[0].route.id ?? matches[0].route}
    <RouteBranch {matches} {parentMatches} {state} {fallbackIndex} index={0} />
  {/key}
{/if}
