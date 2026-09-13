<script lang="ts">
  import type { RouteMatch, RouteContextObject } from "../context.js";
  import type { RouterState } from "../router/router.js";
  import RouteBranch from "./route-branch.svelte";
  import RenderedRoute from "./rendered-route.svelte";
  import RenderErrorBoundary from "./render-error-boundary.svelte";
  let {
    matches,
    parentMatches,
    state,
    fallbackIndex,
    index,
  }: {
    matches: RouteMatch[];
    parentMatches: RouteMatch[];
    state?: RouterState;
    fallbackIndex?: number;
    index: number;
  } = $props();
  const match = $derived(matches[index]);
  const routeContext = $derived<RouteContextObject>({
    outlet: index + 1 < matches.length ? outlet : null,
    matches: parentMatches.concat(matches.slice(0, index + 1)),
    isDataRoute: state != null,
  });
  const fallback = $derived(index === fallbackIndex);
  const Component = $derived(
    fallback ? match.route.HydrateFallback : match.route.Component
  );
  const element = $derived(
    fallback
      ? (match.route.hydrateFallbackElement ?? null)
      : match.route.element
  );
</script>

{#snippet outlet()}
  {#if matches[index + 1]}
    {#key matches[index + 1].route.id ?? matches[index + 1].route}
      <RouteBranch
        {matches}
        {parentMatches}
        {state}
        {fallbackIndex}
        index={index + 1}
      />
    {/key}
  {/if}
{/snippet}

{#snippet content()}
  <RenderedRoute {match} {routeContext} {Component} children={element} />
{/snippet}

{#if state && (index === 0 || match.route.ErrorBoundary || match.route.errorElement)}
  <RenderErrorBoundary
    location={state.location}
    revalidation={state.revalidation}
    error={match.route.id != null ? state.errors?.[match.route.id] : undefined}
    ErrorBoundary={match.route.ErrorBoundary}
    errorElement={match.route.errorElement}
    routeContext={{ ...routeContext, outlet: null }}
    children={content}
  />
{:else}
  {@render content()}
{/if}
