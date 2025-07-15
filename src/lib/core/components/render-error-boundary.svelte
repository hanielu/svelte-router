<script lang="ts">
  import type { Location } from "../router/history.js";
  import type { RevalidationState } from "../router/router.js";
  import type { Snippet } from "svelte";
  import { RouteContext, RouteErrorContext, type RouteContextObject } from "../context.js";

  type RenderErrorBoundaryProps = {
    location: Location;
    revalidation: RevalidationState;
    error: any;
    component: Snippet;
    routeContext: RouteContextObject;
    children: Snippet;
  };

  /* ------------------------------------------------------------------
   * Props
   * ----------------------------------------------------------------*/
  let {
    location,
    revalidation,
    error: propError,
    component,
    routeContext,
    children,
  }: RenderErrorBoundaryProps = $props();

  /* ------------------------------------------------------------------
   * Local reactive state that can change after initialisation
   * ----------------------------------------------------------------*/
  let error = $state(propError);

  /* ------------------------------------------------------------------
   * Provide contexts just once at component initialisation.  We pass
   * getters so that consumers always see the latest values without
   * the need to re-call setContext later.
   * ----------------------------------------------------------------*/
  RouteContext.setWith(() => routeContext);
  RouteErrorContext.setWith(() => error);

  /* ------------------------------------------------------------------
   * Book-keeping for automatic reset logic (mirrors React logic)
   * ----------------------------------------------------------------*/
  let resetBoundary: (() => void) | undefined;
  let prevLocation = location;
  let prevRevalidation = revalidation;

  $effect(() => {
    const locationChanged = prevLocation !== location;
    const revalidationFinished = prevRevalidation !== "idle" && revalidation === "idle";

    if (resetBoundary && (locationChanged || revalidationFinished)) {
      // Clear error on the boundary itself and in our store
      resetBoundary();
      error = propError;
    }

    prevLocation = location;
    prevRevalidation = revalidation;
  });
</script>

<svelte:boundary
  onerror={(err, reset) => {
    error = err;
    resetBoundary = reset;
  }}
>
  {#if error !== undefined}
    {@render component?.()}
  {:else}
    {@render children?.()}
  {/if}

  {#snippet failed()}
    {@render component?.()}
  {/snippet}
</svelte:boundary>
