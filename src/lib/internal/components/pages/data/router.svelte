<script lang="ts">
  import {
    createBrowserRouter,
    createHashRouter,
    createMemoryRouter,
    RouterProvider,
  } from "$lib/index.js";
  import { browser } from "$app/environment";
  import type { RouterType } from "$components/showcase.svelte";

  import Home, { loader as homeLoader } from "./home.svelte";
  import Profile, { loader as profileLoader } from "./profile.svelte";
  import Settings, { loader as settingsLoader } from "./settings.svelte";

  interface DataRouterProps {
    routerType: RouterType;
  }

  let { routerType }: DataRouterProps = $props();

  // Simple 404 component
  import NotFoundComponent from "./not-found.svelte";

  // Define routes configuration for data router
  const routeConfig = [
    {
      path: "/",
      Component: Home,
      loader: homeLoader,
    },
    {
      path: "/profile",
      Component: Profile,
      loader: profileLoader,
    },
    {
      path: "/settings",
      Component: Settings,
      loader: settingsLoader,
    },
    {
      path: "*",
      Component: NotFoundComponent,
    },
  ];

  // Create the router instance based on type
  let router = $state<ReturnType<typeof createBrowserRouter> | null>(null);

  $effect(() => {
    let createRouterFn;
    switch (routerType) {
      case "hash":
        createRouterFn = createHashRouter;
        break;
      case "memory":
        createRouterFn = createMemoryRouter;
        break;
      default:
        createRouterFn = createBrowserRouter;
        break;
    }

    router = createRouterFn(routeConfig);
  });
</script>

{#if router}
  <RouterProvider {router} />
{:else}
  <div class="text-center py-8">
    <p class="text-muted-foreground">Router loading...</p>
  </div>
{/if}
