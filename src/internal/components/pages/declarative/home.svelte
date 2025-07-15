<script lang="ts">
  import { useNavigate, useLocation, Link } from "$lib/index.js";
  import { fly } from "svelte/transition";
  import Home from "~icons/lucide/home";
  import ArrowRight from "~icons/lucide/arrow-right";
  import { Button } from "$ui/button/index.js";

  let navigate = useNavigate();
  let location = $derived(useLocation());
</script>

<div in:fly={{ y: 20, duration: 300 }} class="space-y-6">
  <div class="flex items-center gap-3">
    <Home class="w-6 h-6 text-blue-500" />
    <h1 class="text-2xl font-bold">Home Page</h1>
  </div>

  <div class="bg-muted/50 rounded-lg p-4 space-y-3">
    <p class="text-sm text-muted-foreground">Current location:</p>
    <code class="block bg-background rounded px-3 py-2 text-sm font-mono">
      {location.pathname}
    </code>
  </div>

  <div class="space-y-4">
    <p>
      Welcome to the declarative routing demo! This demonstrates how routes are defined
      declaratively using Route components.
    </p>

    <div class="flex gap-3">
      <Link to="/profile">
        {#snippet child({ props })}
          <Button {...props} class="flex items-center gap-2">
            View Profile
            <ArrowRight class="w-4 h-4" />
          </Button>
        {/snippet}
      </Link>
      <!-- or -->
      <Button variant="outline" onclick={() => navigate("/settings")}>Settings</Button>
    </div>
  </div>

  <div class="text-xs text-muted-foreground">
    This page demonstrates declarative routing with navigation hooks.
  </div>
</div>
