<script lang="ts">
  import { Routes, Route, BrowserRouter, HashRouter, MemoryRouter } from "$lib/index.js";
  import { browser } from "$app/environment";
  import type { RouterType } from "$components/showcase.svelte";

  import Home from "./home.svelte";
  import Profile from "./profile.svelte";
  import Settings from "./settings.svelte";

  interface DeclarativeRouterProps {
    routerType: RouterType;
  }

  let { routerType }: DeclarativeRouterProps = $props();
</script>

{#if routerType === "browser" && browser}
  <BrowserRouter children={routes} />
{:else if routerType === "hash" && browser}
  <HashRouter children={routes} />
{:else}
  <MemoryRouter children={routes} />
{/if}

{#snippet routes()}
  <Routes>
    <Route path="/" Component={Home} />
    <Route path="/profile" Component={Profile} />
    <Route path="/settings" Component={Settings} />
    <Route path="*">
      {#snippet element()}
        <div class="text-center py-8">
          <h2 class="text-xl font-bold mb-2">404 - Page Not Found</h2>
          <p class="text-muted-foreground">The page you're looking for doesn't exist.</p>
        </div>
      {/snippet}
    </Route>
  </Routes>
{/snippet}
