<script lang="ts">
  import { createBrowserRouter, RouterProvider } from "$lib/index.js";
  import { browser } from "$app/environment";
  import Root from "./pages/root.svelte";
  import Show, { loader } from "./pages/show.svelte";
  import Home from "./pages/home.svelte";
</script>

{#if browser}
  <RouterProvider
    router={createBrowserRouter([
      {
        path: "/",
        Component: Root,
        children: [
          {
            index: true,
            Component: Home,
          },
          {
            path: "/show/:id",
            Component: Show,
            loader: loader,
            // lazy: {
            //   Component: async () => (await import("./pages/show.svelte")).default,
            // },
          },
          {
            path: "*",
            element: fallback,
          },
        ],
      },
    ])}
  />
{/if}

{#snippet fallback()}
  <p>404 bruh</p>
{/snippet}

<p>This is the app</p>
