<script lang="ts">
  import type { Location } from "../router/history.js";
  import type { RevalidationState } from "../router/router.js";
  import type { Component, Snippet } from "svelte";
  import DefaultErrorComponent from "./default-error-component.svelte";
  import {
    RouteContext,
    RouteErrorContext,
    type RouteContextObject,
  } from "../context.js";

  type RenderErrorBoundaryProps = {
    location: Location;
    revalidation: RevalidationState;
    error: unknown;
    ErrorBoundary?: Component | null;
    errorElement?: Snippet | null;
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
    ErrorBoundary,
    errorElement,
    routeContext,
    children,
  }: RenderErrorBoundaryProps = $props();

  /* ------------------------------------------------------------------
   * Local reactive state that can change after initialisation
   * ----------------------------------------------------------------*/
  let renderError = $state.raw<unknown>(undefined);
  const error = $derived(renderError === undefined ? propError : renderError);

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
  // Snapshots intentionally record the preceding location/revalidation cycle.
  // svelte-ignore state_referenced_locally
  let prevLocation = location;
  // svelte-ignore state_referenced_locally
  let prevRevalidation = revalidation;

  $effect(() => {
    const locationChanged = prevLocation !== location;
    const revalidationFinished =
      prevRevalidation !== "idle" && revalidation === "idle";

    if (resetBoundary && (locationChanged || revalidationFinished)) {
      // Clear error on the boundary itself and in our store
      const reset = resetBoundary;
      renderError = undefined;
      resetBoundary = undefined;
      reset();
    }

    prevLocation = location;
    prevRevalidation = revalidation;
  });
</script>

{#snippet failure()}
  {#if ErrorBoundary}<ErrorBoundary />
  {:else if errorElement}{@render errorElement()}
  {:else}<DefaultErrorComponent />{/if}
{/snippet}

<svelte:boundary
  onerror={(err, reset) => {
    renderError = err;
    resetBoundary = reset;
  }}
>
  {#if error !== undefined}
    {@render failure()}
  {:else}
    {@render children?.()}
  {/if}

  {#snippet failed()}
    {@render failure()}
  {/snippet}
</svelte:boundary>
