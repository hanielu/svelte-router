<script lang="ts">
  import { setContext } from "svelte";
  import {
    createMemoryRouter,
    MemoryRouter,
    RouterProvider,
    Routes,
    type RouteObject,
    type LinkProps,
  } from "svelte-router";
  import RouteDefinitions from "./route-definitions.svelte";
  const {
    routes,
    initial,
    basename = "/",
    mode,
    options,
  }: {
    routes: RouteObject[];
    initial: string;
    basename?: string;
    mode: "declarative" | "data";
    options: {
      link: LinkProps;
      custom?: boolean;
      capture?: (value: any) => void;
    };
  } = $props();
  // One static tree and engine per fixture; updated Link props belong to LinkPage.
  // svelte-ignore state_referenced_locally
  setContext("link-fixture", options);
  // svelte-ignore state_referenced_locally
  const router =
    mode === "data"
      ? createMemoryRouter(routes, { initialEntries: [initial], basename })
      : undefined;
  $effect(() => () => router?.dispose());
</script>

{#if router}<RouterProvider {router} />
{:else}<MemoryRouter initialEntries={[initial]} {basename}
    ><Routes><RouteDefinitions {routes} /></Routes></MemoryRouter
  >{/if}
