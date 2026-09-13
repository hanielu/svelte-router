<script lang="ts">
  import { Route } from "svelte-router";
  import type { RouteObject } from "../../core/context.js";
  import RouteDefinitions from "./route-definitions.svelte";

  const { routes }: { routes: RouteObject[] } = $props();
</script>

{#each routes as route}
  {#if route.index}
    <Route index path={route.path} id={route.id} Component={route.Component} element={route.element} />
  {:else}
    <Route path={route.path} id={route.id} Component={route.Component} element={route.element}>
      {#if route.children}<RouteDefinitions routes={route.children} />{/if}
    </Route>
  {/if}
{/each}
