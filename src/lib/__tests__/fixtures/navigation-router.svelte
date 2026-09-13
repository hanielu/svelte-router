<script lang="ts">
  import { setContext } from "svelte";
  import { createMemoryRouter, MemoryRouter, RouterProvider, Routes } from "svelte-router";
  import RouteDefinitions from "./route-definitions.svelte";
  import type { NavigationFixtureOptions } from "./navigation-cases.js";
  import type { RouteObject } from "../../core/context.js";

  const { routes, initial, basename = "/", mode, options, captureRouter }: {
    routes: RouteObject[];
    initial: string;
    basename?: string;
    mode: "declarative" | "data";
    options: NavigationFixtureOptions;
    captureRouter?: (router: ReturnType<typeof createMemoryRouter>) => void;
  } = $props();
  // These fixtures intentionally own one static definition tree and engine per mount.
  // svelte-ignore state_referenced_locally
  setContext("navigation-fixture", options);
  // svelte-ignore state_referenced_locally
  const router = mode === "data"
    ? createMemoryRouter(routes, { initialEntries: [initial], basename })
    : undefined;
  // svelte-ignore state_referenced_locally
  if (router) captureRouter?.(router);
  $effect(() => () => router?.dispose());
</script>

{#if router}
  <RouterProvider {router} />
{:else}
  <MemoryRouter initialEntries={[initial]} {basename}>
    <Routes><RouteDefinitions {routes} /></Routes>
  </MemoryRouter>
{/if}
