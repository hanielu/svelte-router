<script lang="ts" module>
  import type { LoaderFunction } from "$lib/index.js";

  export const loader = async () => {
    // Simulate API call with real async behavior
    await new Promise(resolve => setTimeout(resolve, 300));

    // Simulate fetching dashboard stats
    return {
      message: "Welcome to data-driven routing!",
      timestamp: new Date().toISOString(),
      stats: {
        visitors: Math.floor(Math.random() * 2000) + 500,
        pages: Math.floor(Math.random() * 10) + 3,
        status: "active",
      },
    };
  };
</script>

<script lang="ts">
  import { useLoaderData, useNavigate, useLocation } from "$lib/index.js";
  import { fly } from "svelte/transition";
  import Home from "~icons/lucide/home";
  import ArrowRight from "~icons/lucide/arrow-right";
  import TrendingUp from "~icons/lucide/trending-up";
  import { Button } from "$ui/button/index.js";

  const data = $derived(useLoaderData<typeof loader>());
  const navigate = useNavigate();
  const location = $derived(useLocation());
</script>

<div in:fly={{ y: 20, duration: 300 }} class="space-y-6">
  <div class="flex items-center gap-3">
    <Home class="w-6 h-6 text-blue-500" />
    <h1 class="text-2xl font-bold">Data Home</h1>
  </div>

  <div class="bg-muted/50 rounded-lg p-4 space-y-3">
    <p class="text-sm text-muted-foreground">Current location:</p>
    <code class="block bg-background rounded px-3 py-2 text-sm font-mono">
      {location.pathname}
    </code>
  </div>

  <div class="bg-card border border-border rounded-lg p-6 space-y-4">
    <div class="flex items-center gap-2">
      <TrendingUp class="w-5 h-5 text-green-500" />
      <h2 class="text-lg font-semibold">Live Data</h2>
    </div>

    <div class="grid grid-cols-3 gap-4 text-sm">
      <div class="text-center p-3 bg-muted/50 rounded-lg">
        <div class="text-2xl font-bold text-blue-600">{data?.stats.visitors}</div>
        <div class="text-muted-foreground">Visitors</div>
      </div>
      <div class="text-center p-3 bg-muted/50 rounded-lg">
        <div class="text-2xl font-bold text-green-600">{data?.stats.pages}</div>
        <div class="text-muted-foreground">Pages</div>
      </div>
      <div class="text-center p-3 bg-muted/50 rounded-lg">
        <div class="text-2xl font-bold text-purple-600 capitalize">{data?.stats.status}</div>
        <div class="text-muted-foreground">Status</div>
      </div>
    </div>

    <div class="text-sm">
      <p class="mb-2">{data?.message}</p>
      <p class="text-muted-foreground">
        Last updated: {new Date(data?.timestamp).toLocaleTimeString()}
      </p>
    </div>
  </div>

  <div class="space-y-4">
    <p>This demonstrates data-driven routing where each route loads data before rendering.</p>

    <div class="flex gap-3">
      <Button onclick={() => navigate("/profile")} class="flex items-center gap-2">
        View Profile
        <ArrowRight class="w-4 h-4" />
      </Button>

      <Button variant="outline" onclick={() => navigate("/settings")}>Settings</Button>
    </div>
  </div>

  <div class="text-xs text-muted-foreground">
    This page demonstrates data loading with the loader function.
  </div>
</div>
