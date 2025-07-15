<script lang="ts">
  import { useNavigate, useLocation } from "$lib/index.js";
  import { fly } from "svelte/transition";
  import Settings from "~icons/lucide/settings";
  import ArrowLeft from "~icons/lucide/arrow-left";
  import User from "~icons/lucide/user";
  import { Button } from "$ui/button/index.js";

  let navigate = useNavigate();
  let location = $derived(useLocation());

  let darkMode = $state(false);
  let notifications = $state(true);
  let autoSave = $state(true);
</script>

<div in:fly={{ y: 20, duration: 300 }} class="space-y-6">
  <div class="flex items-center gap-3">
    <Settings class="w-6 h-6 text-purple-500" />
    <h1 class="text-2xl font-bold">Settings</h1>
  </div>

  <div class="bg-muted/50 rounded-lg p-4 space-y-3">
    <p class="text-sm text-muted-foreground">Current location:</p>
    <code class="block bg-background rounded px-3 py-2 text-sm font-mono">
      {location.pathname}
    </code>
  </div>

  <div class="bg-card border border-border rounded-lg p-6 space-y-6">
    <h2 class="text-lg font-semibold">Preferences</h2>

    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-medium">Dark Mode</h3>
          <p class="text-sm text-muted-foreground">Switch to dark theme</p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" bind:checked={darkMode} class="sr-only peer" />
          <div
            class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
          ></div>
        </label>
      </div>

      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-medium">Notifications</h3>
          <p class="text-sm text-muted-foreground">Receive push notifications</p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" bind:checked={notifications} class="sr-only peer" />
          <div
            class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
          ></div>
        </label>
      </div>

      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-medium">Auto Save</h3>
          <p class="text-sm text-muted-foreground">Automatically save changes</p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" bind:checked={autoSave} class="sr-only peer" />
          <div
            class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
          ></div>
        </label>
      </div>
    </div>
  </div>

  <div class="flex gap-3">
    <Button onclick={() => navigate("/")} variant="outline" class="flex items-center gap-2">
      <ArrowLeft class="w-4 h-4" />
      Back to Home
    </Button>

    <Button onclick={() => navigate("/profile")} variant="outline" class="flex items-center gap-2">
      <User class="w-4 h-4" />
      Profile
    </Button>
  </div>

  <div class="text-xs text-muted-foreground">
    This page demonstrates declarative routing with interactive components.
  </div>
</div>
